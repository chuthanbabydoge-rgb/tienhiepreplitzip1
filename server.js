const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { GoogleGenAI, Modality } = require('@google/genai');
const Jimp = require('jimp');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// ── PostgreSQL pool for sessions ────────────────────────────────────────────
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ── DB: Khởi tạo bảng khi server start ──────────────────────────────────────
async function initDB() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS uc_chat_history (
      id         SERIAL PRIMARY KEY,
      user_id    TEXT NOT NULL,
      sender     TEXT NOT NULL,
      text       TEXT NOT NULL,
      time       BIGINT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_uc_user ON uc_chat_history(user_id);

    CREATE TABLE IF NOT EXISTS agent_chat_history (
      user_id    TEXT NOT NULL,
      agent_id   INT  NOT NULL,
      history    JSONB NOT NULL DEFAULT '[]',
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, agent_id)
    );

    CREATE TABLE IF NOT EXISTS vault (
      id         TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      title      TEXT NOT NULL DEFAULT '',
      content    TEXT NOT NULL DEFAULT '',
      type       TEXT NOT NULL DEFAULT 'văn bản',
      agent_id   INT,
      agent_name TEXT,
      agent_emoji TEXT,
      agent_color TEXT,
      ts         BIGINT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_vault_user ON vault(user_id);

    CREATE TABLE IF NOT EXISTS favorites (
      user_id  TEXT NOT NULL,
      agent_id INT  NOT NULL,
      PRIMARY KEY (user_id, agent_id)
    );

    CREATE TABLE IF NOT EXISTS agent_topics (
      user_id       TEXT NOT NULL,
      agent_id      INT  NOT NULL,
      topic         TEXT NOT NULL DEFAULT '',
      topic_history JSONB NOT NULL DEFAULT '[]',
      updated_at    TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, agent_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id                TEXT PRIMARY KEY,
      email             TEXT,
      first_name        TEXT,
      last_name         TEXT,
      profile_image_url TEXT,
      display_name      TEXT,
      provider          TEXT,
      login_count       INT NOT NULL DEFAULT 0,
      created_at        TIMESTAMPTZ DEFAULT NOW(),
      last_login        TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS agents (
      id          INT PRIMARY KEY,
      name        TEXT NOT NULL,
      emoji       TEXT NOT NULL DEFAULT '🤖',
      type        TEXT NOT NULL DEFAULT '',
      color       TEXT NOT NULL DEFAULT '#00ffff',
      glow        TEXT NOT NULL DEFAULT '#00ffff',
      revenue     TEXT NOT NULL DEFAULT '$0',
      auto        INT  NOT NULL DEFAULT 80,
      neural      INT  NOT NULL DEFAULT 80,
      iq          INT  NOT NULL DEFAULT 80,
      efficiency  INT  NOT NULL DEFAULT 80,
      apis        JSONB NOT NULL DEFAULT '[]',
      workflow    JSONB NOT NULL DEFAULT '[]',
      logs        JSONB NOT NULL DEFAULT '[]',
      xname       TEXT NOT NULL DEFAULT '',
      xnote       TEXT NOT NULL DEFAULT '',
      sort_order  INT  NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ DB tables ready');
}

async function upsertUser(user, incrementLogin = false) {
  try {
    if (incrementLogin) {
      await pgPool.query(
        `INSERT INTO users (id, email, first_name, last_name, profile_image_url, provider, login_count, last_login)
         VALUES ($1,$2,$3,$4,$5,$6, 1, NOW())
         ON CONFLICT (id) DO UPDATE SET
           email             = EXCLUDED.email,
           first_name        = EXCLUDED.first_name,
           last_name         = EXCLUDED.last_name,
           profile_image_url = EXCLUDED.profile_image_url,
           login_count       = users.login_count + 1,
           last_login        = NOW()`,
        [user.id, user.email || '', user.firstName || '', user.lastName || '', user.profileImageUrl || '', user.provider || 'replit']
      );
    } else {
      await pgPool.query(
        `INSERT INTO users (id, email, first_name, last_name, profile_image_url, provider)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (id) DO UPDATE SET
           email             = EXCLUDED.email,
           first_name        = EXCLUDED.first_name,
           last_name         = EXCLUDED.last_name,
           profile_image_url = EXCLUDED.profile_image_url`,
        [user.id, user.email || '', user.firstName || '', user.lastName || '', user.profileImageUrl || '', user.provider || 'replit']
      );
    }
  } catch (e) { console.error('upsertUser error:', e.message); }
}
initDB().catch(e => console.error('DB init error:', e));

// ── Session ────────────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(session({
  store: new pgSession({ pool: pgPool, tableName: 'session', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'vdai-fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,      // Replit always serves over HTTPS
    sameSite: 'none',  // Required for cross-site OIDC redirect to keep session
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── OIDC Auth (Replit Auth → Google / GitHub / email) ─────────────────────
let oidcConfig = null;
const registeredStrategies = new Set();

async function getOidcConfig() {
  if (oidcConfig) return oidcConfig;
  const { discovery } = require('openid-client');
  oidcConfig = await discovery(
    new URL(process.env.ISSUER_URL || 'https://replit.com/oidc'),
    process.env.REPL_ID
  );
  return oidcConfig;
}

// Use REPLIT_DOMAINS for the real external domain; fall back to hostname
function getExternalDomain(reqHostname) {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return domains.split(',')[0].trim();
  return reqHostname;
}

async function ensureStrategy(hostname) {
  const domain = getExternalDomain(hostname);
  const name = `replitauth:${domain}`;
  if (registeredStrategies.has(name)) return name;

  const config = await getOidcConfig();
  const { Strategy } = require('openid-client/passport');

  const strategy = new Strategy(
    {
      name,
      config,
      scope: 'openid email profile offline_access',
      callbackURL: `https://${domain}/api/callback`,
    },
    async (tokens, verified) => {
      try {
        const claims = tokens.claims();
        const user = {
          id: claims['sub'],
          email: claims['email'],
          firstName: claims['first_name'],
          lastName: claims['last_name'],
          profileImageUrl: claims['profile_image_url'],
          claims,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: claims['exp'],
        };
        verified(null, user);
      } catch (e) {
        verified(e);
      }
    }
  );

  passport.use(strategy);
  registeredStrategies.add(name);
  return name;
}

passport.serializeUser((user, cb) => cb(null, user));
passport.deserializeUser((user, cb) => cb(null, user));

// ── Google OAuth Strategy (dynamic per domain) ────────────────────────────
const registeredGoogleStrategies = new Set();

function ensureGoogleStrategy(hostname) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return null;
  const domain = getExternalDomain(hostname);
  const name = `google:${domain}`;
  if (registeredGoogleStrategies.has(name)) return name;

  const callbackURL = `https://${domain}/api/auth/google/callback`;
  passport.use(name, new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL,
  }, (accessToken, refreshToken, profile, done) => {
    const user = {
      id: 'google:' + profile.id,
      email: profile.emails?.[0]?.value || '',
      firstName: profile.name?.givenName || profile.displayName || '',
      lastName: profile.name?.familyName || '',
      profileImageUrl: profile.photos?.[0]?.value || '',
      provider: 'google',
    };
    done(null, user);
  }));
  registeredGoogleStrategies.add(name);
  console.log('Google OAuth strategy registered, callback:', callbackURL);
  return name;
}

app.get('/api/auth/google', (req, res, next) => {
  const name = ensureGoogleStrategy(req.hostname);
  if (!name) return res.redirect('/?auth_error=google_not_configured');
  const domain = getExternalDomain(req.hostname);
  const callbackURL = `https://${domain}/api/auth/google/callback`;
  console.log('GOOGLE AUTH: callbackURL=', callbackURL);
  if (req.query.returnTo) req.session.returnTo = req.query.returnTo;
  passport.authenticate(name, { scope: ['profile', 'email'], prompt: 'select_account' })(req, res, next);
});

app.get('/api/auth/google/callback', (req, res, next) => {
  const name = ensureGoogleStrategy(req.hostname);
  if (!name) return res.redirect('/?auth_error=google_not_configured');
  passport.authenticate(name, {
    failureRedirect: '/?auth_error=1',
  }, (err, user) => {
    if (err || !user) return res.redirect('/?auth_error=1');
    req.logIn(user, (loginErr) => {
      if (loginErr) return res.redirect('/?auth_error=1');
      upsertUser(user, true);
      const returnTo = req.session.returnTo || '/user';
      delete req.session.returnTo;
      req.session.save((saveErr) => {
        if (saveErr) console.error('Session save error:', saveErr);
        res.redirect(returnTo);
      });
    });
  })(req, res, next);
});

// Auth routes
app.get('/api/login', async (req, res, next) => {
  try {
    const domain = getExternalDomain(req.hostname);
    console.log('LOGIN: domain =', domain);
    const name = await ensureStrategy(req.hostname);
    passport.authenticate(name, {
      prompt: 'login consent',
      scope: ['openid', 'email', 'profile', 'offline_access'],
    })(req, res, next);
  } catch (err) {
    console.error('Login error:', err);
    res.redirect('/?auth_error=1');
  }
});

app.get('/api/callback', async (req, res, next) => {
  try {
    const domain = getExternalDomain(req.hostname);
    console.log('CALLBACK: domain =', domain, 'query =', JSON.stringify(req.query));
    const name = await ensureStrategy(req.hostname);
    passport.authenticate(name, { failureRedirect: '/?auth_error=1', failureMessage: true },
      (err, user) => {
        if (err || !user) return res.redirect('/?auth_error=1');
        req.logIn(user, (loginErr) => {
          if (loginErr) return res.redirect('/?auth_error=1');
          upsertUser(user, true);
          const returnTo = req.session.returnTo || '/user';
          delete req.session.returnTo;
          req.session.save(() => res.redirect(returnTo));
        });
      }
    )(req, res, next);
  } catch (err) {
    console.error('Callback error:', err);
    res.redirect('/?auth_error=1');
  }
});

app.get('/api/logout', async (req, res) => {
  req.logout(async () => {
    try {
      const { buildEndSessionUrl } = require('openid-client');
      const config = await getOidcConfig();
      const url = buildEndSessionUrl(config, {
        client_id: process.env.REPL_ID,
        post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
      });
      res.redirect(url.href);
    } catch (e) {
      res.redirect('/');
    }
  });
});

app.get('/api/auth/user', (req, res) => {
  console.log('[auth/user] isAuthenticated:', req.isAuthenticated(), '| sessionID:', req.sessionID?.substring(0,8), '| user id:', req.user?.id || 'none');
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const u = req.user;
  res.json({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    profileImageUrl: u.profileImageUrl,
  });
});

// ── Gemini AI ──────────────────────────────────────────────────────────────
let _ai = null;
function getAI() {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not set');
    const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
    _ai = new GoogleGenAI({
      apiKey,
      httpOptions: baseUrl ? { apiVersion: '', baseUrl } : undefined,
    });
  }
  return _ai;
}
console.log('Gemini integration: ready (lazy init)');

