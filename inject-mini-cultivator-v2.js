const fs = require('fs');
let html = fs.readFileSync('tienhiepv3.html', 'utf-8');

// ═══════════════════════════════════════════════════════════════════
// CSS — Cultivator V2 (bold, flat-icon style for HUD workflow)
// ═══════════════════════════════════════════════════════════════════
const css = `
    /* ══════════════════════════════════════════════════════
       ĐẠO NHÂN — Workflow Cultivator (V2)
       ══════════════════════════════════════════════════════ */

    /* Container – placed inside #workflow-container via JS */
    #daonhan-wrap {
      position: absolute;
      left: 10%;
      top: 50%;
      transform: translateY(-50%);
      width: 72px;
      z-index: 30;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    /* Label */
    #daonhan-label {
      font-family: 'Share Tech Mono', monospace;
      font-size: 8px;
      color: rgba(160,100,255,0.7);
      letter-spacing: 1.5px;
      text-align: center;
      white-space: nowrap;
    }

    /* SVG character */
    #daonhan-svg {
      width: 72px;
      height: 96px;
      overflow: visible;
      filter: drop-shadow(0 0 6px rgba(140,80,255,0.5));
      transition: filter 0.3s ease;
    }

    /* Throw arm — CSS-controlled rotation */
    #dn-arm-throw {
      transform-origin: 44px 40px;
      transform: rotate(0deg);
      transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
    }
    #dn-arm-balance {
      transform-origin: 28px 40px;
      transition: transform 0.35s ease;
    }

    /* Qi orb on hand (hidden in idle, glows when ready) */
    #dn-qi-orb {
      opacity: 0;
      transform-origin: 55px 55px;
      transform: scale(0);
      transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }

    /* Body lean */
    #dn-body-group {
      transform-origin: 36px 80px;
      transition: transform 0.25s ease;
    }

    /* ── States ── */
    /* IDLE — gentle float */
    #daonhan-wrap {
      animation: dn-idle-float 3.2s ease-in-out infinite;
    }

    /* READY — arm raises, qi orb appears */
    #daonhan-wrap.dn-ready #dn-arm-throw {
      transform: rotate(-105deg);
    }
    #daonhan-wrap.dn-ready #dn-arm-balance {
      transform: rotate(20deg);
    }
    #daonhan-wrap.dn-ready #dn-qi-orb {
      opacity: 1;
      transform: scale(1);
      animation: dn-orb-pulse 0.7s ease-in-out infinite alternate;
    }
    #daonhan-wrap.dn-ready #daonhan-svg {
      filter: drop-shadow(0 0 12px rgba(255,140,40,0.8));
    }

    /* THROW — arm sweeps, body leans forward */
    #daonhan-wrap.dn-throw {
      animation: dn-throw-lean 0.45s cubic-bezier(0.25,0.46,0.45,0.94) forwards;
    }
    #daonhan-wrap.dn-throw #dn-arm-throw {
      transform: rotate(55deg);
      transition: transform 0.18s cubic-bezier(0.22,1,0.36,1);
    }
    #daonhan-wrap.dn-throw #dn-arm-balance {
      transform: rotate(-25deg);
      transition: transform 0.18s ease;
    }
    #daonhan-wrap.dn-throw #dn-qi-orb {
      opacity: 0;
      transform: scale(2.5);
      transition: opacity 0.15s ease, transform 0.15s ease;
    }

    /* CELEBRATE — bounce after workflow done */
    #daonhan-wrap.dn-celebrate {
      animation: dn-celebrate 0.8s cubic-bezier(0.34,1.56,0.64,1);
    }
    #daonhan-wrap.dn-celebrate #daonhan-svg {
      filter: drop-shadow(0 0 18px rgba(255,200,60,0.9)) drop-shadow(0 0 8px rgba(255,80,0,0.6));
    }

    /* ── Keyframes ── */
    @keyframes dn-idle-float {
      0%, 100% { transform: translateY(-50%); }
      40%       { transform: translateY(calc(-50% - 7px)); }
      70%       { transform: translateY(calc(-50% - 4px)); }
    }
    @keyframes dn-throw-lean {
      0%   { transform: translateY(-50%) translateX(0)   rotate(0deg); }
      35%  { transform: translateY(-50%) translateX(10px) rotate(8deg); }
      70%  { transform: translateY(-50%) translateX(4px)  rotate(3deg); }
      100% { transform: translateY(-50%) translateX(0)   rotate(0deg); }
    }
    @keyframes dn-celebrate {
      0%   { transform: translateY(-50%) scale(1); }
      20%  { transform: translateY(calc(-50% - 18px)) scale(1.12); }
      50%  { transform: translateY(calc(-50% + 4px)) scale(0.94); }
      70%  { transform: translateY(calc(-50% - 8px)) scale(1.06); }
      100% { transform: translateY(-50%) scale(1); }
    }
    @keyframes dn-orb-pulse {
      from { filter: drop-shadow(0 0 4px rgba(255,160,40,0.8)); }
      to   { filter: drop-shadow(0 0 12px rgba(255,100,0,1)) drop-shadow(0 0 22px rgba(255,60,0,0.5)); }
    }

    /* ── Throw projectile arc ── */
    .dn-projectile {
      position: fixed;
      z-index: 99999;
      pointer-events: none;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      background: radial-gradient(circle, rgba(255,220,80,0.95) 0%, rgba(255,100,0,0.6) 50%, transparent 80%);
      box-shadow: 0 0 12px rgba(255,160,0,0.8), 0 0 24px rgba(255,80,0,0.4);
      transform-origin: center;
    }

    /* X-axis travel (linear) */
    @keyframes dn-proj-x {
      from { transform: translateX(0); }
      to   { transform: translateX(var(--pdx, 200px)); }
    }
    /* Y-axis travel (arc up then down) */
    @keyframes dn-proj-y {
      0%   { transform: translateY(0); }
      38%  { transform: translateY(var(--peak, -70px)); }
      100% { transform: translateY(var(--pdy, 0px)); }
    }
    /* Shrink and fade as it hits furnace */
    @keyframes dn-proj-scale {
      0%   { opacity: 1;   transform: scale(1); }
      75%  { opacity: 0.9; transform: scale(0.9); }
      100% { opacity: 0;   transform: scale(0.1); }
    }

    /* ── Pill result burst ── */
    .dn-pill-burst {
      position: fixed;
      z-index: 99998;
      pointer-events: none;
      font-size: 40px;
      filter: drop-shadow(0 0 20px #ffcc00) drop-shadow(0 0 40px #ff8800);
      animation: dn-pill-burst-anim 1.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
      text-shadow: 0 0 20px #ffcc00, 0 0 40px #ff8800;
    }
    @keyframes dn-pill-burst-anim {
      0%   { transform: translate(-50%,-50%) scale(0) rotate(-180deg); opacity: 0; }
      30%  { transform: translate(-50%,-120%) scale(1.4) rotate(15deg); opacity: 1; }
      60%  { transform: translate(-50%,-110%) scale(1.0) rotate(-5deg); opacity: 1; }
      80%  { transform: translate(-50%,-115%) scale(1.1) rotate(5deg); opacity: 1; }
      100% { transform: translate(-50%,-150%) scale(0.8) rotate(0deg); opacity: 0; }
    }

    /* Glow rings from furnace when pill drops */
    .dn-burst-ring {
      position: fixed;
      z-index: 99997;
      pointer-events: none;
      border-radius: 50%;
      border: 2px solid rgba(255,160,0,0.7);
      box-shadow: 0 0 20px rgba(255,120,0,0.4);
      animation: dn-burst-ring-anim 0.9s ease-out forwards;
    }
    @keyframes dn-burst-ring-anim {
      0%   { transform: translate(-50%,-50%) scale(0);   opacity: 0.9; }
      100% { transform: translate(-50%,-50%) scale(4);   opacity: 0; }
    }
`;

