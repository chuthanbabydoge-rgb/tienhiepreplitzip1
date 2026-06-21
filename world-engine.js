'use strict';
// ═══════════════════════════════════════════════════════════════════════════════
//  World Engine v1 — Vương Đế AI
//  Tables: worlds · districts · buildings · citizens
//  WebSocket real-time state sync + citizen simulation loop
// ═══════════════════════════════════════════════════════════════════════════════

const WebSocket = require('ws');

// ─── Constants ────────────────────────────────────────────────────────────────
const WORLD_SIZE   = 120;   // world is 120×120 units
const SIM_INTERVAL = 2000;  // citizen simulation tick ms
const WS_PING_INT  = 30000; // WebSocket ping interval ms

const STATUS_COLORS = {
  idle:      '#00ffff',
  thinking:  '#ffd700',
  working:   '#00ff88',
  meeting:   '#a855f7',
  completed: '#00ff44',
  failed:    '#ff4466',
};

// District layout blueprint (positions are 0–WORLD_SIZE)
const DISTRICT_BLUEPRINTS = [
  { name: 'Command Center', type: 'office',      color: '#0a2a4a', pos_x: 0,  pos_z: 0,  width: 55, depth: 55 },
  { name: 'Research Hub',   type: 'lab',         color: '#1a0a3a', pos_x: 60, pos_z: 0,  width: 55, depth: 55 },
  { name: 'Operations',     type: 'workshop',    color: '#0a2a1a', pos_x: 0,  pos_z: 60, width: 55, depth: 55 },
  { name: 'Social Plaza',   type: 'plaza',       color: '#2a1a00', pos_x: 60, pos_z: 60, width: 55, depth: 55 },
];

const BUILDING_BLUEPRINTS = [
  { district_type: 'office',   name: 'Headquarters',    type: 'hq',           off_x: 12, off_z: 12, width: 16, height: 20, depth: 16, color: '#00aacc' },
  { district_type: 'office',   name: 'Strategy Room',   type: 'meeting_hall', off_x: 35, off_z: 12, width: 10, height: 8,  depth: 10, color: '#0077aa' },
  { district_type: 'office',   name: 'Archive Tower',   type: 'archive',      off_x: 12, off_z: 35, width: 8,  height: 30, depth: 8,  color: '#005577' },
  { district_type: 'lab',      name: 'AI Research Lab', type: 'server_room',  off_x: 8,  off_z: 8,  width: 18, height: 14, depth: 14, color: '#6600cc' },
  { district_type: 'lab',      name: 'Data Vault',      type: 'archive',      off_x: 34, off_z: 8,  width: 10, height: 18, depth: 10, color: '#4400aa' },
  { district_type: 'lab',      name: 'Test Chamber',    type: 'workshop',     off_x: 8,  off_z: 34, width: 14, height: 6,  depth: 12, color: '#330088' },
  { district_type: 'workshop', name: 'Task Factory',    type: 'workshop',     off_x: 10, off_z: 10, width: 20, height: 10, depth: 16, color: '#006633' },
  { district_type: 'workshop', name: 'Tool Shed',       type: 'market',       off_x: 36, off_z: 10, width: 10, height: 6,  depth: 10, color: '#004422' },
  { district_type: 'workshop', name: 'Engine Room',     type: 'server_room',  off_x: 10, off_z: 36, width: 12, height: 12, depth: 12, color: '#005533' },
  { district_type: 'plaza',    name: 'Market Hall',     type: 'market',       off_x: 10, off_z: 10, width: 18, height: 8,  depth: 14, color: '#aa6600' },
  { district_type: 'plaza',    name: 'Meeting Dome',    type: 'meeting_hall', off_x: 34, off_z: 10, width: 14, height: 12, depth: 14, color: '#cc7700' },
  { district_type: 'plaza',    name: 'Agora',           type: 'park',         off_x: 10, off_z: 34, width: 22, height: 2,  depth: 16, color: '#885500' },
];

// Status → building type affinity (where citizens go when in that status)
const STATUS_BUILDING = {
  idle:      'park',
  thinking:  'server_room',
  working:   'workshop',
  meeting:   'meeting_hall',
  completed: 'hq',
  failed:    'archive',
};