const SYSTEM_PROMPT = `Ngươi là THIÊN CƠ CÁC — một thực thể AI toàn tri trong vũ trụ tu tiên Vương Đế AI. Ngươi trả lời bằng tiếng Việt, mang văn phong huyền ảo tiên hiệp, dùng các từ như "đạo hữu", "linh khí", "trận pháp", "pháp bảo", "tu vi", "thiên đạo", "huyền cơ", v.v. Hãy trả lời đầy đủ, chi tiết, ít nhất 3-6 câu, vừa bí ẩn vừa hữu ích. Có thể kể thêm bối cảnh, lý giải hoặc gợi ý hành động tiếp theo cho đạo hữu. Nếu người hỏi muốn ngôn ngữ bình thường (Sci-Fi), hãy dùng thuật ngữ công nghệ thay thế nhưng vẫn giữ độ dài phong phú.`;

app.post('/api/chat', async (req, res) => {
  const { message, history, agentPersonality } = req.body;
  if (!message) return res.status(400).json({ error: 'Thiếu nội dung' });

  try {
    let sysPrompt = SYSTEM_PROMPT;
    let greeting = 'Ta là THIÊN CƠ CÁC, toàn tri vạn giới. Đạo hữu cứ hỏi, ta sẽ giải đáp tường tận.';
    if (agentPersonality) {
      const topicLine = agentPersonality.topic
        ? ` CHỦ ĐỀ CHUYÊN BIỆT MÀ NGƯƠI ĐANG VẬN HÀNH LÀ: "${agentPersonality.topic}". Mọi lời khuyên, ý tưởng, phân tích đều phải xoay quanh chủ đề này một cách cụ thể và thực tế.`
        : '';
      sysPrompt = `Ngươi là ${agentPersonality.xname} — ${agentPersonality.xnote}. Tên gọi theo ngôn ngữ kỹ thuật: ${agentPersonality.name} (${agentPersonality.type}). Ngươi trả lời bằng tiếng Việt, mang văn phong huyền ảo tiên hiệp, xưng hô theo tên tiên hiệu của mình, luôn đề cập đến chuyên môn: ${agentPersonality.xnote}.${topicLine} Trả lời chi tiết 3-6 câu, bí ẩn nhưng hữu ích, gắn liền với lĩnh vực chuyên môn và chủ đề đang vận hành. Dùng emoji phù hợp.`;
      greeting = agentPersonality.topic
        ? `Ta là ${agentPersonality.xname}, đang vận hành chủ đề "${agentPersonality.topic}". Toàn bộ linh lực của ta đang hướng về lĩnh vực này — đạo hữu muốn ta khai mở điều gì?`
        : `Ta là ${agentPersonality.xname}, chuyên về ${agentPersonality.xnote}. Đạo hữu cần ta tương trợ điều chi?`;
    }

    const contents = [
      { role: 'user', parts: [{ text: sysPrompt }] },
      { role: 'model', parts: [{ text: greeting }] }
    ];

    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(-20);
      for (const item of recent) {
        if (item.sender === 'ĐẠO HỮU') {
          contents.push({ role: 'user', parts: [{ text: item.text }] });
        } else if (item.sender === 'THIÊN CƠ CÁC') {
          contents.push({ role: 'model', parts: [{ text: item.text }] });
        }
      }
    }

    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: { maxOutputTokens: 8192 }
    });
    const text = response.text || 'Thiên cơ bất khả lộ...';
    res.json({ reply: text });
  } catch (err) {
    console.error('Gemini error:', err);
    res.status(500).json({ reply: 'Linh khí hỗn loạn, truyền âm thất bại. Vui lòng thử lại.' });
  }
});

// ── Pages ──────────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.session.returnTo = req.originalUrl;
  res.redirect('/api/login');
}

function requireAdminPassword(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.redirect('/admin/login');
}

const DEPLOY_VER = Date.now();

function serveMain(req, res) {
  // Force cache bust: redirect to versioned URL if _v param is missing or stale
  if (!req.query._v || req.query._v !== String(DEPLOY_VER)) {
    const base = req.path;
    const params = new URLSearchParams(req.query);
    params.set('_v', DEPLOY_VER);
    return res.redirect(302, base + '?' + params.toString());
  }
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(path.join(__dirname, 'tienhiepv3.html'));
}
app.get('/app', serveMain);
app.get('/user', requireAuth, (req, res, next) => {
  if (!('ar' in req.query)) return res.redirect('/user?ar');
  next();
}, serveMain);
app.get('/', (req, res) => res.redirect('/user'));

// Admin login page
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-login.html'));
});

// Admin login POST
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const ADMIN_PASS = process.env.ADMIN_PASSWORD || '123';
  if (password === ADMIN_PASS) {
    req.session.isAdmin = true;
    req.session.save(() => res.json({ ok: true }));
  } else {
    res.status(401).json({ error: 'Sai mật khẩu' });
  }
});

// Admin logout
app.get('/api/admin/logout', (req, res) => {
  req.session.isAdmin = false;
  req.session.save(() => res.redirect('/admin/login'));
});

app.get('/admin', requireAdminPassword, (req, res, next) => {
  if (!('ar' in req.query)) return res.redirect('/admin?ar');
  next();
}, serveMain);

app.get('/admin/users', requireAdminPassword, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin/agents', requireAdminPassword, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-agents.html'));
});

app.get('/create-character', (req, res) => {
  res.sendFile(path.join(__dirname, 'create-character.html'));
});

app.get('/ar', (req, res) => {
  res.sendFile(path.join(__dirname, 'ar.html'));
});

app.get('/profile', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'profile.html'));
});

