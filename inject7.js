/* ═══════════════════════════════════════════════════════════════════════════
   INJECT 7 — AI AGENT MODE: 30-DAY CONTENT PLAN GENERATOR
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  /* ── CSS ────────────────────────────────────────────────────────────────── */
  const style = document.createElement('style');
  style.textContent = `
    /* ── Modal overlay ── */
    #agentmode-modal {
      position: fixed; inset: 0; z-index: 9500;
      display: none; align-items: center; justify-content: center;
      background: rgba(0,0,8,.92); backdrop-filter: blur(14px);
    }
    #agentmode-modal.show { display: flex; }

    /* ── Modal box ── */
    #agentmode-box {
      width: min(1100px, 97vw);
      max-height: 93vh;
      overflow-y: auto;
      background: linear-gradient(160deg, rgba(0,5,20,.98) 0%, rgba(0,2,15,.98) 100%);
      border: 1px solid rgba(255,80,200,.25);
      border-top: 2px solid #ff50c8;
      box-shadow: 0 0 60px rgba(255,80,200,.2), 0 0 120px rgba(100,0,255,.15), inset 0 0 40px rgba(255,80,200,.03);
      font-family: 'Share Tech Mono', monospace;
      position: relative;
    }
    #agentmode-box::-webkit-scrollbar { width: 4px; }
    #agentmode-box::-webkit-scrollbar-thumb { background: rgba(255,80,200,.3); border-radius: 2px; }

    /* ── Header ── */
    #agentmode-header {
      padding: 24px 28px 20px;
      border-bottom: 1px solid rgba(255,80,200,.15);
      display: flex; align-items: center; gap: 16px;
      background: linear-gradient(90deg, rgba(255,80,200,.05) 0%, transparent 60%);
    }
    #agentmode-icon {
      font-size: 36px;
      filter: drop-shadow(0 0 12px #ff50c8);
      animation: agentmode-pulse 2s ease-in-out infinite;
    }
    @keyframes agentmode-pulse {
      0%,100% { transform: scale(1); filter: drop-shadow(0 0 12px #ff50c8); }
      50% { transform: scale(1.08); filter: drop-shadow(0 0 22px #ff80e0) drop-shadow(0 0 40px #8800ff); }
    }
    #agentmode-title-wrap { flex: 1; }
    #agentmode-title {
      font-family: 'Orbitron', sans-serif;
      font-size: 18px; font-weight: 900;
      color: #ff50c8; letter-spacing: 4px;
      text-shadow: 0 0 20px #ff50c8;
    }
    #agentmode-subtitle { font-size: 9px; color: rgba(255,80,200,.5); letter-spacing: 3px; margin-top: 4px; }
    #agentmode-close {
      background: none; border: 1px solid rgba(255,80,200,.3);
      color: rgba(255,80,200,.7); font-size: 18px; cursor: pointer;
      width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
      transition: all .2s;
    }
    #agentmode-close:hover { background: rgba(255,80,200,.1); color: #ff50c8; border-color: #ff50c8; }

    /* ── Form section ── */
    #agentmode-form-section {
      padding: 24px 28px;
      border-bottom: 1px solid rgba(255,80,200,.1);
    }
    .am-form-grid {
      display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 14px; align-items: end;
    }
    .am-field-label {
      font-size: 9px; letter-spacing: 2px; color: rgba(255,80,200,.6); margin-bottom: 6px;
    }
    .am-input, .am-select {
      width: 100%; padding: 10px 14px;
      background: rgba(0,5,20,.8);
      border: 1px solid rgba(255,80,200,.25);
      color: #e0d0ff; font-family: 'Share Tech Mono', monospace;
      font-size: 12px; outline: none;
      transition: border-color .2s, box-shadow .2s;
    }
    .am-input:focus, .am-select:focus {
      border-color: #ff50c8;
      box-shadow: 0 0 12px rgba(255,80,200,.2);
    }
    .am-select option { background: #000a20; }

    /* ── Generate button ── */
    #agentmode-gen-btn {
      width: 100%; padding: 14px;
      background: linear-gradient(135deg, #8800ff 0%, #ff50c8 50%, #ff8800 100%);
      background-size: 200% 200%;
      animation: agentmode-gradient 3s ease infinite;
      border: none; color: #fff;
      font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 900;
      letter-spacing: 3px; cursor: pointer;
      transition: transform .15s, box-shadow .2s;
      box-shadow: 0 0 30px rgba(255,80,200,.3), 0 0 60px rgba(136,0,255,.2);
      margin-top: 18px;
      position: relative; overflow: hidden;
    }
    @keyframes agentmode-gradient {
      0%,100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    #agentmode-gen-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 40px rgba(255,80,200,.5), 0 0 80px rgba(136,0,255,.3);
    }
    #agentmode-gen-btn:disabled {
      opacity: .7; cursor: not-allowed; transform: none;
    }
    #agentmode-gen-btn .btn-spinner {
      display: none; width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
      border-radius: 50%; animation: spin .7s linear infinite;
      margin-right: 10px; flex-shrink: 0;
    }
    #agentmode-gen-btn.loading .btn-spinner { display: inline-block; }
    #agentmode-gen-btn.loading { display: flex; align-items: center; justify-content: center; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Loading state ── */
    #agentmode-loading {
      display: none; padding: 40px;
      text-align: center;
    }
    #agentmode-loading.show { display: block; }
    .am-loading-orb {
      width: 80px; height: 80px; margin: 0 auto 20px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #ff50c8, #8800ff);
      animation: am-orb-spin 2s linear infinite, am-orb-glow 1.5s ease-in-out infinite alternate;
      box-shadow: 0 0 30px #ff50c8, 0 0 60px #8800ff;
    }
    @keyframes am-orb-spin { to { transform: rotate(360deg); } }
    @keyframes am-orb-glow {
      from { box-shadow: 0 0 20px #ff50c8, 0 0 40px #8800ff; }
      to   { box-shadow: 0 0 50px #ff50c8, 0 0 100px #8800ff, 0 0 150px rgba(255,80,200,.3); }
    }
    .am-loading-text {
      font-family: 'Orbitron', sans-serif; font-size: 13px; color: #ff50c8;
      letter-spacing: 3px; text-shadow: 0 0 10px #ff50c8;
    }
    .am-loading-sub { font-size: 9px; color: rgba(255,80,200,.5); letter-spacing: 2px; margin-top: 8px; }
    .am-loading-progress {
      width: 300px; max-width: 80%; height: 3px;
      background: rgba(255,80,200,.1); margin: 18px auto 0; border-radius: 2px; overflow: hidden;
    }
    .am-loading-bar {
      height: 100%; background: linear-gradient(90deg, #8800ff, #ff50c8, #ff8800);
      background-size: 200%;
      animation: am-bar-move 1.5s linear infinite;
    }
    @keyframes am-bar-move { 0% { width: 0%; } 80% { width: 90%; } 100% { width: 95%; } }

    /* ── Results section ── */
    #agentmode-results { display: none; padding: 24px 28px; }
    #agentmode-results.show { display: block; }

    /* ── Plan overview ── */
    .am-overview {
      padding: 18px 22px; margin-bottom: 22px;
      background: rgba(255,80,200,.04); border: 1px solid rgba(255,80,200,.15);
      border-left: 3px solid #ff50c8;
    }
    .am-overview-title {
      font-family: 'Orbitron', sans-serif; font-size: 15px; font-weight: 900;
      color: #ff50c8; letter-spacing: 2px; margin-bottom: 8px;
      text-shadow: 0 0 10px rgba(255,80,200,.5);
    }
    .am-overview-text { font-size: 11px; color: rgba(220,180,255,.8); line-height: 1.7; }
    .am-pillars { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .am-pillar-tag {
      padding: 4px 10px; font-size: 9px; letter-spacing: 1px;
      background: rgba(136,0,255,.15); border: 1px solid rgba(136,0,255,.3); color: #bb88ff;
    }

    /* ── Week tabs ── */
    .am-week-tabs { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
    .am-week-tab {
      padding: 7px 16px; font-size: 9px; letter-spacing: 2px;
      background: rgba(255,80,200,.05); border: 1px solid rgba(255,80,200,.2);
      color: rgba(255,80,200,.6); cursor: pointer; transition: all .2s; font-family: 'Share Tech Mono', monospace;
    }
    .am-week-tab:hover, .am-week-tab.active {
      background: rgba(255,80,200,.15); border-color: #ff50c8; color: #ff50c8;
      box-shadow: 0 0 12px rgba(255,80,200,.2);
    }

    /* ── Week info bar ── */
    .am-week-info {
      padding: 12px 18px; margin-bottom: 16px;
      background: rgba(136,0,255,.06); border: 1px solid rgba(136,0,255,.2);
      display: flex; align-items: center; gap: 14px;
    }
    .am-week-num {
      font-family: 'Orbitron', sans-serif; font-size: 22px; font-weight: 900;
      color: #8800ff; text-shadow: 0 0 20px #8800ff; flex-shrink: 0;
    }
    .am-week-theme { font-size: 12px; color: #d0b0ff; font-weight: bold; }
    .am-week-goal { font-size: 10px; color: rgba(200,160,255,.6); margin-top: 2px; }

    /* ── Day cards grid ── */
    .am-days-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px;
    }

    /* ── Day card ── */
    .am-day-card {
      background: rgba(0,5,20,.7); border: 1px solid rgba(255,80,200,.12);
      transition: border-color .2s, box-shadow .2s, transform .2s;
      position: relative; overflow: hidden;
    }
    .am-day-card:hover {
      border-color: rgba(255,80,200,.4);
      box-shadow: 0 0 20px rgba(255,80,200,.1);
      transform: translateY(-1px);
    }
    .am-day-card-header {
      padding: 10px 14px 8px;
      display: flex; align-items: center; gap: 10px;
      border-bottom: 1px solid rgba(255,80,200,.08);
      background: linear-gradient(90deg, rgba(255,80,200,.06) 0%, transparent);
    }
    .am-day-num {
      font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 900;
      color: #ff50c8; text-shadow: 0 0 10px rgba(255,80,200,.5);
      flex-shrink: 0; min-width: 32px;
    }
    .am-day-meta { flex: 1; min-width: 0; }
    .am-day-type {
      font-size: 8px; letter-spacing: 2px; padding: 2px 7px;
      background: rgba(255,80,200,.12); border: 1px solid rgba(255,80,200,.2);
      color: #ff80d8; display: inline-block; margin-bottom: 3px;
    }
    .am-day-title { font-size: 10px; color: #e0d0ff; line-height: 1.3; font-weight: bold; }
    .am-day-body { padding: 10px 14px; }
    .am-day-hook {
      font-size: 10px; color: #ffdd88; font-style: italic; margin-bottom: 8px;
      padding-left: 8px; border-left: 2px solid #ffaa00;
    }
    .am-day-caption {
      font-size: 9.5px; color: rgba(200,180,255,.7); line-height: 1.6;
      margin-bottom: 8px; max-height: 54px; overflow: hidden;
      position: relative;
    }
    .am-day-hashtags {
      display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;
    }
    .am-hashtag {
      font-size: 8px; padding: 2px 6px;
      background: rgba(136,0,255,.12); border: 1px solid rgba(136,0,255,.25);
      color: #aa77ff;
    }
    .am-day-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 14px; border-top: 1px solid rgba(255,80,200,.06);
      background: rgba(0,0,10,.3);
    }
    .am-day-time { font-size: 9px; color: rgba(255,80,200,.5); letter-spacing: 1px; }
    .am-day-cta { font-size: 8px; color: #00ffaa; letter-spacing: 1px; }
    .am-day-copy {
      background: none; border: 1px solid rgba(255,80,200,.2); color: rgba(255,80,200,.5);
      font-size: 9px; padding: 3px 8px; cursor: pointer; transition: all .2s;
      font-family: 'Share Tech Mono', monospace;
    }
    .am-day-copy:hover { border-color: #ff50c8; color: #ff50c8; background: rgba(255,80,200,.08); }

    /* ── Action bar ── */
    .am-action-bar {
      display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;
      padding: 18px 28px;
      border-top: 1px solid rgba(255,80,200,.12);
      background: rgba(0,0,8,.5);
      position: sticky; bottom: 0;
    }
    .am-action-btn {
      padding: 9px 18px; font-size: 10px; letter-spacing: 2px;
      cursor: pointer; transition: all .2s; font-family: 'Share Tech Mono', monospace;
      border: none;
    }
    .am-action-btn.primary {
      background: linear-gradient(135deg, #8800ff, #ff50c8);
      color: #fff;
      box-shadow: 0 0 20px rgba(255,80,200,.3);
    }
    .am-action-btn.primary:hover { box-shadow: 0 0 35px rgba(255,80,200,.5); transform: translateY(-1px); }
    .am-action-btn.secondary {
      background: transparent; border: 1px solid rgba(255,80,200,.3); color: rgba(255,80,200,.7);
    }
    .am-action-btn.secondary:hover { border-color: #ff50c8; color: #ff50c8; background: rgba(255,80,200,.05); }
    .am-action-btn.gold {
      background: linear-gradient(135deg, #aa6600, #ffaa00);
      color: #fff;
      box-shadow: 0 0 20px rgba(255,170,0,.3);
    }
    .am-action-btn.gold:hover { box-shadow: 0 0 35px rgba(255,170,0,.5); transform: translateY(-1px); }

    /* ── KPIs ── */
    .am-kpi-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; }
    .am-kpi {
      padding: 8px 14px; font-size: 9px; letter-spacing: 1px;
      background: rgba(0,255,170,.04); border: 1px solid rgba(0,255,170,.15); color: #00ffaa;
    }

    /* ── Responsive ── */
    @media (max-width: 700px) {
      .am-form-grid { grid-template-columns: 1fr 1fr; }
      .am-days-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 480px) {
      .am-form-grid { grid-template-columns: 1fr; }
      #agentmode-header { padding: 18px; }
      #agentmode-form-section { padding: 18px; }
    }
  `;
  document.head.appendChild(style);

  /* ── HTML ───────────────────────────────────────────────────────────────── */
  const html = `
  <div id="agentmode-modal">
    <div id="agentmode-box">

      <!-- Header -->
      <div id="agentmode-header">
        <div id="agentmode-icon">🤖</div>
        <div id="agentmode-title-wrap">
          <div id="agentmode-title">AI AGENT MODE</div>
          <div id="agentmode-subtitle">⚡ TẠO TOÀN BỘ CONTENT PLAN 30 NGÀY CHỈ VỚI 1 NÚT</div>
        </div>
        <button id="agentmode-close" onclick="closeAgentMode()">✕</button>
      </div>

      <!-- Form -->
      <div id="agentmode-form-section">
        <div class="am-form-grid">
          <div>
            <div class="am-field-label">🎯 CHỦ ĐỀ / NICHE CỦA BẠN *</div>
            <input id="am-niche" class="am-input" placeholder="Ví dụ: Ẩm thực Việt Nam, Tài chính cá nhân, Gym & Fitness..." />
          </div>
          <div>
            <div class="am-field-label">📱 NỀN TẢNG</div>
            <select id="am-platform" class="am-select">
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">X / Twitter</option>
            </select>
          </div>
          <div>
            <div class="am-field-label">🎨 PHONG CÁCH</div>
            <select id="am-style" class="am-select">
              <option value="educational">Giáo dục</option>
              <option value="entertaining">Giải trí</option>
              <option value="storytelling">Kể chuyện</option>
              <option value="promotional">Quảng bá</option>
              <option value="motivational">Truyền cảm hứng</option>
            </select>
          </div>
          <div>
            <div class="am-field-label">🌐 NGÔN NGỮ</div>
            <select id="am-language" class="am-select">
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        <button id="agentmode-gen-btn" onclick="generateContentPlan()">
          <span class="btn-spinner"></span>
          <span class="btn-label">⚡ KÍCH HOẠT AI AGENT — TẠO CONTENT PLAN 30 NGÀY</span>
        </button>
      </div>

      <!-- Loading -->
      <div id="agentmode-loading">
        <div class="am-loading-orb"></div>
        <div class="am-loading-text">AI ĐANG VẬN HÀNH</div>
        <div class="am-loading-sub">ĐANG PHÂN TÍCH NICHE VÀ TẠO 30 NGÀY CONTENT...</div>
        <div class="am-loading-progress"><div class="am-loading-bar"></div></div>
      </div>

      <!-- Results -->
      <div id="agentmode-results">
        <div class="am-overview" id="am-overview-box">
          <div class="am-overview-title" id="am-plan-title"></div>
          <div class="am-overview-text" id="am-plan-overview"></div>
          <div class="am-pillars" id="am-pillars"></div>
          <div class="am-kpi-row" id="am-kpis"></div>
        </div>
        <div class="am-week-tabs" id="am-week-tabs"></div>
        <div class="am-week-info" id="am-week-info"></div>
        <div class="am-days-grid" id="am-days-grid"></div>
      </div>

      <!-- Action bar -->
      <div class="am-action-bar" id="am-action-bar" style="display:none;">
        <button class="am-action-btn secondary" onclick="generateContentPlan()">🔄 TẠO LẠI</button>
        <button class="am-action-btn secondary" onclick="amExportTxt()">📋 COPY TẤT CẢ</button>
        <button class="am-action-btn gold" onclick="amSaveToVault()">🏛️ LƯU VÀO KHO TÀNG</button>
        <button class="am-action-btn primary" onclick="closeAgentMode()">✔ HOÀN TẤT</button>
      </div>

    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  /* ── State ─────────────────────────────────────────────────────────────── */
  let _currentPlan = null;
  let _activeWeek  = 1;

  /* ── Open / Close ───────────────────────────────────────────────────────── */
  window.openAgentMode = function () {
    document.getElementById('agentmode-modal').classList.add('show');
    document.body.style.overflow = 'hidden';
  };
  window.closeAgentMode = function () {
    document.getElementById('agentmode-modal').classList.remove('show');
    document.body.style.overflow = '';
  };

  // Close on backdrop click
  document.getElementById('agentmode-modal').addEventListener('click', function (e) {
    if (e.target === this) closeAgentMode();
  });

  /* ── Generate ───────────────────────────────────────────────────────────── */
  window.generateContentPlan = async function () {
    const niche    = document.getElementById('am-niche').value.trim();
    const platform = document.getElementById('am-platform').value;
    const style    = document.getElementById('am-style').value;
    const language = document.getElementById('am-language').value;

    if (!niche) {
      document.getElementById('am-niche').focus();
      if (typeof showToast === 'function') showToast('⚠ Vui lòng nhập chủ đề/niche của bạn!', 'error');
      return;
    }

    // UI state: loading
    const btn = document.getElementById('agentmode-gen-btn');
    btn.disabled = true;
    btn.classList.add('loading');
    btn.querySelector('.btn-label').textContent = 'AI ĐANG VẬN HÀNH...';

    document.getElementById('agentmode-loading').classList.add('show');
    document.getElementById('agentmode-results').classList.remove('show');
    document.getElementById('am-action-bar').style.display = 'none';

    try {
      const res = await fetch('/api/agent-mode/content-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, platform, style, language })
      });
      const data = await res.json();
      if (!res.ok || !data.plan) throw new Error(data.error || 'Lỗi không xác định');

      _currentPlan = data.plan;
      _activeWeek  = 1;
      renderPlan(data.plan);

    } catch (err) {
      if (typeof showToast === 'function') showToast('❌ ' + err.message, 'error');
      console.error('AgentMode error:', err);
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
      btn.querySelector('.btn-label').textContent = '⚡ KÍCH HOẠT AI AGENT — TẠO CONTENT PLAN 30 NGÀY';
      document.getElementById('agentmode-loading').classList.remove('show');
    }
  };

  /* ── Render plan ────────────────────────────────────────────────────────── */
  function renderPlan(plan) {
    // Overview
    document.getElementById('am-plan-title').textContent = plan.plan_title || 'CONTENT PLAN 30 NGÀY';
    document.getElementById('am-plan-overview').textContent = plan.overview || '';

    const pillarsEl = document.getElementById('am-pillars');
    pillarsEl.innerHTML = (plan.content_pillars || []).map(p =>
      `<span class="am-pillar-tag">▸ ${p}</span>`
    ).join('');

    const kpisEl = document.getElementById('am-kpis');
    kpisEl.innerHTML = (plan.kpis || []).map(k =>
      `<span class="am-kpi">✓ ${k}</span>`
    ).join('');

    // Week tabs
    const weeks = plan.weeks || [1,2,3,4].map(w => ({ week: w, theme: `Tuần ${w}`, goal: '' }));
    const tabsEl = document.getElementById('am-week-tabs');
    tabsEl.innerHTML = weeks.map(w =>
      `<button class="am-week-tab ${w.week === _activeWeek ? 'active' : ''}"
        onclick="amSelectWeek(${w.week})"
        data-week="${w.week}">
        TUẦN ${w.week} ${w.theme ? '— ' + w.theme : ''}
      </button>`
    ).join('');

    renderWeek(_activeWeek, plan);

    // Show
    document.getElementById('agentmode-results').classList.add('show');
    document.getElementById('am-action-bar').style.display = 'flex';
  }

  window.amSelectWeek = function (weekNum) {
    _activeWeek = weekNum;
    document.querySelectorAll('.am-week-tab').forEach(t => {
      t.classList.toggle('active', parseInt(t.dataset.week) === weekNum);
    });
    if (_currentPlan) renderWeek(weekNum, _currentPlan);
  };

  function renderWeek(weekNum, plan) {
    const weeks = plan.weeks || [];
    const weekData = weeks.find(w => w.week === weekNum) || { week: weekNum, theme: `Tuần ${weekNum}`, goal: '' };
    const days = (plan.days || []).filter(d => d.week === weekNum);

    document.getElementById('am-week-info').innerHTML = `
      <div class="am-week-num">W${weekNum}</div>
      <div>
        <div class="am-week-theme">${weekData.theme || 'TUẦN ' + weekNum}</div>
        ${weekData.goal ? `<div class="am-week-goal">🎯 ${weekData.goal}</div>` : ''}
      </div>
    `;

    const typeColors = {
      'Video': '#ff50c8', 'Carousel': '#8800ff', 'Reel': '#ff8800',
      'Post': '#00ccff', 'Thread': '#00ffaa', 'Story': '#ffdd00',
      'Livestream': '#ff4455', 'Poll': '#88ffcc', 'Tutorial': '#ffaa44',
    };

    const grid = document.getElementById('am-days-grid');
    if (!days.length) {
      grid.innerHTML = `<div style="color:rgba(255,80,200,.4);font-size:11px;padding:20px;grid-column:1/-1;">Không có dữ liệu cho tuần này.</div>`;
      return;
    }

    grid.innerHTML = days.map(d => {
      const typeKey = (d.content_type || '').split('/')[0].trim();
      const typeColor = typeColors[typeKey] || '#ff50c8';
      const hashtags = (d.hashtags || []).slice(0, 5).map(h =>
        `<span class="am-hashtag">${h}</span>`
      ).join('');

      return `
        <div class="am-day-card">
          <div class="am-day-card-header">
            <div class="am-day-num" style="color:${typeColor};text-shadow:0 0 10px ${typeColor}88;">
              D${String(d.day).padStart(2,'0')}
            </div>
            <div class="am-day-meta">
              <div class="am-day-type" style="background:${typeColor}18;border-color:${typeColor}44;color:${typeColor};">
                ${d.content_type || 'POST'}
              </div>
              <div class="am-day-title">${escHtml(d.title || '')}</div>
            </div>
          </div>
          <div class="am-day-body">
            ${d.hook ? `<div class="am-day-hook">"${escHtml(d.hook)}"</div>` : ''}
            <div class="am-day-caption">${escHtml(d.caption || '')}</div>
            ${hashtags ? `<div class="am-day-hashtags">${hashtags}</div>` : ''}
            ${d.tip ? `<div style="font-size:9px;color:rgba(0,255,170,.5);margin-top:4px;">💡 ${escHtml(d.tip)}</div>` : ''}
          </div>
          <div class="am-day-footer">
            <span class="am-day-time">⏰ ${d.best_time || '--:--'}</span>
            <span class="am-day-cta">${d.cta ? '→ ' + escHtml(d.cta).slice(0,30) : ''}</span>
            <button class="am-day-copy" onclick="amCopyDay(${d.day})">COPY</button>
          </div>
        </div>`;
    }).join('');
  }

  /* ── Copy single day ─────────────────────────────────────────────────────── */
  window.amCopyDay = function (dayNum) {
    if (!_currentPlan) return;
    const d = (_currentPlan.days || []).find(x => x.day === dayNum);
    if (!d) return;
    const text = [
      `📅 NGÀY ${d.day} — ${d.content_type}`,
      `📌 ${d.title}`,
      d.hook ? `🎣 Hook: "${d.hook}"` : '',
      ``,
      `📝 Caption:`,
      d.caption,
      ``,
      d.hashtags ? d.hashtags.join(' ') : '',
      d.cta ? `🔥 CTA: ${d.cta}` : '',
      d.best_time ? `⏰ Giờ đăng: ${d.best_time}` : '',
      d.tip ? `💡 Tip: ${d.tip}` : '',
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      if (typeof showToast === 'function') showToast(`✓ Đã copy nội dung Ngày ${dayNum}`, 'success');
    });
  };

  /* ── Export all as text ──────────────────────────────────────────────────── */
  window.amExportTxt = function () {
    if (!_currentPlan) return;
    const plan = _currentPlan;
    let out = `╔══════════════════════════════════════════════════════╗\n`;
    out += `║  ${(plan.plan_title || 'CONTENT PLAN 30 NGÀY').toUpperCase().slice(0,50).padEnd(50)}  ║\n`;
    out += `╚══════════════════════════════════════════════════════╝\n\n`;
    out += `📋 TỔNG QUAN CHIẾN LƯỢC:\n${plan.overview || ''}\n\n`;
    if (plan.content_pillars?.length)
      out += `🏛️ TRỤ CỘT NỘI DUNG: ${plan.content_pillars.join(' | ')}\n\n`;

    (plan.days || []).forEach(d => {
      out += `${'─'.repeat(60)}\n`;
      out += `📅 NGÀY ${d.day} (Tuần ${d.week}) — ${d.content_type}\n`;
      out += `📌 ${d.title}\n`;
      if (d.hook) out += `🎣 Hook: "${d.hook}"\n`;
      out += `\n📝 Caption:\n${d.caption}\n\n`;
      if (d.hashtags?.length) out += `${d.hashtags.join(' ')}\n`;
      if (d.cta) out += `🔥 CTA: ${d.cta}\n`;
      if (d.best_time) out += `⏰ Giờ đăng: ${d.best_time}\n`;
      if (d.tip) out += `💡 Tip: ${d.tip}\n`;
      out += `\n`;
    });

    navigator.clipboard.writeText(out).then(() => {
      if (typeof showToast === 'function') showToast('✓ Đã copy toàn bộ 30 ngày content!', 'success');
    });
  };

  /* ── Save to Vault ───────────────────────────────────────────────────────── */
  window.amSaveToVault = async function () {
    if (!_currentPlan) return;
    const plan = _currentPlan;
    let content = `${plan.plan_title}\n\n${plan.overview || ''}\n\n`;
    content += `CONTENT PILLARS: ${(plan.content_pillars || []).join(' | ')}\n\n`;
    (plan.days || []).slice(0, 30).forEach(d => {
      content += `NGÀY ${d.day} [${d.content_type}]: ${d.title}\n`;
      content += `Hook: ${d.hook || '-'}\n`;
      content += `Caption: ${(d.caption || '').slice(0, 120)}...\n`;
      content += `Hashtags: ${(d.hashtags || []).join(' ')}\n`;
      content += `CTA: ${d.cta || '-'} | Giờ: ${d.best_time || '-'}\n\n`;
    });

    try {
      const vaultItem = {
        id: 'agentmode_' + Date.now(),
        title: plan.plan_title || 'Content Plan 30 Ngày',
        content,
        type: '🤖 AI Agent Mode',
        agent_id: null,
        agent_name: 'AI Agent Mode',
        agent_emoji: '🤖',
        agent_color: '#ff50c8',
        ts: Date.now(),
      };

      // Try DB save
      const res = await fetch('/api/db/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vaultItem),
      });

      if (res.ok) {
        if (typeof showToast === 'function') showToast('🏛️ Đã lưu Content Plan vào Kho Tàng!', 'success');
        if (typeof loadVaultItems === 'function') loadVaultItems();
      } else {
        // Fallback: local vault
        const local = JSON.parse(localStorage.getItem('vault_items') || '[]');
        local.unshift(vaultItem);
        localStorage.setItem('vault_items', JSON.stringify(local.slice(0, 200)));
        if (typeof showToast === 'function') showToast('🏛️ Đã lưu vào Kho Tàng (local)!', 'success');
      }
    } catch (e) {
      if (typeof showToast === 'function') showToast('❌ Lỗi lưu vault: ' + e.message, 'error');
    }
  };

  /* ── Escape HTML helper ─────────────────────────────────────────────────── */
  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Keyboard shortcut: P ───────────────────────────────────────────────── */
  document.addEventListener('keydown', e => {
    if (e.key === 'p' || e.key === 'P') {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
      const m = document.getElementById('agentmode-modal');
      if (m.classList.contains('show')) closeAgentMode();
      else openAgentMode();
    }
  });

  console.log('[AgentMode] ✅ AI Agent Mode loaded');
})();