// Inject CSS before </style></head>
html = html.replace(/(<\/style>\s*<\/head>)/, css + '\n  $1');

// ═══════════════════════════════════════════════════════════════════
// JS — Spawn character, MutationObserver, throw animation
// ═══════════════════════════════════════════════════════════════════
const js = `
  <script>
  /* ══ ĐẠO NHÂN V2 — Workflow Cultivator ══ */
  (function() {

    // ── SVG template ──────────────────────────────────────────────
    var CHAR_SVG = \`<svg id="daonhan-svg" viewBox="0 0 72 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="dn-skin" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#ffdea0"/>
      <stop offset="100%" stop-color="#d98c50"/>
    </radialGradient>
    <radialGradient id="dn-robe" cx="50%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#3a1070"/>
      <stop offset="100%" stop-color="#150530"/>
    </radialGradient>
    <radialGradient id="dn-orb-grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fff8aa"/>
      <stop offset="40%" stop-color="#ffaa20"/>
      <stop offset="100%" stop-color="rgba(255,60,0,0)"/>
    </radialGradient>
    <filter id="dn-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Shadow disc -->
  <ellipse cx="36" cy="94" rx="24" ry="5" fill="rgba(80,20,160,0.22)"/>

  <!-- ─── ROBE / BODY ─── -->
  <!-- Outer robe shape -->
  <path d="M23 38 L10 90 L62 90 L49 38 Z" fill="url(#dn-robe)"/>
  <!-- Robe edge glow -->
  <path d="M23 38 L10 90 L62 90 L49 38 Z" fill="none" stroke="rgba(120,60,255,0.55)" stroke-width="1.3"/>
  <!-- Center seam -->
  <line x1="36" y1="38" x2="33" y2="90" stroke="rgba(200,160,255,0.2)" stroke-width="1.2"/>
  <!-- Gold belt -->
  <rect x="20" y="49" width="32" height="5" rx="2.5" fill="#cc9900" opacity="0.85"/>
  <rect x="20" y="49" width="32" height="5" rx="2.5" fill="none" stroke="rgba(255,210,80,0.6)" stroke-width="0.8"/>
  <!-- Belt knot -->
  <ellipse cx="36" cy="51.5" rx="5" ry="3" fill="#ffbb00" opacity="0.75"/>

  <!-- ─── LEFT ARM (balance arm) ─── -->
  <g id="dn-arm-balance">
    <!-- Upper arm -->
    <path d="M24 42 L12 58" stroke="url(#dn-robe)" stroke-width="9" stroke-linecap="round"/>
    <path d="M24 42 L12 58" stroke="rgba(120,60,255,0.4)" stroke-width="8" stroke-linecap="round"/>
    <!-- Lower arm / forearm -->
    <path d="M12 58 L8 70" stroke="url(#dn-robe)" stroke-width="8" stroke-linecap="round"/>
    <path d="M12 58 L8 70" stroke="rgba(100,50,200,0.4)" stroke-width="7" stroke-linecap="round"/>
    <!-- Hand -->
    <circle cx="7" cy="72" r="6" fill="url(#dn-skin)" stroke="rgba(180,110,60,0.7)" stroke-width="1"/>
  </g>

  <!-- ─── RIGHT ARM (throw arm) ─── -->
  <g id="dn-arm-throw">
    <!-- Upper arm -->
    <path d="M48 42 L60 56" stroke="url(#dn-robe)" stroke-width="9" stroke-linecap="round"/>
    <path d="M48 42 L60 56" stroke="rgba(120,60,255,0.4)" stroke-width="8" stroke-linecap="round"/>
    <!-- Lower arm / forearm -->
    <path d="M60 56 L66 67" stroke="url(#dn-robe)" stroke-width="8" stroke-linecap="round"/>
    <path d="M60 56 L66 67" stroke="rgba(100,50,200,0.4)" stroke-width="7" stroke-linecap="round"/>
    <!-- Hand -->
    <circle cx="67" cy="70" r="6" fill="url(#dn-skin)" stroke="rgba(180,110,60,0.7)" stroke-width="1"/>
    <!-- Qi orb (appears when ready to throw) -->
    <g id="dn-qi-orb">
      <circle cx="67" cy="63" r="11" fill="url(#dn-orb-grad)" opacity="0.85"/>
      <circle cx="67" cy="63" r="6"  fill="rgba(255,240,180,0.9)"/>
      <circle cx="64" cy="60" r="2"  fill="rgba(255,255,255,0.8)"/>
      <!-- Orbit ring -->
      <circle cx="67" cy="63" r="13" fill="none" stroke="rgba(255,180,0,0.4)" stroke-width="1" stroke-dasharray="2 4"/>
    </g>
  </g>

  <!-- ─── NECK ─── -->
  <rect x="32" y="33" width="8" height="9" rx="4" fill="url(#dn-skin)"/>

  <!-- ─── HEAD ─── -->
  <circle cx="36" cy="22" r="17" fill="url(#dn-skin)" filter="url(#dn-glow)"/>
  <!-- Head highlight -->
  <ellipse cx="31" cy="17" rx="7" ry="5" fill="rgba(255,255,255,0.14)"/>

  <!-- ─── HAIR ─── -->
  <!-- Main hair mass -->
  <path d="M19 19 Q21 7 36 6 Q51 7 53 19 Q48 13 36 12 Q24 13 19 19 Z" fill="#0e0520"/>
  <!-- Side hair strands -->
  <path d="M19 19 Q17 26 18 32" stroke="#0e0520" stroke-width="4" stroke-linecap="round" fill="none"/>
  <path d="M53 19 Q55 26 54 32" stroke="#0e0520" stroke-width="4" stroke-linecap="round" fill="none"/>

  <!-- ─── TOPKNOT ─── -->
  <ellipse cx="36" cy="6" rx="8" ry="10" fill="#160840"/>
  <ellipse cx="36" cy="4" rx="5" ry="6" fill="#1e0a50"/>
  <!-- Hairpin -->
  <line x1="28" y1="5" x2="44" y2="5" stroke="#ffcc44" stroke-width="2" stroke-linecap="round"/>
  <circle cx="45" cy="5" r="4" fill="#ff9900"/>
  <circle cx="45" cy="5" r="2" fill="#ffcc44"/>
  <!-- Tassel -->
  <line x1="36" y1="-3" x2="33" y2="-9" stroke="rgba(255,150,40,0.7)" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="36" y1="-3" x2="36" y2="-11" stroke="rgba(255,180,60,0.7)" stroke-width="1.2" stroke-linecap="round"/>
  <line x1="36" y1="-3" x2="39" y2="-9" stroke="rgba(255,150,40,0.7)" stroke-width="1.2" stroke-linecap="round"/>
  <circle cx="36" cy="-3" r="2.5" fill="rgba(255,180,60,0.6)"/>

  <!-- ─── FACE ─── -->
  <!-- Eyebrows (expressive) -->
  <path d="M26 17 Q30 15 33 17" stroke="#0e0520" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M39 17 Q42 15 46 17" stroke="#0e0520" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Eyes — big, clear -->
  <ellipse cx="30" cy="23" rx="3.5" ry="4" fill="#0e0520"/>
  <ellipse cx="42" cy="23" rx="3.5" ry="4" fill="#0e0520"/>
  <!-- Iris shimmer -->
  <ellipse cx="30" cy="23" rx="2.2" ry="2.5" fill="#3a1880"/>
  <ellipse cx="42" cy="23" rx="2.2" ry="2.5" fill="#3a1880"/>
  <!-- Pupil shine -->
  <circle cx="31.2" cy="21.8" r="1.3" fill="rgba(255,255,255,0.92)"/>
  <circle cx="43.2" cy="21.8" r="1.3" fill="rgba(255,255,255,0.92)"/>
  <!-- Smile (determined) -->
  <path d="M31 29.5 Q36 33 41 29.5" stroke="#b06a30" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <!-- Cheek blush -->
  <ellipse cx="26" cy="27" rx="4" ry="2.2" fill="rgba(255,120,80,0.22)"/>
  <ellipse cx="46" cy="27" rx="4" ry="2.2" fill="rgba(255,120,80,0.22)"/>
</svg>\`;

    // ── Spawn character into workflow container ───────────────────
    function spawnDaoNhan(container) {
      if (document.getElementById('daonhan-wrap')) return;
      var wrap = document.createElement('div');
      wrap.id = 'daonhan-wrap';
      wrap.innerHTML = CHAR_SVG + '<div id="daonhan-label">ĐẠO NHÂN</div>';
      container.appendChild(wrap);
      // Bounce in
      wrap.style.opacity = '0';
      wrap.style.transform = 'translateY(-50%) translateX(-20px)';
      requestAnimationFrame(function() {
        wrap.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)';
        wrap.style.opacity = '1';
        wrap.style.transform = 'translateY(-50%)';
      });
    }

    function removeDaoNhan() {
      var el = document.getElementById('daonhan-wrap');
      if (el) {
        el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        el.style.opacity = '0';
        el.style.transform = 'translateY(-50%) translateX(-20px)';
        setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
      }
    }

    // ── State management ─────────────────────────────────────────
    var _state = 'idle';
    var _throwTimer = null;

    function setState(s) {
      var wrap = document.getElementById('daonhan-wrap');
      if (!wrap) return;
      _state = s;
      wrap.classList.remove('dn-ready', 'dn-throw', 'dn-celebrate');
      if (s && s !== 'idle') wrap.classList.add('dn-' + s);
    }

    // ── Throw projectile arc ──────────────────────────────────────
    function fireProjectile(herbIcon, herbColor) {
      var wrap  = document.getElementById('daonhan-wrap');
      var furnace = document.querySelector('.ld-furnace');
      if (!wrap || !furnace) return;

      var wRect = wrap.getBoundingClientRect();
      var fRect = furnace.getBoundingClientRect();

      // Hand position (right hand, throw arm tip)
      var handX = wRect.left + wRect.width * 0.92;
      var handY = wRect.top  + wRect.height * 0.42;

      // Furnace center
      var furnX = fRect.left + fRect.width  * 0.5;
      var furnY = fRect.top  + fRect.height * 0.42;

      var dx = furnX - handX;
      var dy = furnY - handY;

      // Arc peak: goes up by 35% of horizontal distance (min 50px)
      var peak = -Math.max(50, Math.abs(dx) * 0.35);

      // Outer div handles X (linear)
      var outerDiv = document.createElement('div');
      outerDiv.style.cssText = [
        'position:fixed',
        'left:' + handX + 'px',
        'top:'  + handY + 'px',
        'width:0',
        'height:0',
        'z-index:99999',
        'pointer-events:none',
        'animation:dn-proj-x 0.48s linear forwards',
      ].join(';');
      outerDiv.style.setProperty('--pdx', dx + 'px');

      // Inner div handles Y (arc)
      var innerDiv = document.createElement('div');
      innerDiv.style.cssText = [
        'position:absolute',
        'transform-origin:center',
        'animation:dn-proj-y 0.48s ease-in forwards',
      ].join(';');
      innerDiv.style.setProperty('--peak', peak + 'px');
      innerDiv.style.setProperty('--pdy',  dy   + 'px');

      // Projectile sphere
      var proj = document.createElement('div');
      proj.className = 'dn-projectile';
      proj.style.animation += ', dn-proj-scale 0.48s ease-in forwards';
      proj.textContent = herbIcon || '🌿';

      innerDiv.appendChild(proj);
      outerDiv.appendChild(innerDiv);
      document.body.appendChild(outerDiv);
      setTimeout(function() { if (outerDiv.parentNode) outerDiv.remove(); }, 520);

      // Furnace absorb flash on landing
      setTimeout(function() {
        var furnEl = document.querySelector('.ld-furnace');
        if (furnEl) {
          furnEl.classList.add('absorb');
          setTimeout(function() { furnEl.classList.remove('absorb'); }, 550);
        }
      }, 460);
    }

    // ── Pill burst on workflow completion ─────────────────────────
    function pillBurst(icon) {
      var furnace = document.querySelector('.ld-furnace');
      if (!furnace) return;
      var fRect = furnace.getBoundingClientRect();
      var cx = fRect.left + fRect.width  * 0.5;
      var cy = fRect.top  + fRect.height * 0.4;

      // Burst rings
      for (var i = 0; i < 3; i++) {
        (function(idx) {
          setTimeout(function() {
            var ring = document.createElement('div');
            var sz = 60 + idx * 20;
            ring.className = 'dn-burst-ring';
            ring.style.cssText = 'left:' + cx + 'px;top:' + cy + 'px;width:' + sz + 'px;height:' + sz + 'px;animation-delay:' + (idx * 0.12) + 's;';
            document.body.appendChild(ring);
            setTimeout(function() { if (ring.parentNode) ring.remove(); }, 1200);
          }, idx * 100);
        })(i);
      }

      // Pill icon
      var pill = document.createElement('div');
      pill.className = 'dn-pill-burst';
      pill.style.cssText = 'left:' + cx + 'px;top:' + cy + 'px;';
      pill.textContent = icon || '💊';
      document.body.appendChild(pill);
      setTimeout(function() { if (pill.parentNode) pill.remove(); }, 1600);
    }

    // ── Watch for throw events (MutationObserver) ─────────────────
    var _observer = null;
    var _herbQueue = [];
    var _throwIdx  = 0;

    function watchContainer(container, workflowData) {
      if (_observer) { _observer.disconnect(); _observer = null; }

      setState('ready');

      // Build herb icon list from workflow data (or fallback)
      _herbQueue = [];
      if (workflowData && workflowData.length) {
        workflowData.forEach(function(d) {
          var icon = '🌿';
          if (d.name && d.name.indexOf('LLM')   >= 0) icon = '🔥';
          if (d.name && d.name.indexOf('Vision') >= 0) icon = '💎';
          if (d.name && d.name.indexOf('Audio')  >= 0) icon = '⚡';
          if (d.name && d.name.indexOf('Filter') >= 0) icon = '⚗️';
          if (d.name && d.name.indexOf('Publish')>= 0) icon = '✨';
          _herbQueue.push(icon);
        });
      }
      _throwIdx = 0;

      _observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(m) {
          if (m.type === 'attributes' && m.attributeName === 'class') {
            var node = m.target;
            if (node.classList && node.classList.contains('ld-fly-in')) {
              var icon = _herbQueue[_throwIdx] || '🌿';
              _throwIdx++;

              // Throw animation sequence
              clearTimeout(_throwTimer);
              setState('throw');
              fireProjectile(icon, null);

              _throwTimer = setTimeout(function() {
                setState('ready');
              }, 550);
            }
            // Detect completion (pill-emerge spawned inside furnace)
            if (node.classList && node.classList.contains('ld-pill-emerge')) {
              setTimeout(function() {
                setState('celebrate');
                pillBurst(node.textContent || '💊');
                setTimeout(function() {
                  setState('idle');
                  removeDaoNhan();
                }, 2200);
              }, 300);
            }
          }
          // Also watch for ld-pill-emerge nodes being added
          if (m.type === 'childList') {
            m.addedNodes.forEach(function(n) {
              if (n.classList && n.classList.contains('ld-pill-emerge')) {
                setTimeout(function() {
                  setState('celebrate');
                  pillBurst(n.textContent || '💊');
                  setTimeout(function() {
                    setState('idle');
                    removeDaoNhan();
                  }, 2200);
                }, 300);
              }
            });
          }
        });
      });

      _observer.observe(container, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
        childList: true
      });
    }

    // ── Patch hudRunWorkflow ──────────────────────────────────────
    function patchHudRunWorkflow() {
      var _orig = window.hudRunWorkflow;
      if (!_orig || _orig._dn_patched) return;

      window.hudRunWorkflow = function(aid) {
        var container = document.getElementById('workflow-container');
        var wfData    = window._wfData && window._wfData[aid] ? window._wfData[aid] : [];

        if (container && wfData.length) {
          spawnDaoNhan(container);
          // Short delay to let character appear, then start watching
          setTimeout(function() { watchContainer(container, wfData); }, 300);
        }

        return _orig.apply(this, arguments);
      };
      window.hudRunWorkflow._dn_patched = true;
    }

    // Attempt patch on DOMContentLoaded (or immediately if already loaded)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(patchHudRunWorkflow, 800);
      });
    } else {
      // hudRunWorkflow might not be defined yet at parse time — retry
      var _patchAttempts = 0;
      var _patchInterval = setInterval(function() {
        _patchAttempts++;
        if (window.hudRunWorkflow) {
          patchHudRunWorkflow();
          clearInterval(_patchInterval);
        }
        if (_patchAttempts > 40) clearInterval(_patchInterval);
      }, 250);
    }

  })();
  </script>
</body>`;

// Inject JS replacing </body>
html = html.replace('</body>', js);

fs.writeFileSync('tienhiepv3.html', html);
console.log('✅ ĐẠO NHÂN V2 injected!');
// Verify
var checks = ['daonhan-wrap', 'dn-arm-throw', 'dn-projectile', 'fireProjectile', 'pillBurst', 'patchHudRunWorkflow'];
checks.forEach(function(c) {
  var n = (require('fs').readFileSync('tienhiepv3.html','utf8').match(new RegExp(c,'g'))||[]).length;
  console.log('  ' + c + ': ' + n + ' refs');
});