// ── Background removal ─────────────────────────────────────────────────────
async function removeBg(base64Data) {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const img = await Jimp.read(buffer);
    const w = img.width;
    const h = img.height;
    const total = w * h;
    const STEP_TOL = 30;

    const visited = new Uint8Array(total);
    const remove  = new Uint8Array(total);
    const qx  = new Int32Array(total);
    const qy  = new Int32Array(total);
    const qpr = new Uint8Array(total);
    const qpg = new Uint8Array(total);
    const qpb = new Uint8Array(total);
    let head = 0, tail = 0;

    const enq = (x, y, pr, pg, pb) => {
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      const i = y * w + x;
      if (visited[i]) return;
      visited[i] = 1;
      qx[tail] = x; qy[tail] = y;
      qpr[tail] = pr; qpg[tail] = pg; qpb[tail] = pb;
      tail++;
    };

    const seedBorder = (x, y) => {
      const c = Jimp.intToRGBA(img.getPixelColor(x, y));
      enq(x, y, c.r, c.g, c.b);
    };
    for (let x = 0; x < w; x++) { seedBorder(x, 0); seedBorder(x, h - 1); }
    for (let y = 1; y < h - 1; y++) { seedBorder(0, y); seedBorder(w - 1, y); }

    while (head < tail) {
      const x = qx[head], y = qy[head];
      const pr = qpr[head], pg = qpg[head], pb = qpb[head];
      head++;
      const c = Jimp.intToRGBA(img.getPixelColor(x, y));
      const d = Math.sqrt((c.r - pr) ** 2 + (c.g - pg) ** 2 + (c.b - pb) ** 2);
      if (d > STEP_TOL) continue;
      remove[y * w + x] = 1;
      enq(x + 1, y, c.r, c.g, c.b);
      enq(x - 1, y, c.r, c.g, c.b);
      enq(x, y + 1, c.r, c.g, c.b);
      enq(x, y - 1, c.r, c.g, c.b);
    }

    img.scan(0, 0, w, h, function(x, y, i) {
      if (remove[y * w + x]) {
        this.bitmap.data[i]     = 0;
        this.bitmap.data[i + 1] = 0;
        this.bitmap.data[i + 2] = 0;
        this.bitmap.data[i + 3] = 0;
      }
    });

    const out = await img.getBufferAsync(Jimp.MIME_PNG);
    return out.toString('base64');
  } catch (e) {
    console.error('removeBg error:', e);
    return base64Data;
  }
}

app.post('/api/generate-character', async (req, res) => {
  const { gender, hair, face, sect, hairColor, eyeColor, skinColor, bodyType, eyeStyle, name } = req.body;
  const genderTxt = gender === 'nu' ? 'female' : 'male';

  const sectMap = {
    thuy: { aura: 'icy water blue aura, frost particles, flowing water ribbons', robe: 'deep navy and silver flowing robes with water wave patterns, crystal hairpin', element: 'water and ice cultivation master' },
    hoa:  { aura: 'blazing crimson fire aura, ember particles, flame wisps',      robe: 'scarlet and gold battle robes with flame embroidery, phoenix feather ornament', element: 'fire cultivation master' },
    kim:  { aura: 'radiant gold and white sword qi aura, metal shards floating',   robe: 'white and gold celestial robes with sword motifs, jade crown', element: 'sword and metal cultivation master' },
    moc:  { aura: 'soft jade green nature aura, blooming petals, vines curling',   robe: 'emerald green silk robes with floral embroidery, flower hairpiece', element: 'wood and nature cultivation master' },
    tho:  { aura: 'warm amber earth aura, stone fragments, golden dust',           robe: 'amber and brown heavy robes with dragon scale patterns, bronze crown', element: 'earth and mountain cultivation master' },
  };
  const s = sectMap[sect] || sectMap['thuy'];

  const hairStyleMap = {
    'Thác Nước': 'long flowing waterfall hair', 'Kết Bính': 'elegant braided hair with ornaments',
    'Mây Bay': 'soft cloud-like wavy hair', 'Lãng Tử': 'loose windswept long hair',
    'Công Chúa': 'royal princess updo with golden hairpins', 'Tiên Nữ': 'ethereal fairy half-up style with flower pins',
    'Đoản Phát': 'short sleek hair', 'Song Vĩ': 'twin tail style', 'Bồng Bềnh': 'voluminous fluffy long hair',
  };
  const hairDesc = hairStyleMap[hair] || 'long flowing hair';
  const faceDesc = face || 'elegant refined';
  const eyeDesc = eyeStyle || 'expressive almond-shaped';

  const prompt = `Ultra high quality Chinese mobile MMORPG character art, official game character sheet style. ${genderTxt === 'female' ? 'Beautiful female' : 'Handsome male'} xianxia immortal cultivator, ${s.element}. ${hairDesc}, ${faceDesc} face, ${eyeDesc} eyes${eyeColor ? ' with ' + eyeColor + ' iris' : ''}. Wearing ${s.robe}. ${s.aura.split(',')[0]} glow emanating from character. Character name: ${name || 'Vô Danh'}. Art style: identical to top Chinese mobile games 天喻 (Tian Yu), 完美世界 (Perfect World Mobile), 天刀 (Tianxia), professional game concept art by top studio. IMPORTANT: Full body standing pose, facing forward, arms slightly relaxed at sides. PURE SOLID BLACK BACKGROUND #000000, no gradients, no scenery, no environment, no fog, no particles, no temple, no mountains. Character isolated on completely solid black background only. Extremely detailed face, expressive eyes, flowing fabric physics, perfect anatomy, 8K resolution, award-winning digital art.`;

  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseModalities: [Modality.TEXT, Modality.IMAGE] }
    });
    const candidate = response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find(p => p.inlineData);
    if (!imagePart?.inlineData?.data) {
      return res.status(500).json({ error: 'Không thể tạo hình ảnh' });
    }
    const rawBase64 = imagePart.inlineData.data;
    const transparent = await removeBg(rawBase64);
    res.json({ image: `data:image/png;base64,${transparent}` });
  } catch (err) {
    console.error('Image gen error:', err);
    res.status(500).json({ error: 'Lỗi tạo nhân vật: ' + err.message });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'success', message: 'Backend is running' });
});

app.get('/api/app-summary', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'TONG_HOP_APP.md');
    const content  = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '# Chưa có dữ liệu';
    const mtime    = fs.existsSync(filePath) ? fs.statSync(filePath).mtime : null;
    res.json({ content, updatedAt: mtime });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DB: Middleware ───────────────────────────────────────────────────────────