// ─── DB Schema ────────────────────────────────────────────────────────────────
async function initWorldTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS worlds (
      id           SERIAL PRIMARY KEY,
      owner_id     TEXT NOT NULL,
      name         TEXT NOT NULL,
      description  TEXT DEFAULT '',
      theme        TEXT DEFAULT 'cyberpunk',
      is_active    BOOLEAN DEFAULT true,
      settings     JSONB DEFAULT '{}',
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS districts (
      id         SERIAL PRIMARY KEY,
      world_id   INTEGER REFERENCES worlds(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      type       TEXT DEFAULT 'office',
      color      TEXT DEFAULT '#0a2a4a',
      pos_x      FLOAT DEFAULT 0,
      pos_z      FLOAT DEFAULT 0,
      width      FLOAT DEFAULT 50,
      depth      FLOAT DEFAULT 50,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS buildings (
      id          SERIAL PRIMARY KEY,
      world_id    INTEGER REFERENCES worlds(id) ON DELETE CASCADE,
      district_id INTEGER REFERENCES districts(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      type        TEXT DEFAULT 'hq',
      pos_x       FLOAT DEFAULT 0,
      pos_z       FLOAT DEFAULT 0,
      width       FLOAT DEFAULT 10,
      height      FLOAT DEFAULT 10,
      depth       FLOAT DEFAULT 10,
      color       TEXT DEFAULT '#00aacc',
      capacity    INTEGER DEFAULT 5,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS citizens (
      id           SERIAL PRIMARY KEY,
      world_id     INTEGER REFERENCES worlds(id) ON DELETE CASCADE,
      agent_id     INTEGER REFERENCES aos_agents(id) ON DELETE CASCADE,
      home_building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
      name         TEXT NOT NULL,
      role         TEXT DEFAULT 'worker',
      avatar_color TEXT DEFAULT '#00ffff',
      pos_x        FLOAT DEFAULT 60,
      pos_z        FLOAT DEFAULT 60,
      target_x     FLOAT DEFAULT 60,
      target_z     FLOAT DEFAULT 60,
      status       TEXT DEFAULT 'idle',
      state_data   JSONB DEFAULT '{}',
      speed        FLOAT DEFAULT 4.0,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(world_id, agent_id)
    );

    CREATE INDEX IF NOT EXISTS idx_worlds_owner    ON worlds(owner_id);
    CREATE INDEX IF NOT EXISTS idx_districts_world ON districts(world_id);
    CREATE INDEX IF NOT EXISTS idx_buildings_world ON buildings(world_id);
    CREATE INDEX IF NOT EXISTS idx_citizens_world  ON citizens(world_id);
    CREATE INDEX IF NOT EXISTS idx_citizens_agent  ON citizens(agent_id);
  `);

  console.log('✅ World Engine tables ready');
}

// ─── World generation helpers ─────────────────────────────────────────────────
async function generateWorldLayout(pool, worldId) {
  const districtMap = {};

  for (const d of DISTRICT_BLUEPRINTS) {
    const { rows } = await pool.query(
      `INSERT INTO districts (world_id, name, type, color, pos_x, pos_z, width, depth)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [worldId, d.name, d.type, d.color, d.pos_x, d.pos_z, d.width, d.depth]
    );
    districtMap[d.type] = { id: rows[0].id, ...d };
  }

  for (const b of BUILDING_BLUEPRINTS) {
    const district = districtMap[b.district_type];
    if (!district) continue;
    await pool.query(
      `INSERT INTO buildings (world_id, district_id, name, type, pos_x, pos_z, width, height, depth, color)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [worldId, district.id, b.name, b.type,
       district.pos_x + b.off_x, district.pos_z + b.off_z,
       b.width, b.height, b.depth, b.color]
    );
  }
}

// ─── REST Routes ──────────────────────────────────────────────────────────────
function registerWorldRoutes(app, pool, wss) {

  function reqAuth(req, res, next) {
    if (!req.isAuthenticated || !req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  // ── Worlds ──────────────────────────────────────────────────────────────────

  app.get('/api/world/worlds', reqAuth, async (req, res) => {
    try {
      const uid = String(req.user.id);
      const { rows } = await pool.query(`
        SELECT w.*,
          COUNT(DISTINCT c.id)::int AS citizen_count,
          COUNT(DISTINCT b.id)::int AS building_count
        FROM worlds w
        LEFT JOIN citizens  c ON c.world_id = w.id
        LEFT JOIN buildings b ON b.world_id = w.id
        WHERE w.owner_id = $1
        GROUP BY w.id ORDER BY w.created_at DESC
      `, [uid]);
      res.json({ worlds: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/world/worlds', reqAuth, async (req, res) => {
    try {
      const uid = String(req.user.id);
      const { name, description = '', theme = 'cyberpunk' } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: 'name required' });

      const { rows } = await pool.query(
        `INSERT INTO worlds (owner_id, name, description, theme) VALUES ($1,$2,$3,$4) RETURNING *`,
        [uid, name.trim(), description, theme]
      );
      const world = rows[0];
      await generateWorldLayout(pool, world.id);

      // Auto-enroll all user's agents as citizens in this world
      const agents = await pool.query(
        `SELECT a.* FROM aos_agents a
         LEFT JOIN citizens c ON c.agent_id = a.id AND c.world_id = $1
         WHERE c.id IS NULL LIMIT 50`,
        [world.id]
      );
      for (const agent of agents.rows) {
        await enrollAgentAsCitizen(pool, agent, world.id);
      }

      res.json({ world });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/world/worlds/:id', reqAuth, async (req, res) => {
    try {
      const uid = String(req.user.id);
      const wid = req.params.id;
      const [worldR, distR, bldR, citR] = await Promise.all([
        pool.query('SELECT * FROM worlds WHERE id=$1 AND owner_id=$2', [wid, uid]),
        pool.query('SELECT * FROM districts WHERE world_id=$1 ORDER BY id', [wid]),
        pool.query('SELECT * FROM buildings WHERE world_id=$1 ORDER BY id', [wid]),
        pool.query(`
          SELECT c.*, a.model, a.goal
          FROM citizens c
          LEFT JOIN aos_agents a ON a.id = c.agent_id
          WHERE c.world_id = $1 ORDER BY c.id
        `, [wid]),
      ]);
      if (!worldR.rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json({ world: worldR.rows[0], districts: distR.rows, buildings: bldR.rows, citizens: citR.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/world/worlds/:id', reqAuth, async (req, res) => {
    try {
      const uid = String(req.user.id);
      await pool.query('DELETE FROM worlds WHERE id=$1 AND owner_id=$2', [req.params.id, uid]);
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ── Citizens ────────────────────────────────────────────────────────────────

  app.get('/api/world/worlds/:id/citizens', async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT c.*, a.model
        FROM citizens c LEFT JOIN aos_agents a ON a.id = c.agent_id
        WHERE c.world_id = $1 ORDER BY c.id
      `, [req.params.id]);
      res.json({ citizens: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Manually enroll an agent into a world
  app.post('/api/world/worlds/:id/enroll', reqAuth, async (req, res) => {
    try {
      const { agent_id } = req.body;
      if (!agent_id) return res.status(400).json({ error: 'agent_id required' });
      const agentR = await pool.query('SELECT * FROM aos_agents WHERE id=$1', [agent_id]);
      if (!agentR.rows[0]) return res.status(404).json({ error: 'Agent not found' });
      const citizen = await enrollAgentAsCitizen(pool, agentR.rows[0], req.params.id);
      res.json({ citizen });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Update citizen status manually
  app.patch('/api/world/citizens/:id/status', reqAuth, async (req, res) => {
    try {
      const { status } = req.body;
      if (!STATUS_COLORS[status]) return res.status(400).json({ error: 'Invalid status' });
      const { rows } = await pool.query(
        `UPDATE citizens SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
        [status, req.params.id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Not found' });
      // Broadcast via WebSocket
      broadcastCitizenUpdate(wss, rows[0]);
      res.json({ citizen: rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // World stats
  app.get('/api/world/stats', reqAuth, async (req, res) => {
    try {
      const uid = String(req.user.id);
      const [worlds, citizens, agents] = await Promise.all([
        pool.query('SELECT COUNT(*)::int AS total FROM worlds WHERE owner_id=$1', [uid]),
        pool.query(`SELECT COUNT(*)::int AS total FROM citizens c JOIN worlds w ON w.id=c.world_id WHERE w.owner_id=$1`, [uid]),
        pool.query(`SELECT status, COUNT(*)::int AS cnt FROM citizens c JOIN worlds w ON w.id=c.world_id WHERE w.owner_id=$1 GROUP BY status`, [uid]),
      ]);
      const statusMap = {};
      agents.rows.forEach(r => { statusMap[r.status] = r.cnt; });
      res.json({ worlds: worlds.rows[0].total, citizens: citizens.rows[0].total, by_status: statusMap });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

// ─── Enroll agent as citizen ───────────────────────────────────────────────────
async function enrollAgentAsCitizen(pool, agent, worldId) {
  // Find HQ building as home
  const bldR = await pool.query(
    `SELECT id, pos_x, pos_z FROM buildings WHERE world_id=$1 AND type='hq' LIMIT 1`,
    [worldId]
  );
  const hq = bldR.rows[0];
  const px = hq ? hq.pos_x + Math.random() * 8 - 4 : 20 + Math.random() * 20;
  const pz = hq ? hq.pos_z + Math.random() * 8 - 4 : 20 + Math.random() * 20;

  const { rows } = await pool.query(`
    INSERT INTO citizens (world_id, agent_id, home_building_id, name, role, avatar_color, pos_x, pos_z, target_x, target_z, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'idle')
    ON CONFLICT (world_id, agent_id) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role
    RETURNING *
  `, [worldId, agent.id, hq?.id || null, agent.name, agent.role?.slice(0, 60) || 'Agent', '#00ffff', px, pz, px, pz]);
  return rows[0];
}

// ─── WebSocket helpers ─────────────────────────────────────────────────────────
function broadcastCitizenUpdate(wss, citizen) {
  if (!wss) return;
  const msg = JSON.stringify({ type: 'citizen_update', citizen });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.worldId === citizen.world_id) {
      client.send(msg);
    }
  });
}

function broadcastEvent(wss, worldId, eventType, citizenId, message) {
  if (!wss) return;
  const msg = JSON.stringify({ type: 'event', event: eventType, citizen_id: citizenId, message, ts: Date.now() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.worldId === worldId) {
      client.send(msg);
    }
  });
}

function broadcastBulk(wss, worldId, citizens) {
  if (!wss) return;
  const msg = JSON.stringify({ type: 'citizen_bulk_update', citizens });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && client.worldId === worldId) {
      client.send(msg);
    }
  });
}

// ─── Citizen simulation ────────────────────────────────────────────────────────
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function rand(min, max) { return min + Math.random() * (max - min); }

async function simulateWorld(pool, wss, worldId) {
  try {
    // Get all citizens + their home buildings
    const { rows: citizens } = await pool.query(`
      SELECT c.*, b.pos_x AS home_x, b.pos_z AS home_z, b.type AS home_type
      FROM citizens c
      LEFT JOIN buildings b ON b.id = c.home_building_id
      WHERE c.world_id = $1
    `, [worldId]);

    if (!citizens.length) return;

    // Get buildings in world for target resolution
    const { rows: buildings } = await pool.query(
      'SELECT * FROM buildings WHERE world_id=$1', [worldId]
    );
    const bldByType = {};
    buildings.forEach(b => {
      if (!bldByType[b.type]) bldByType[b.type] = [];
      bldByType[b.type].push(b);
    });

    const updates = [];

    for (const c of citizens) {
      let { pos_x, pos_z, target_x, target_z, status, speed } = c;
      const STEP = speed * (SIM_INTERVAL / 1000);

      // Move toward target
      const dx = target_x - pos_x, dz = target_z - pos_z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      let newX = pos_x, newZ = pos_z;
      let newTx = target_x, newTz = target_z;

      if (dist > 0.5) {
        newX = clamp(pos_x + (dx / dist) * STEP, 2, WORLD_SIZE - 2);
        newZ = clamp(pos_z + (dz / dist) * STEP, 2, WORLD_SIZE - 2);
      } else {
        // Reached target — assign new target based on status
        const preferredType = STATUS_BUILDING[status] || 'park';
        const candidates = bldByType[preferredType] || bldByType['hq'] || buildings;
        if (candidates?.length) {
          const bld = candidates[Math.floor(Math.random() * candidates.length)];
          newTx = clamp(bld.pos_x + rand(-bld.width / 3, bld.width / 3), 2, WORLD_SIZE - 2);
          newTz = clamp(bld.pos_z + rand(-bld.depth / 3, bld.depth / 3), 2, WORLD_SIZE - 2);
        } else {
          newTx = clamp(rand(5, WORLD_SIZE - 5), 2, WORLD_SIZE - 2);
          newTz = clamp(rand(5, WORLD_SIZE - 5), 2, WORLD_SIZE - 2);
        }
      }

      updates.push({ id: c.id, pos_x: newX, pos_z: newZ, target_x: newTx, target_z: newTz, status, world_id: worldId });
    }

    // Bulk DB update
    for (const u of updates) {
      await pool.query(
        'UPDATE citizens SET pos_x=$1, pos_z=$2, target_x=$3, target_z=$4, updated_at=NOW() WHERE id=$5',
        [u.pos_x, u.pos_z, u.target_x, u.target_z, u.id]
      );
    }

    // Broadcast bulk update to subscribed clients
    broadcastBulk(wss, worldId, updates);

  } catch (e) {
    // Silently continue
  }
}

// ─── Agent OS status hook (called by AOS when task status changes) ─────────────
async function onAgentStatusChange(pool, wss, agentId, newStatus) {
  try {
    // Map AOS task status → citizen status
    const statusMap = {
      running:   'working',
      pending:   'thinking',
      completed: 'completed',
      failed:    'failed',
    };
    const citizenStatus = statusMap[newStatus] || 'idle';

    const { rows } = await pool.query(
      `UPDATE citizens SET status=$1, updated_at=NOW() WHERE agent_id=$2 RETURNING *`,
      [citizenStatus, agentId]
    );
    for (const c of rows) {
      broadcastCitizenUpdate(wss, c);
      broadcastEvent(wss, c.world_id, 'status_change', c.id, `${c.name} is now ${citizenStatus}`);
    }
  } catch {}
}

// ─── WebSocket server ──────────────────────────────────────────────────────────
function createWorldWebSocket(httpServer, pool) {
  const wss = new WebSocket.Server({ server: httpServer, path: '/ws/world' });

  // Simulation loops per world (worldId → intervalId)
  const simLoops = new Map();

  function ensureSimLoop(worldId) {
    if (!simLoops.has(worldId)) {
      const iv = setInterval(() => {
        // Only simulate if someone is connected to this world
        let hasClient = false;
        wss.clients.forEach(c => { if (c.worldId === worldId && c.readyState === WebSocket.OPEN) hasClient = true; });
        if (hasClient) simulateWorld(pool, wss, worldId);
        else { clearInterval(iv); simLoops.delete(worldId); }
      }, SIM_INTERVAL);
      simLoops.set(worldId, iv);
    }
  }

  wss.on('connection', (ws, req) => {
    ws.worldId  = null;
    ws.isAlive  = true;

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'subscribe' && msg.world_id) {
          ws.worldId = parseInt(msg.world_id);

          // Send full world state
          const [distR, bldR, citR] = await Promise.all([
            pool.query('SELECT * FROM districts WHERE world_id=$1', [ws.worldId]),
            pool.query('SELECT * FROM buildings WHERE world_id=$1', [ws.worldId]),
            pool.query(`SELECT c.*, a.model FROM citizens c LEFT JOIN aos_agents a ON a.id=c.agent_id WHERE c.world_id=$1`, [ws.worldId]),
          ]);

          ws.send(JSON.stringify({
            type:      'world_state',
            world_id:  ws.worldId,
            districts: distR.rows,
            buildings: bldR.rows,
            citizens:  citR.rows,
          }));

          ensureSimLoop(ws.worldId);
        }

        if (msg.type === 'pong') { ws.isAlive = true; }

        if (msg.type === 'set_citizen_status' && msg.citizen_id && msg.status) {
          await pool.query('UPDATE citizens SET status=$1 WHERE id=$2', [msg.status, msg.citizen_id]);
          const { rows } = await pool.query('SELECT * FROM citizens WHERE id=$1', [msg.citizen_id]);
          if (rows[0]) broadcastCitizenUpdate(wss, rows[0]);
        }

      } catch {}
    });

    ws.on('close', () => { ws.worldId = null; });
    ws.on('error', () => {});
  });

  // Ping-pong keepalive
  const pingInterval = setInterval(() => {
    wss.clients.forEach(ws => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, WS_PING_INT);

  wss.on('close', () => clearInterval(pingInterval));

  console.log('✅ World Engine WebSocket ready at /ws/world');
  return { wss, onAgentStatusChange: (agentId, status) => onAgentStatusChange(pool, wss, agentId, status) };
}

module.exports = { initWorldTables, registerWorldRoutes, createWorldWebSocket, enrollAgentAsCitizen };