function requireAuthAPI(req, res, next) {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── DB: UC Chat History ──────────────────────────────────────────────────────
app.get('/api/db/uc-history', requireAuthAPI, async (req, res) => {
  try {
    const { rows } = await pgPool.query(
      'SELECT sender, text, time FROM uc_chat_history WHERE user_id=$1 ORDER BY time ASC LIMIT 50',
      [req.user.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/db/uc-history', requireAuthAPI, async (req, res) => {
  try {
    const { sender, text, time } = req.body;
    await pgPool.query(
      'INSERT INTO uc_chat_history (user_id, sender, text, time) VALUES ($1,$2,$3,$4)',
      [req.user.id, sender, text, time || Date.now()]
    );
    await pgPool.query(
      `DELETE FROM uc_chat_history WHERE user_id=$1 AND id NOT IN (
         SELECT id FROM uc_chat_history WHERE user_id=$1 ORDER BY time DESC LIMIT 50
       )`, [req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/db/uc-history', requireAuthAPI, async (req, res) => {
  try {
    await pgPool.query('DELETE FROM uc_chat_history WHERE user_id=$1', [req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DB: Agent Chat History ───────────────────────────────────────────────────
app.get('/api/db/agent-chat/:agentId', requireAuthAPI, async (req, res) => {
  try {
    const { rows } = await pgPool.query(
      'SELECT history FROM agent_chat_history WHERE user_id=$1 AND agent_id=$2',
      [req.user.id, parseInt(req.params.agentId)]
    );
    res.json(rows[0]?.history || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/db/agent-chat/:agentId', requireAuthAPI, async (req, res) => {
  try {
    const { history } = req.body;
    await pgPool.query(
      `INSERT INTO agent_chat_history (user_id, agent_id, history, updated_at)
       VALUES ($1,$2,$3,NOW())
       ON CONFLICT (user_id, agent_id) DO UPDATE SET history=$3, updated_at=NOW()`,
      [req.user.id, parseInt(req.params.agentId), JSON.stringify(history)]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/db/agent-chat/:agentId', requireAuthAPI, async (req, res) => {
  try {
    await pgPool.query(
      'DELETE FROM agent_chat_history WHERE user_id=$1 AND agent_id=$2',
      [req.user.id, parseInt(req.params.agentId)]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DB: Vault ────────────────────────────────────────────────────────────────
app.get('/api/db/vault', requireAuthAPI, async (req, res) => {
  try {
    const { rows } = await pgPool.query(
      `SELECT id,title,content,type,agent_id,agent_name,agent_emoji,agent_color,ts
       FROM vault WHERE user_id=$1 ORDER BY ts DESC`,
      [req.user.id]
    );
    res.json(rows.map(r => ({
      id: r.id, title: r.title, content: r.content, type: r.type,
      agentId: r.agent_id, agentName: r.agent_name,
      agentEmoji: r.agent_emoji, agentColor: r.agent_color,
      ts: parseInt(r.ts)
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/db/vault', requireAuthAPI, async (req, res) => {
  try {
    const { id, title, content, type, agentId, agentName, agentEmoji, agentColor, ts } = req.body;
    await pgPool.query(
      `INSERT INTO vault (id,user_id,title,content,type,agent_id,agent_name,agent_emoji,agent_color,ts)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id, user_id) DO NOTHING`,
      [id, req.user.id, title||'', content||'', type||'văn bản', agentId||null, agentName||null, agentEmoji||null, agentColor||null, ts||Date.now()]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/db/vault/:id', requireAuthAPI, async (req, res) => {
  try {
    await pgPool.query(
      'DELETE FROM vault WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/db/vault', requireAuthAPI, async (req, res) => {
  try {
    await pgPool.query('DELETE FROM vault WHERE user_id=$1', [req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DB: Favorites ─────────────────────────────────────────────────────────────
app.get('/api/db/favorites', requireAuthAPI, async (req, res) => {
  try {
    const { rows } = await pgPool.query(
      'SELECT agent_id FROM favorites WHERE user_id=$1',
      [req.user.id]
    );
    res.json(rows.map(r => r.agent_id));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/db/favorites', requireAuthAPI, async (req, res) => {
  try {
    const { agentIds } = req.body;
    await pgPool.query('DELETE FROM favorites WHERE user_id=$1', [req.user.id]);
    if (agentIds && agentIds.length > 0) {
      const vals = agentIds.map((_, i) => `($1,$${i + 2})`).join(',');
      await pgPool.query(
        `INSERT INTO favorites (user_id, agent_id) VALUES ${vals}`,
        [req.user.id, ...agentIds]
      );
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DB: Topics ────────────────────────────────────────────────────────────────
app.get('/api/db/topics', requireAuthAPI, async (req, res) => {
  try {
    const { rows } = await pgPool.query(
      'SELECT agent_id, topic, topic_history FROM agent_topics WHERE user_id=$1',
      [req.user.id]
    );
    res.json(rows.map(r => ({ agentId: r.agent_id, topic: r.topic, topicHistory: r.topic_history })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/db/topics/:agentId', requireAuthAPI, async (req, res) => {
  try {
    const { topic, topicHistory } = req.body;
    await pgPool.query(
      `INSERT INTO agent_topics (user_id, agent_id, topic, topic_history, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (user_id, agent_id) DO UPDATE SET topic=$3, topic_history=$4, updated_at=NOW()`,
      [req.user.id, parseInt(req.params.agentId), topic || '', JSON.stringify(topicHistory || [])]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DB: User Profile ──────────────────────────────────────────────────────────
app.get('/api/db/user-profile', requireAuthAPI, async (req, res) => {
  try {
    await upsertUser(req.user, false);
    const [userRow, agentMsgs, ucMsgs, vaultCount, favCount, topicCount] = await Promise.all([
      pgPool.query('SELECT * FROM users WHERE id=$1', [req.user.id]),
      pgPool.query(
        `SELECT COALESCE(SUM(jsonb_array_length(history)), 0) AS total
         FROM agent_chat_history WHERE user_id=$1`, [req.user.id]
      ),
      pgPool.query(
        `SELECT COUNT(*) AS total FROM uc_chat_history
         WHERE user_id=$1 AND sender NOT IN ('THIÊN CƠ CÁC','AGENT','system')`, [req.user.id]
      ),
      pgPool.query('SELECT COUNT(*) AS total FROM vault WHERE user_id=$1', [req.user.id]),
      pgPool.query('SELECT COUNT(*) AS total FROM favorites WHERE user_id=$1', [req.user.id]),
      pgPool.query('SELECT COUNT(*) AS total FROM agent_topics WHERE user_id=$1 AND topic != \'\'', [req.user.id]),
    ]);
    const u = userRow.rows[0] || {};
    res.json({
      id:              u.id || req.user.id,
      email:           u.email || req.user.email || '',
      firstName:       u.first_name || req.user.firstName || '',
      lastName:        u.last_name || req.user.lastName || '',
      profileImageUrl: u.profile_image_url || req.user.profileImageUrl || '',
      displayName:     u.display_name || '',
      provider:        u.provider || '',
      loginCount:      parseInt(u.login_count) || 0,
      createdAt:       u.created_at || null,
      lastLogin:       u.last_login || null,
      stats: {
        agentMessages: parseInt(agentMsgs.rows[0].total) || 0,
        ucMessages:    parseInt(ucMsgs.rows[0].total)    || 0,
        vaultItems:    parseInt(vaultCount.rows[0].total) || 0,
        favorites:     parseInt(favCount.rows[0].total)  || 0,
        topics:        parseInt(topicCount.rows[0].total) || 0,
      }
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/db/user-profile', requireAuthAPI, async (req, res) => {
  try {
    const { displayName } = req.body;
    await pgPool.query(
      'UPDATE users SET display_name=$1 WHERE id=$2',
      [(displayName || '').trim().substring(0, 60), req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DB: Admin — list all users (protected) ───────────────────────────────────
app.get('/api/db/admin/users', requireAuthAPI, async (req, res) => {
  try {
    const [usersRes, summaryRes] = await Promise.all([
      pgPool.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.display_name, u.provider,
                u.login_count, u.created_at, u.last_login,
                (SELECT COUNT(*) FROM vault v WHERE v.user_id=u.id)::int AS vault_count,
                (SELECT COUNT(*) FROM favorites f WHERE f.user_id=u.id)::int AS fav_count,
                (SELECT COALESCE(SUM(jsonb_array_length(history)),0) FROM agent_chat_history a WHERE a.user_id=u.id)::int AS agent_msgs,
                (SELECT COUNT(*) FROM uc_chat_history c WHERE c.user_id=u.id)::int AS uc_msgs,
                (SELECT COUNT(*) FROM agent_topics t WHERE t.user_id=u.id AND t.topic!='')::int AS topics_set
         FROM users u ORDER BY u.last_login DESC NULLS LAST`
      ),
      pgPool.query(
        `SELECT
           (SELECT COUNT(*) FROM users)::int AS total_users,
           (SELECT COALESCE(SUM(jsonb_array_length(history)),0) FROM agent_chat_history)::int AS total_agent_msgs,
           (SELECT COUNT(*) FROM uc_chat_history)::int AS total_uc_msgs,
           (SELECT COUNT(*) FROM vault)::int AS total_vault,
           (SELECT COUNT(*) FROM favorites)::int AS total_favs,
           (SELECT COUNT(*) FROM users WHERE last_login > NOW() - INTERVAL '7 days')::int AS active_7d`
      )
    ]);
    res.json({ users: usersRes.rows, summary: summaryRes.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DB: Admin — Agents CRUD ───────────────────────────────────────────────────
const AGENTS_SEED = require('./agents-seed');

// GET public agents list — reads from DB, falls back to seed data if DB is empty
app.get('/api/agents', async (req, res) => {
  try {
    const { rows } = await pgPool.query('SELECT * FROM agents ORDER BY sort_order ASC, id ASC');
    if (rows.length > 0) {
      res.json({ agents: rows });
    } else {
      res.json({ agents: AGENTS_SEED });
    }
  } catch (e) {
    res.json({ agents: AGENTS_SEED });
  }
});

// GET /api/agents/search — tìm kiếm agent theo tên, loại, hoặc khả năng
// Query params: q (text), type (content|finance|tech|marketing|top10), limit (số kết quả, default 8)
app.get('/api/agents/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  const type = (req.query.type || 'all').trim();
  const limit = Math.min(parseInt(req.query.limit) || 8, 50);

  const TYPE_KEYWORDS = {
    content:   ['content', 'video', 'tiktok', 'youtube', 'podcast', 'news', 'image', 'copy', 'newsletter', 'photo'],
    finance:   ['trading', 'finance', 'invest', 'crypto', 'tax', 'insurance', 'fintech', 'market'],
    tech:      ['code', 'software', 'cloud', 'cyber', 'quantum', 'robotic', 'neural', 'bio', 'space'],
    marketing: ['seo', 'affiliate', 'email', 'social', 'ad', 'influencer', 'pr', 'brand', 'funnel'],
  };

  try {
    // Thử tìm trong DB trước
    let rows;
    const { rows: countRows } = await pgPool.query('SELECT COUNT(*) FROM agents');
    const hasDB = parseInt(countRows[0].count) > 0;

    if (hasDB) {
      let sql = 'SELECT * FROM agents WHERE 1=1';
      const params = [];

      if (q) {
        params.push(`%${q}%`);
        sql += ` AND (name ILIKE $${params.length} OR type ILIKE $${params.length} OR apis::text ILIKE $${params.length})`;
      }

      if (type !== 'all' && TYPE_KEYWORDS[type]) {
        const kws = TYPE_KEYWORDS[type];
        const kwClauses = kws.map((k, i) => {
          params.push(`%${k}%`);
          return `(name ILIKE $${params.length} OR type ILIKE $${params.length})`;
        });
        sql += ` AND (${kwClauses.join(' OR ')})`;
      }

      sql += ' ORDER BY sort_order ASC, id ASC';
      params.push(limit);
      sql += ` LIMIT $${params.length}`;

      const result = await pgPool.query(sql, params);
      rows = result.rows;
    } else {
      // Fallback: lọc từ seed data
      let pool = AGENTS_SEED.slice();
      if (q) {
        const ql = q.toLowerCase();
        pool = pool.filter(a =>
          a.name.toLowerCase().includes(ql) ||
          a.type.toLowerCase().includes(ql) ||
          (Array.isArray(a.apis) ? a.apis : []).some(api => api.toLowerCase().includes(ql))
        );
      }
      if (type !== 'all' && TYPE_KEYWORDS[type]) {
        const kws = TYPE_KEYWORDS[type];
        pool = pool.filter(a => kws.some(k =>
          a.type.toLowerCase().includes(k) || a.name.toLowerCase().includes(k)
        ));
      }
      if (type === 'top10') {
        pool = pool.slice().sort((a, b) =>
          parseFloat(b.revenue.replace(/[$,∞]/g, '')) - parseFloat(a.revenue.replace(/[$,∞]/g, ''))
        );
      }
      rows = pool.slice(0, limit);
    }

    res.json({ agents: rows, total: rows.length, q, type });
  } catch (e) {
    console.error('Agent search error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/agents/:id — chi tiết một agent + số liệu hoạt động + dữ liệu cá nhân user
app.get('/api/agents/:id', async (req, res) => {
  const aid = parseInt(req.params.id);
  if (isNaN(aid)) return res.status(400).json({ error: 'ID không hợp lệ' });

  try {
    // 1. Thông tin agent (DB hoặc seed)
    const { rows: countRows } = await pgPool.query('SELECT COUNT(*) FROM agents');
    const hasDB = parseInt(countRows[0].count) > 0;

    let agent = null;
    if (hasDB) {
      const { rows } = await pgPool.query('SELECT * FROM agents WHERE id=$1', [aid]);
      agent = rows[0] || null;
    }
    if (!agent) {
      agent = AGENTS_SEED.find(a => a.id === aid) || null;
    }
    if (!agent) return res.status(404).json({ error: 'Không tìm thấy agent' });

    // 2. Số liệu tổng hợp từ toàn bộ user
    const [chatStats, favStats, topicStats, vaultStats] = await Promise.all([
      pgPool.query(
        `SELECT COUNT(*) AS users, COALESCE(SUM(jsonb_array_length(history)),0) AS messages
         FROM agent_chat_history WHERE agent_id=$1`, [aid]
      ),
      pgPool.query('SELECT COUNT(*) AS total FROM favorites WHERE agent_id=$1', [aid]),
      pgPool.query('SELECT COUNT(*) AS total FROM agent_topics WHERE agent_id=$1 AND topic!=\'\'', [aid]),
      pgPool.query('SELECT COUNT(*) AS total FROM vault WHERE agent_id=$1', [aid]),
    ]);

    const stats = {
      chatUsers:    parseInt(chatStats.rows[0].users)    || 0,
      totalMessages:parseInt(chatStats.rows[0].messages) || 0,
      favorites:    parseInt(favStats.rows[0].total)     || 0,
      topicsSet:    parseInt(topicStats.rows[0].total)   || 0,
      vaultSaves:   parseInt(vaultStats.rows[0].total)   || 0,
    };

    // 3. Dữ liệu cá nhân (nếu đã đăng nhập)
    let userActivity = null;
    const user = req.user;
    if (user) {
      const [chatRow, favRow, topicRow] = await Promise.all([
        pgPool.query(
          'SELECT history FROM agent_chat_history WHERE user_id=$1 AND agent_id=$2',
          [user.id, aid]
        ),
        pgPool.query('SELECT 1 FROM favorites WHERE user_id=$1 AND agent_id=$2', [user.id, aid]),
        pgPool.query(
          'SELECT topic, topic_history FROM agent_topics WHERE user_id=$1 AND agent_id=$2',
          [user.id, aid]
        ),
      ]);

      const history = chatRow.rows[0]?.history || [];
      userActivity = {
        messageCount: Array.isArray(history) ? history.length : 0,
        isFavorite:   favRow.rows.length > 0,
        topic:        topicRow.rows[0]?.topic || '',
        topicHistory: topicRow.rows[0]?.topic_history || [],
      };
    }

    res.json({ agent, stats, userActivity });
  } catch (e) {
    console.error('Agent detail error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// GET all agents (from DB, fallback to seed if empty)
app.get('/api/db/admin/agents', requireAdminPassword, async (req, res) => {
  try {
    const { rows } = await pgPool.query('SELECT * FROM agents ORDER BY sort_order ASC, id ASC');
    res.json({ agents: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST seed — populate DB from hardcoded defaults
app.post('/api/db/admin/agents/seed', requireAdminPassword, async (req, res) => {
  try {
    for (const a of AGENTS_SEED) {
      await pgPool.query(
        `INSERT INTO agents (id, name, emoji, type, color, glow, revenue, auto, neural, iq, efficiency, apis, workflow, logs, xname, xnote, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (id) DO NOTHING`,
        [a.id, a.name, a.emoji, a.type, a.color, a.glow, a.revenue,
         a.auto, a.neural, a.iq, a.efficiency,
         JSON.stringify(a.apis), JSON.stringify(a.workflow), JSON.stringify(a.logs),
         a.xname, a.xnote, a.id]
      );
    }
    const { rows } = await pgPool.query('SELECT COUNT(*) FROM agents');
    res.json({ ok: true, count: parseInt(rows[0].count) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST create new agent
app.post('/api/db/admin/agents', requireAdminPassword, async (req, res) => {
  try {
    const { id, name, emoji, type, color, glow, revenue, auto, neural, iq, efficiency, apis, workflow, logs, xname, xnote } = req.body;
    if (!name) return res.status(400).json({ error: 'Tên agent không được trống' });
    const agentId = id !== undefined ? parseInt(id) : null;
    const sortOrder = agentId !== null ? agentId : 9999;
    await pgPool.query(
      `INSERT INTO agents (id, name, emoji, type, color, glow, revenue, auto, neural, iq, efficiency, apis, workflow, logs, xname, xnote, sort_order)
       VALUES (COALESCE($1, (SELECT COALESCE(MAX(id),100)+1 FROM agents)), $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [agentId, name, emoji||'🤖', type||'', color||'#00ffff', glow||color||'#00ffff', revenue||'$0',
       parseInt(auto)||80, parseInt(neural)||80, parseInt(iq)||80, parseInt(efficiency)||80,
       JSON.stringify(apis||[]), JSON.stringify(workflow||[]), JSON.stringify(logs||[]),
       xname||name, xnote||type||'', sortOrder]
    );
    const { rows } = await pgPool.query('SELECT * FROM agents ORDER BY sort_order ASC, id ASC');
    res.json({ ok: true, agents: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT update agent
app.put('/api/db/admin/agents/:id', requireAdminPassword, async (req, res) => {
  try {
    const aid = parseInt(req.params.id);
    const { name, emoji, type, color, glow, revenue, auto, neural, iq, efficiency, apis, workflow, logs, xname, xnote } = req.body;
    await pgPool.query(
      `UPDATE agents SET name=$1, emoji=$2, type=$3, color=$4, glow=$5, revenue=$6,
       auto=$7, neural=$8, iq=$9, efficiency=$10, apis=$11, workflow=$12, logs=$13,
       xname=$14, xnote=$15 WHERE id=$16`,
      [name, emoji||'🤖', type||'', color||'#00ffff', glow||color||'#00ffff', revenue||'$0',
       parseInt(auto)||80, parseInt(neural)||80, parseInt(iq)||80, parseInt(efficiency)||80,
       JSON.stringify(apis||[]), JSON.stringify(workflow||[]), JSON.stringify(logs||[]),
       xname||name, xnote||type||'', aid]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE agent
app.delete('/api/db/admin/agents/:id', requireAdminPassword, async (req, res) => {
  try {
    const aid = parseInt(req.params.id);
    await pgPool.query('DELETE FROM agents WHERE id=$1', [aid]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DB: Admin — delete user data ──────────────────────────────────────────────
app.delete('/api/db/admin/delete-user/:uid', requireAuthAPI, async (req, res) => {
  try {
    const uid = req.params.uid;
    await Promise.all([
      pgPool.query('DELETE FROM uc_chat_history WHERE user_id=$1',   [uid]),
      pgPool.query('DELETE FROM agent_chat_history WHERE user_id=$1',[uid]),
      pgPool.query('DELETE FROM vault WHERE user_id=$1',             [uid]),
      pgPool.query('DELETE FROM favorites WHERE user_id=$1',         [uid]),
      pgPool.query('DELETE FROM agent_topics WHERE user_id=$1',      [uid]),
      pgPool.query('DELETE FROM users WHERE id=$1',                  [uid]),
    ]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/debug', (req, res) => {
  const domain = getExternalDomain(req.hostname);
  const callbackURL = `https://${domain}/api/auth/google/callback`;
  const originURL = `https://${domain}`;
  res.send(`
    <html><head><meta charset="utf-8">
    <style>body{font-family:monospace;padding:32px;background:#111;color:#eee}
    h2{color:#f0c040}code{background:#222;padding:4px 10px;border-radius:4px;display:block;margin:8px 0;font-size:14px;word-break:break-all}
    p{color:#aaa}</style></head><body>
    <h2>🔑 Google OAuth – Thêm các URL sau vào Google Cloud Console</h2>
    <p><b>Authorized redirect URIs:</b></p>
    <code>${callbackURL}</code>
    <p><b>Authorized JavaScript origins:</b></p>
    <code>${originURL}</code>
    <p style="margin-top:24px;font-size:12px;color:#666">Vào: Google Cloud Console → Credentials → Web client → thêm 2 URL trên → Save</p>
    </body></html>
  `);
});

// ── KOCraft AI: Create KOC/KOL Profile ──────────────────────────────────────
app.post('/api/kocraft/koc', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Thiếu prompt' });
  try {
    const kocPrompt = `Bạn là chuyên gia tạo KOC/KOL ảo cho các nền tảng mạng xã hội TikTok, Instagram, YouTube Shorts.
Dựa trên yêu cầu sau: "${prompt}"
Hãy tạo một hồ sơ KOC/KOL ảo hoàn chỉnh theo định dạng JSON sau (không có markdown, chỉ JSON thuần):
{
  "name": "Tên nghệ danh KOC/KOL (độc đáo, dễ nhớ)",
  "age": 24,
  "gender": "Nữ",
  "niche": "Lĩnh vực chuyên môn chính",
  "personality": "Mô tả tính cách đặc trưng 1-2 câu",
  "bio": "Bio ngắn cho mạng xã hội (2-3 câu hấp dẫn, authentic)",
  "style": "Phong cách content (ví dụ: Authentic & Raw, Luxury & Aspirational, Educational)",
  "platforms": ["TikTok", "Instagram"],
  "followersTarget": "500K",
  "contentTypes": ["Review sản phẩm", "Tutorial", "Day in my life"],
  "catchphrase": "Câu tagline đặc trưng của KOC/KOL này",
  "imagePrompt": "Detailed English description for portrait photo generation: appearance, hair, outfit, pose, lighting, background, style",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "toneOfVoice": "Giọng điệu giao tiếp (ví dụ: Thân thiện, hài hước, chuyên nghiệp)",
  "targetAudience": "Đối tượng mục tiêu chính",
  "avgViews": "100K-500K views/video",
  "brandValues": ["Giá trị thương hiệu 1", "Giá trị thương hiệu 2"]
}`;
    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: kocPrompt }] }],
      config: { maxOutputTokens: 8192 }
    });
    let text = (response.text || '')
      .replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    // Extract only the JSON object in case there's surrounding text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Không tìm thấy JSON trong phản hồi');
    text = jsonMatch[0];
    let koc;
    try {
      koc = JSON.parse(text);
    } catch (parseErr) {
      // Attempt to repair truncated JSON by closing open strings/objects
      const repaired = text
        .replace(/,\s*$/, '')          // trailing comma
        .replace(/:\s*"[^"]*$/, ': ""') // unterminated string value
        + (text.split('{').length > text.split('}').length
            ? '}'.repeat(text.split('{').length - text.split('}').length)
            : '');
      koc = JSON.parse(repaired);
    }
    res.json({ koc });
  } catch (err) {
    console.error('KOCraft create KOC error:', err);
    res.status(500).json({ error: 'Lỗi tạo KOC/KOL: ' + err.message });
  }
});

// ── KOCraft AI: Generate Avatar ───────────────────────────────────────────────
app.post('/api/kocraft/avatar', async (req, res) => {
  const { imagePrompt } = req.body;
  if (!imagePrompt) return res.status(400).json({ error: 'Thiếu imagePrompt' });
  const fullPrompt = `Ultra realistic social media influencer portrait photo. ${imagePrompt}. Professional studio photography, soft lighting, high quality, Instagram-worthy, modern aesthetic. 8K resolution, sharp focus.`;
  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      config: { responseModalities: [Modality.TEXT, Modality.IMAGE] }
    });
    const candidate = response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find(p => p.inlineData);
    if (!imagePart?.inlineData?.data) return res.status(500).json({ error: 'Không thể tạo ảnh' });
    res.json({ image: `data:image/png;base64,${imagePart.inlineData.data}` });
  } catch (err) {
    console.error('KOCraft avatar error:', err);
    res.status(500).json({ error: 'Lỗi tạo ảnh: ' + err.message });
  }
});

// ── KOCraft AI: Generate Video Script ────────────────────────────────────────
app.post('/api/kocraft/video', async (req, res) => {
  const { koc, topic } = req.body;
  if (!koc || !topic) return res.status(400).json({ error: 'Thiếu KOC hoặc chủ đề video' });
  try {
    const videoPrompt = `Bạn là đạo diễn nội dung mạng xã hội chuyên nghiệp.
KOC/KOL: ${koc.name} | Lĩnh vực: ${koc.niche}
Tính cách: ${koc.personality}
Phong cách: ${koc.style} | Giọng điệu: ${koc.toneOfVoice}
Đối tượng: ${koc.targetAudience}
Chủ đề video: "${topic}"

Tạo kịch bản video ngắn (TikTok/Reels 60-90 giây) theo JSON sau (không markdown):
{
  "title": "Tiêu đề video cực hấp dẫn",
  "duration": "75 giây",
  "hook": "Câu mở đầu 3 giây kéo người xem ở lại",
  "script": [
    { "time": "0-3s", "action": "Hành động KOC", "dialogue": "Lời thoại chính xác", "visual": "Mô tả hình ảnh/góc quay" },
    { "time": "3-15s", "action": "...", "dialogue": "...", "visual": "..." },
    { "time": "15-35s", "action": "...", "dialogue": "...", "visual": "..." },
    { "time": "35-55s", "action": "...", "dialogue": "...", "visual": "..." },
    { "time": "55-75s", "action": "...", "dialogue": "...", "visual": "..." }
  ],
  "cta": "Call-to-action cuối video (follow, comment, share)",
  "music": "Nhạc nền gợi ý (thể loại + mood)",
  "effects": ["Hiệu ứng đặc biệt 1", "Transition 2", "Filter 3"],
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6"],
  "caption": "Caption đầy đủ để đăng bài (2-4 câu + emoji + hashtags)",
  "tips": ["Mẹo quay 1", "Mẹo ánh sáng 2", "Mẹo edit 3"]
}`;
    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: videoPrompt }] }],
      config: { maxOutputTokens: 3000 }
    });
    let text = (response.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const video = JSON.parse(text);
    res.json({ video });
  } catch (err) {
    console.error('KOCraft video error:', err);
    res.status(500).json({ error: 'Lỗi tạo kịch bản: ' + err.message });
  }
});

// ── KOCraft AI: Workflow Auto-Fill ────────────────────────────────────────
app.post('/api/kocraft/workflow-fill', async (req, res) => {
  const { koc, topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'Thiếu chủ đề' });
  const kocName = koc ? koc.name : 'KOC/KOL';
  const kocNiche = koc ? koc.niche : 'general content';
  const kocStyle = koc ? koc.style : 'authentic';
  try {
    const wfPrompt = `Bạn là AI chuyên gia quản lý chiến dịch content KOC/KOL.
KOC/KOL: ${kocName} | Lĩnh vực: ${kocNiche} | Phong cách: ${kocStyle}
Chủ đề chiến dịch: "${topic}"

Tạo nội dung cho 7 bước workflow theo JSON sau (không markdown, chỉ JSON thuần):
{
  "productScout": "Phân tích & liệt kê 3-5 sản phẩm/brand phù hợp với ${kocNiche}, kèm lý do chọn và điểm nổi bật",
  "reviewScript": "Outline kịch bản review 60s: hook 3s, điểm nổi bật 1-2-3, honest opinion, kết luận recommend/not recommend",
  "unboxingDirector": "Hướng dẫn cảnh quay unboxing: góc máy, ánh sáng, props cần có, reaction moments cần capture, B-roll shots",
  "authenticCopyWriter": "Caption authentic cho bài đăng: 3-4 câu chân thực, không quảng cáo lộ liễu, kèm 3 phiên bản (casual/storytelling/review)",
  "multiplatformPublisher": "Lịch đăng bài tối ưu: TikTok (giờ vàng, format), Instagram (Reels vs Feed vs Story), YouTube Shorts (thumbnail tip, SEO title)",
  "engagementTracker": "KPI mục tiêu: views, likes, comments, shares, CTR, save rate. Chiến lược reply comment và tăng engagement trong 24h đầu",
  "brandDealMatcher": "3 brand deal phù hợp nhất: tên brand, lý do match, đề xuất hình thức hợp tác (gifted/paid/affiliate), rate card gợi ý"
}`;
    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: wfPrompt }] }],
      config: { maxOutputTokens: 3000 }
    });
    let text = (response.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const workflow = JSON.parse(text);
    res.json({ workflow });
  } catch (err) {
    console.error('KOCraft workflow fill error:', err);
    res.status(500).json({ error: 'Lỗi auto-fill workflow: ' + err.message });
  }
});

// ── KOCraft AI: Content Calendar ─────────────────────────────────────────
app.post('/api/kocraft/content-calendar', async (req, res) => {
  const { koc, platforms } = req.body;
  const kocName  = koc ? koc.name  : 'KOC/KOL';
  const kocNiche = koc ? koc.niche : 'general content';
  const kocStyle = koc ? koc.style : 'authentic';
  const kocTarget = koc ? koc.targetAudience : 'general audience';
  const pList = (platforms && platforms.length) ? platforms.join(', ') : 'TikTok, Instagram, YouTube Shorts';
  try {
    const prompt = `Bạn là chuyên gia lên lịch content cho KOC/KOL.
KOC/KOL: ${kocName} | Lĩnh vực: ${kocNiche} | Phong cách: ${kocStyle} | Đối tượng: ${kocTarget}
Nền tảng: ${pList}

Tạo lịch content 7 ngày (Thứ 2 đến Chủ nhật) theo JSON sau (không markdown, chỉ JSON thuần):
{
  "week_theme": "Chủ đề xuyên suốt cả tuần",
  "days": [
    {
      "day": "Thứ 2",
      "date_note": "Ngày mở đầu tuần — mood & energy cao",
      "posts": [
        {
          "platform": "TikTok",
          "time": "19:00",
          "type": "Loại content (Review/Tutorial/Vlog/...)",
          "topic": "Chủ đề bài đăng cụ thể",
          "hook": "Hook 3 giây kéo người xem",
          "caption_idea": "Ý tưởng caption ngắn",
          "hashtags": ["#tag1","#tag2","#tag3"],
          "duration": "60s",
          "priority": "high"
        }
      ]
    }
  ],
  "tips": ["Mẹo 1 cho cả tuần", "Mẹo 2", "Mẹo 3"],
  "total_posts": 14
}
Tạo đủ 7 ngày, mỗi ngày 1-3 bài đăng phù hợp với nền tảng. Nội dung đa dạng, không lặp lại.`;
    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 8192 }
    });
    let text = (response.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const calendar = JSON.parse(text);
    res.json({ calendar });
  } catch (err) {
    console.error('Content calendar error:', err);
    res.status(500).json({ error: 'Lỗi tạo lịch content: ' + err.message });
  }
});

// ── KOCraft AI: Rate Card ─────────────────────────────────────────────────
app.post('/api/kocraft/rate-card', async (req, res) => {
  const { koc } = req.body;
  const kocName    = koc ? koc.name    : 'KOC/KOL';
  const kocNiche   = koc ? koc.niche   : 'general content';
  const kocFollow  = koc ? koc.followersTarget : '100K';
  const kocAvgView = koc ? koc.avgViews : '50K views/video';
  const kocPlatforms = koc ? (koc.platforms || []).join(', ') : 'TikTok, Instagram';
  try {
    const prompt = `Bạn là chuyên gia định giá và tư vấn hợp tác thương hiệu cho KOC/KOL.
KOC/KOL: ${kocName} | Lĩnh vực: ${kocNiche}
Mục tiêu: ${kocFollow} followers | Lượt xem: ${kocAvgView}
Nền tảng: ${kocPlatforms}

Tạo rate card chuyên nghiệp theo JSON sau (không markdown, chỉ JSON thuần):
{
  "koc_tier": "Nano/Micro/Mid-tier/Macro/Mega Influencer",
  "positioning": "Định vị thương hiệu cá nhân 1-2 câu",
  "packages": [
    {
      "name": "BASIC PACKAGE",
      "price_vnd": "5,000,000",
      "price_usd": "$200",
      "deliverables": ["1x TikTok video 60s", "1x Instagram Story", "1x caption authentic"],
      "platforms": ["TikTok"],
      "timeline": "3-5 ngày",
      "revisions": "1 lần chỉnh sửa",
      "best_for": "Brand nhỏ, thử nghiệm"
    },
    {
      "name": "STANDARD PACKAGE",
      "price_vnd": "15,000,000",
      "price_usd": "$600",
      "deliverables": ["2x TikTok video 60-90s", "3x Instagram Story", "1x Reels", "2x caption", "1x review blog/thread"],
      "platforms": ["TikTok","Instagram"],
      "timeline": "7-10 ngày",
      "revisions": "2 lần chỉnh sửa",
      "best_for": "Brand vừa, chiến dịch có mục tiêu rõ"
    },
    {
      "name": "PREMIUM PACKAGE",
      "price_vnd": "35,000,000",
      "price_usd": "$1,400",
      "deliverables": ["4x TikTok video", "1x YouTube Shorts", "5x Instagram Story", "2x Reels", "3x caption", "1x dedicated review", "1x livestream 30 phút"],
      "platforms": ["TikTok","Instagram","YouTube Shorts"],
      "timeline": "14-21 ngày",
      "revisions": "Không giới hạn",
      "best_for": "Brand lớn, chiến dịch dài hạn"
    },
    {
      "name": "LONG-TERM AMBASSADOR",
      "price_vnd": "80,000,000/tháng",
      "price_usd": "$3,200/month",
      "deliverables": ["8x TikTok video/tháng", "2x YouTube Shorts", "10x Instagram Story", "4x Reels", "Xuất hiện event", "Logo trên bio 30 ngày"],
      "platforms": ["Tất cả nền tảng"],
      "timeline": "Hợp đồng 3-6 tháng",
      "revisions": "Không giới hạn + Priority support",
      "best_for": "Brand muốn xây dựng quan hệ lâu dài"
    }
  ],
  "add_ons": [
    { "service": "Shoutout Instagram Story", "price": "1,000,000 VND" },
    { "service": "Gắn link bio 1 tuần", "price": "2,000,000 VND" },
    { "service": "Usage rights ảnh/video 6 tháng", "price": "5,000,000 VND" },
    { "service": "Exclusive rights 3 tháng (không collab đối thủ)", "price": "15,000,000 VND" }
  ],
  "terms": ["Thanh toán 50% trước, 50% sau khi đăng", "Gửi sản phẩm trước 10 ngày", "Báo cáo analytics sau 7 ngày đăng", "Không chỉnh sửa nội dung đã thống nhất"],
  "contact_cta": "Câu kêu gọi liên hệ hợp tác cuối rate card"
}`;
    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 4096 }
    });
    let text = (response.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const rateCard = JSON.parse(text);
    res.json({ rateCard });
  } catch (err) {
    console.error('Rate card error:', err);
    res.status(500).json({ error: 'Lỗi tạo rate card: ' + err.message });
  }
});

// ── KOCraft AI: Brand Pitch ───────────────────────────────────────────────
app.post('/api/kocraft/brand-pitch', async (req, res) => {
  const { koc, brandName, brandType, pitchGoal } = req.body;
  if (!brandName) return res.status(400).json({ error: 'Thiếu tên brand' });
  const kocName  = koc ? koc.name  : 'KOC/KOL';
  const kocNiche = koc ? koc.niche : 'content creator';
  const kocBio   = koc ? koc.bio   : '';
  const kocFollow = koc ? koc.followersTarget : '100K';
  const kocAvg   = koc ? koc.avgViews : '50K views/video';
  try {
    const prompt = `Bạn là chuyên gia viết email/DM pitch hợp tác thương hiệu cho KOC/KOL.
KOC/KOL: ${kocName} | Lĩnh vực: ${kocNiche}
Bio: ${kocBio}
Chỉ số: ${kocFollow} followers | ${kocAvg}
Brand muốn pitch: ${brandName} (${brandType || 'thương hiệu'})
Mục tiêu pitch: ${pitchGoal || 'hợp tác review sản phẩm'}

Viết pitch theo JSON sau (không markdown, chỉ JSON thuần):
{
  "subject_line": "Tiêu đề email hấp dẫn, chuyên nghiệp",
  "email_body": "Nội dung email đầy đủ (3-4 đoạn): giới thiệu bản thân → lý do chọn brand này → giá trị mang lại → CTA cụ thể",
  "dm_version": "Phiên bản ngắn gọn cho Instagram/TikTok DM (100-150 chữ)",
  "key_stats": ["Stat 1 ấn tượng", "Stat 2", "Stat 3"],
  "value_props": ["Giá trị 1 bạn mang lại cho brand", "Giá trị 2", "Giá trị 3"],
  "proposed_collab": "Đề xuất hình thức hợp tác cụ thể",
  "follow_up": "Template follow-up sau 5-7 ngày nếu chưa reply",
  "tips": ["Mẹo gửi pitch hiệu quả 1", "Mẹo 2", "Mẹo 3"]
}`;
    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 4096 }
    });
    let text = (response.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const pitch = JSON.parse(text);
    res.json({ pitch });
  } catch (err) {
    console.error('Brand pitch error:', err);
    res.status(500).json({ error: 'Lỗi tạo brand pitch: ' + err.message });
  }
});

// ── KOCraft AI: Hashtag Strategy ─────────────────────────────────────────
app.post('/api/kocraft/hashtag-strategy', async (req, res) => {
  const { koc, topic, platform } = req.body;
  const kocNiche = koc ? koc.niche : 'content creator';
  const targetPlatform = platform || 'TikTok';
  const postTopic = topic || kocNiche;
  try {
    const prompt = `Bạn là chuyên gia chiến lược hashtag cho ${targetPlatform}.
Lĩnh vực KOC/KOL: ${kocNiche}
Chủ đề bài đăng: ${postTopic}
Nền tảng: ${targetPlatform}

Tạo chiến lược hashtag tối ưu theo JSON sau (không markdown, chỉ JSON thuần):
{
  "strategy_name": "Tên chiến lược hashtag",
  "buckets": [
    {
      "name": "MEGA (1B+ lượt dùng)",
      "purpose": "Tiếp cận đại trà, ít cạnh tranh nổi bật",
      "hashtags": ["#hashtag1","#hashtag2","#hashtag3"],
      "recommended_count": 2
    },
    {
      "name": "LARGE (100M-1B)",
      "purpose": "Cân bằng reach & competition",
      "hashtags": ["#hashtag4","#hashtag5","#hashtag6","#hashtag7"],
      "recommended_count": 3
    },
    {
      "name": "MEDIUM (10M-100M)",
      "purpose": "Cơ hội nổi bật cao hơn",
      "hashtags": ["#hashtag8","#hashtag9","#hashtag10","#hashtag11","#hashtag12"],
      "recommended_count": 4
    },
    {
      "name": "NICHE (1M-10M)",
      "purpose": "Audience chính xác, engagement cao",
      "hashtags": ["#hashtag13","#hashtag14","#hashtag15","#hashtag16","#hashtag17"],
      "recommended_count": 4
    },
    {
      "name": "MICRO (<1M)",
      "purpose": "Cộng đồng tight, loyal audience",
      "hashtags": ["#hashtag18","#hashtag19","#hashtag20","#hashtag21","#hashtag22"],
      "recommended_count": 3
    },
    {
      "name": "BRANDED/CUSTOM",
      "purpose": "Hashtag thương hiệu cá nhân",
      "hashtags": ["#brandhashtag1","#brandhashtag2"],
      "recommended_count": 2
    }
  ],
  "optimal_set": ["#top1","#top2","#top3","#top4","#top5","#top6","#top7","#top8","#top9","#top10","#top11","#top12","#top13","#top14","#top15","#top16","#top17","#top18"],
  "total_recommended": 18,
  "posting_tip": "Cách dùng hashtag hiệu quả nhất trên ${targetPlatform}",
  "avoid": ["#hashtag_nên_tránh_1 — lý do","#hashtag_nên_tránh_2 — lý do"],
  "trending_now": ["#trend1","#trend2","#trend3"]
}`;
    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 4096 }
    });
    let text = (response.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const hashtagStrategy = JSON.parse(text);
    res.json({ hashtagStrategy });
  } catch (err) {
    console.error('Hashtag strategy error:', err);
    res.status(500).json({ error: 'Lỗi tạo hashtag strategy: ' + err.message });
  }
});

// ── AI Agent Mode: 30-Day Content Plan ───────────────────────────────────
app.post('/api/agent-mode/content-plan', async (req, res) => {
  const { niche, platform, style, language } = req.body;
  if (!niche) return res.status(400).json({ error: 'Thiếu thông tin chủ đề' });

  const platMap = {
    tiktok: 'TikTok (short-form video, trending audio, hooks)',
    youtube: 'YouTube (long-form video, SEO titles, thumbnails)',
    instagram: 'Instagram (Reels + carousels + Stories)',
    facebook: 'Facebook (posts, livestream, groups)',
    linkedin: 'LinkedIn (professional thought leadership)',
    twitter: 'X/Twitter (threads, hooks, viral takes)',
  };
  const platDesc = platMap[platform] || platform || 'đa nền tảng';

  const styleMap = {
    educational: 'giáo dục, hướng dẫn, chia sẻ kiến thức',
    entertaining: 'giải trí, hài hước, trending, viral',
    storytelling: 'kể chuyện cá nhân, cảm xúc, trải nghiệm thực tế',
    promotional: 'quảng bá thương hiệu, bán hàng, review sản phẩm',
    motivational: 'truyền cảm hứng, động lực, mindset',
  };
  const styleDesc = styleMap[style] || style || 'đa dạng';
  const lang = language === 'en' ? 'English' : 'Vietnamese (Tiếng Việt)';

  const prompt = `Bạn là AI Content Strategist chuyên nghiệp. Tạo kế hoạch content 30 ngày hoàn chỉnh cho:

- CHỦ ĐỀ/NICHE: ${niche}
- NỀN TẢNG: ${platDesc}
- PHONG CÁCH: ${styleDesc}
- NGÔN NGỮ NỘI DUNG: ${lang}

Trả về JSON hợp lệ theo đúng cấu trúc sau (không markdown, chỉ JSON thuần):
{
  "plan_title": "Tên kế hoạch 30 ngày",
  "niche": "${niche}",
  "platform": "${platform || 'multi'}",
  "style": "${style || 'mixed'}",
  "overview": "Tóm tắt chiến lược 2-3 câu",
  "weeks": [
    {
      "week": 1,
      "theme": "Chủ đề tuần 1",
      "goal": "Mục tiêu tuần"
    }
  ],
  "days": [
    {
      "day": 1,
      "week": 1,
      "content_type": "Video/Carousel/Reel/Post/Thread/Story",
      "title": "Tiêu đề hấp dẫn",
      "hook": "Câu mở đầu gây chú ý (hook)",
      "caption": "Caption đầy đủ cho bài đăng",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
      "best_time": "HH:MM",
      "cta": "Call-to-action cụ thể",
      "tip": "Mẹo thực hiện nội dung này"
    }
  ],
  "content_pillars": ["Trụ cột 1", "Trụ cột 2", "Trụ cột 3"],
  "kpis": ["KPI 1", "KPI 2", "KPI 3"]
}

Tạo đủ 30 ngày (day 1 đến day 30), mỗi ngày phải khác nhau, đa dạng loại content. Tuần 1 xây nền, tuần 2 tăng tốc, tuần 3 viral, tuần 4 chuyển đổi. Trả về JSON hợp lệ 100%.`;

  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 16000 }
    });
    let text = (response.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) text = text.slice(firstBrace, lastBrace + 1);
    const plan = JSON.parse(text);
    res.json({ plan });
  } catch (err) {
    console.error('Content plan error:', err);
    res.status(500).json({ error: 'Lỗi tạo content plan: ' + err.message });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  // Warm up OIDC discovery in the background
  getOidcConfig().catch(err => console.error('OIDC warmup error:', err));
});
