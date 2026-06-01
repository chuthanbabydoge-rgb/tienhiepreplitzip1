const fs = require('fs');
let html = fs.readFileSync('tienhiepv3.html', 'utf-8');

// ═══════════════════════════════════════════════════════════════════
// 1. CSS — Full furnace, flames, smoke, throw animation
// ═══════════════════════════════════════════════════════════════════
const furnaceCSS = `
    /* ══════════════════════════════════════════════════════════
       LÒ LUYỆN ĐAN — BUILDER FURNACE SYSTEM
       ══════════════════════════════════════════════════════════ */

    /* ── Furnace container ── */
    #builder-ld-furnace {
      position: absolute;
      bottom: 4%;
      left: 50%;
      transform: translateX(-50%);
      width: 240px;
      z-index: 5;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* ── Flame shapes ── */
    .bld-fire-wrap {
      position: relative;
      width: 160px;
      height: 130px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .bld-fl {
      position: absolute;
      bottom: 0;
      border-radius: 50% 50% 15% 15% / 55% 55% 20% 20%;
      transform-origin: center bottom;
      mix-blend-mode: screen;
    }
    /* Outer flame — slow, large */
    .bld-fl.f0 {
      width: 90px; height: 120px;
      left: 50%; transform: translateX(-50%);
      background: radial-gradient(ellipse at 50% 90%,
        rgba(255,40,0,0.95) 0%, rgba(255,100,0,0.8) 30%,
        rgba(255,180,0,0.5) 65%, transparent 100%);
      animation: bfl-sway0 2.1s ease-in-out infinite alternate;
    }
    .bld-fl.f1 {
      width: 70px; height: 100px;
      left: calc(50% - 18px);
      background: radial-gradient(ellipse at 50% 90%,
        rgba(255,60,0,1) 0%, rgba(255,140,0,0.85) 40%,
        rgba(255,220,0,0.4) 75%, transparent 100%);
      animation: bfl-sway1 1.6s ease-in-out infinite alternate;
    }
    .bld-fl.f2 {
      width: 70px; height: 100px;
      left: calc(50% - 2px);
      background: radial-gradient(ellipse at 50% 90%,
        rgba(255,60,0,1) 0%, rgba(255,140,0,0.85) 40%,
        rgba(255,220,0,0.4) 75%, transparent 100%);
      animation: bfl-sway2 1.4s ease-in-out infinite alternate;
    }
    .bld-fl.f3 {
      width: 55px; height: 88px;
      left: calc(50% - 8px);
      background: radial-gradient(ellipse at 50% 85%,
        rgba(255,255,200,1) 0%, rgba(255,220,50,0.9) 25%,
        rgba(255,120,0,0.6) 55%, transparent 100%);
      animation: bfl-sway3 1.2s ease-in-out infinite alternate;
    }
    .bld-fl.f4 {
      width: 38px; height: 60px;
      left: calc(50% - 4px);
      background: radial-gradient(ellipse at 50% 80%,
        rgba(255,255,255,1) 0%, rgba(255,255,200,1) 25%,
        rgba(255,200,50,0.7) 60%, transparent 100%);
      animation: bfl-sway4 0.9s ease-in-out infinite alternate;
    }
    /* Side accent flames */
    .bld-fl.fs1 {
      width: 28px; height: 50px;
      left: calc(50% - 48px);
      background: radial-gradient(ellipse at 50% 85%,
        rgba(255,80,0,0.9) 0%, rgba(255,160,0,0.5) 55%, transparent 100%);
      animation: bfl-sway0 1.8s ease-in-out infinite alternate-reverse;
    }
    .bld-fl.fs2 {
      width: 28px; height: 50px;
      left: calc(50% + 22px);
      background: radial-gradient(ellipse at 50% 85%,
        rgba(255,80,0,0.9) 0%, rgba(255,160,0,0.5) 55%, transparent 100%);
      animation: bfl-sway1 1.7s ease-in-out infinite alternate-reverse;
    }
    @keyframes bfl-sway0 {
      from { transform: translateX(-50%) scaleX(0.95) rotate(-3deg);  }
      to   { transform: translateX(-50%) scaleX(1.05) rotate(3deg);   }
    }
    @keyframes bfl-sway1 {
      from { transform: scaleX(1)    rotate(-4deg) scaleY(0.96); }
      to   { transform: scaleX(0.9)  rotate(5deg)  scaleY(1.06); }
    }
    @keyframes bfl-sway2 {
      from { transform: scaleX(0.92) rotate(4deg)  scaleY(1.04); }
      to   { transform: scaleX(1.06) rotate(-5deg) scaleY(0.95); }
    }
    @keyframes bfl-sway3 {
      from { transform: scaleX(0.88) rotate(-3deg) scaleY(1.06); }
      to   { transform: scaleX(1.08) rotate(4deg)  scaleY(0.93); }
    }
    @keyframes bfl-sway4 {
      from { transform: scaleX(0.85) scaleY(0.9) rotate(-2deg); }
      to   { transform: scaleX(1.1)  scaleY(1.1) rotate(3deg); }
    }

    /* ── Cauldron SVG ── */
    .bld-cauldron-wrap {
      position: relative;
      width: 200px;
      height: 180px;
      z-index: 2;
    }
    .bld-cauldron-svg {
      width: 100%;
      height: 100%;
      filter:
        drop-shadow(0 0 18px rgba(255,100,0,0.7))
        drop-shadow(0 -4px 12px rgba(255,200,0,0.4));
    }

    /* ── Inner glow (lò đang nóng) ── */
    .bld-inner-glow {
      position: absolute;
      top: 15%;
      left: 50%;
      transform: translateX(-50%);
      width: 110px;
      height: 60px;
      border-radius: 50%;
      background: radial-gradient(ellipse,
        rgba(255,200,50,0.55) 0%,
        rgba(255,100,0,0.35) 50%,
        transparent 100%);
      animation: bld-inner-pulse 1.8s ease-in-out infinite alternate;
      pointer-events: none;
      z-index: 1;
    }
    @keyframes bld-inner-pulse {
      from { opacity: 0.6; transform: translateX(-50%) scale(0.9); }
      to   { opacity: 1;   transform: translateX(-50%) scale(1.12); }
    }

    /* ── 丹 rune inscription ── */
    .bld-dan-rune {
      position: absolute;
      bottom: 28%;
      left: 50%;
      transform: translateX(-50%);
      font-size: 28px;
      font-family: 'Noto Serif', Georgia, serif;
      color: rgba(255,220,80,0.75);
      text-shadow:
        0 0 14px rgba(255,180,0,0.9),
        0 0 30px rgba(255,100,0,0.6);
      animation: bld-rune-pulse 2.5s ease-in-out infinite alternate;
      pointer-events: none;
      z-index: 4;
      letter-spacing: 0;
    }
    @keyframes bld-rune-pulse {
      from { opacity: 0.55; text-shadow: 0 0 10px rgba(255,180,0,0.7), 0 0 20px rgba(255,80,0,0.4); }
      to   { opacity: 1;    text-shadow: 0 0 22px rgba(255,220,0,1),   0 0 40px rgba(255,120,0,0.8); }
    }

    /* ── Smoke wisps ── */
    .bld-smoke-wrap {
      position: absolute;
      bottom: 95%;
      left: 50%;
      transform: translateX(-50%);
      width: 120px;
      height: 0;
      pointer-events: none;
      z-index: 6;
    }
    .bld-smoke {
      position: absolute;
      bottom: 0;
      border-radius: 50%;
      background: rgba(200,160,100,0.22);
      backdrop-filter: blur(2px);
      animation: bld-smoke-rise 3s ease-out infinite;
    }
    .bld-smoke.sm1 { width:22px; height:22px; left:44px;  animation-delay:0s;    animation-duration:3.2s; }
    .bld-smoke.sm2 { width:16px; height:16px; left:30px;  animation-delay:1.0s;  animation-duration:2.8s; }
    .bld-smoke.sm3 { width:18px; height:18px; left:60px;  animation-delay:0.5s;  animation-duration:3.6s; }
    .bld-smoke.sm4 { width:12px; height:12px; left:50px;  animation-delay:1.8s;  animation-duration:2.5s; }
    .bld-smoke.sm5 { width:20px; height:20px; left:36px;  animation-delay:2.4s;  animation-duration:3.0s; }
    @keyframes bld-smoke-rise {
      0%   { transform: translateY(0)    scaleX(1)   opacity:0; opacity: 0; }
      10%  { opacity: 0.45; }
      60%  { transform: translateY(-90px)  scaleX(1.8); opacity: 0.25; }
      100% { transform: translateY(-180px) scaleX(3);   opacity: 0; }
    }

    /* ── Ember float particles ── */
    .bld-ember {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      z-index: 7;
      animation: bld-ember-float linear infinite;
    }
    @keyframes bld-ember-float {
      0%   { transform: translate(var(--ex,0px), 0) scale(1); opacity: 0.9; }
      50%  { opacity: 0.7; }
      100% { transform: translate(calc(var(--ex,0px) + var(--edx,0px)), -140px) scale(0.2); opacity: 0; }
    }

    /* ── Flying ingredient throw ── */
    .bld-flying-herb {
      position: absolute;
      font-size: 28px;
      pointer-events: none;
      z-index: 200;
      line-height: 1;
      filter: drop-shadow(0 0 12px var(--herb-color, #ff8800));
      transform-origin: center center;
    }
    @keyframes bld-fly-shrink {
      0%   { transform: scale(1.8) rotate(0deg); }
      100% { transform: scale(0.2) rotate(720deg); }
    }

    /* ── Furnace burst (when herb hits) ── */
    .bld-burst-ring {
      position: absolute;
      border-radius: 50%;
      border: 3px solid rgba(255,200,50,0.9);
      pointer-events: none;
      z-index: 201;
      animation: bld-burst-expand 0.7s ease-out forwards;
    }
    @keyframes bld-burst-expand {
      0%   { transform: scale(0.1); opacity: 1; }
      100% { transform: scale(3);   opacity: 0; }
    }
    .bld-burst-flash {
      position: absolute;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,255,200,0.95) 0%, rgba(255,140,0,0.5) 40%, transparent 75%);
      pointer-events: none;
      z-index: 201;
      animation: bld-burst-flash-anim 0.45s ease-out forwards;
    }
    @keyframes bld-burst-flash-anim {
      0%   { transform: scale(0.2); opacity: 1; }
      50%  { transform: scale(1.5); opacity: 0.9; }
      100% { transform: scale(2.5); opacity: 0; }
    }

    /* ── Furnace glow footprint ── */
    .bld-furnace-ground-glow {
      position: absolute;
      bottom: -10px;
      left: 50%;
      transform: translateX(-50%);
      width: 220px;
      height: 40px;
      border-radius: 50%;
      background: radial-gradient(ellipse, rgba(255,80,0,0.35) 0%, transparent 75%);
      animation: bld-ground-pulse 2s ease-in-out infinite alternate;
      pointer-events: none;
    }
    @keyframes bld-ground-pulse {
      from { opacity: 0.5; transform: translateX(-50%) scaleX(0.85); }
      to   { opacity: 1;   transform: translateX(-50%) scaleX(1.1); }
    }

    /* ── Nodes: when builder has furnace, float above it in a ring ── */
    .canvas-node { cursor: grab; transition: filter 0.2s; }
    .canvas-node:hover { filter: brightness(1.25) !important; }
`;

// ── Insert CSS before closing </style> of the builder CSS block ───
html = html.replace(
  '    .builder-line.sp-active {',
  furnaceCSS + '\n    .builder-line.sp-active {'
);

// ═══════════════════════════════════════════════════════════════════
// 2. HTML — Furnace element inside the builder canvas
// ═══════════════════════════════════════════════════════════════════
const furnaceHTML = `
          <!-- ══ LÒ LUYỆN ĐAN — FURNACE ══ -->
          <div id="builder-ld-furnace">
            <!-- Ground glow -->
            <div class="bld-furnace-ground-glow"></div>

            <!-- Smoke wisps rise above cauldron -->
            <div class="bld-smoke-wrap">
              <div class="bld-smoke sm1"></div>
              <div class="bld-smoke sm2"></div>
              <div class="bld-smoke sm3"></div>
              <div class="bld-smoke sm4"></div>
              <div class="bld-smoke sm5"></div>
            </div>

            <!-- Fire above cauldron mouth -->
            <div class="bld-fire-wrap">
              <div class="bld-fl f0"></div>
              <div class="bld-fl fs1"></div>
              <div class="bld-fl fs2"></div>
              <div class="bld-fl f1"></div>
              <div class="bld-fl f2"></div>
              <div class="bld-fl f3"></div>
              <div class="bld-fl f4"></div>
            </div>

            <!-- Cauldron body -->
            <div class="bld-cauldron-wrap">
              <div class="bld-inner-glow"></div>
              <svg class="bld-cauldron-svg" viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="cld-body" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stop-color="#6b3a10"/>
                    <stop offset="40%"  stop-color="#3d1e04"/>
                    <stop offset="100%" stop-color="#1a0a00"/>
                  </linearGradient>
                  <linearGradient id="cld-shine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"  stop-color="rgba(255,200,80,0.0)"/>
                    <stop offset="30%" stop-color="rgba(255,200,80,0.18)"/>
                    <stop offset="50%" stop-color="rgba(255,220,100,0.28)"/>
                    <stop offset="70%" stop-color="rgba(255,200,80,0.10)"/>
                    <stop offset="100%" stop-color="rgba(255,200,80,0.0)"/>
                  </linearGradient>
                  <radialGradient id="cld-mouth-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stop-color="rgba(255,180,0,0.6)"/>
                    <stop offset="60%"  stop-color="rgba(255,80,0,0.25)"/>
                    <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
                  </radialGradient>
                  <filter id="cld-glow">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>

                <!-- ── Cauldron mouth (ellipse opening) ── -->
                <ellipse cx="110" cy="42" rx="78" ry="22" fill="url(#cld-mouth-glow)" opacity="0.9"/>
                <ellipse cx="110" cy="42" rx="78" ry="22" fill="none" stroke="#c87820" stroke-width="3.5" filter="url(#cld-glow)"/>
                <ellipse cx="110" cy="42" rx="74" ry="18" fill="rgba(30,10,0,0.85)"/>
                <ellipse cx="110" cy="42" rx="74" ry="18" fill="url(#cld-mouth-glow)" opacity="0.7"/>

                <!-- ── Rim detail ── -->
                <ellipse cx="110" cy="42" rx="78" ry="22" fill="none" stroke="rgba(255,220,100,0.45)" stroke-width="1.2"/>

                <!-- ── Cauldron body ── -->
                <path d="M 34,50 Q 28,80 32,112 Q 40,150 110,162 Q 180,150 188,112 Q 192,80 186,50 Z"
                  fill="url(#cld-body)" stroke="#8b4a14" stroke-width="2.5" filter="url(#cld-glow)"/>

                <!-- ── Body shine / highlight ── -->
                <path d="M 50,55 Q 46,90 50,120 Q 60,148 110,158 Q 160,148 170,120 Q 174,90 170,55 Q 140,48 110,46 Q 80,48 50,55 Z"
                  fill="url(#cld-shine)" opacity="0.9"/>

                <!-- ── Inscription band ── -->
                <path d="M 42,88 Q 110,108 178,88" fill="none" stroke="rgba(255,200,60,0.35)" stroke-width="12" stroke-linecap="round"/>
                <path d="M 42,88 Q 110,108 178,88" fill="none" stroke="rgba(255,150,20,0.25)" stroke-width="1.5" stroke-linecap="round"/>

                <!-- ── Left handle ── -->
                <path d="M 33,62 Q 12,62 12,80 Q 12,95 33,93" fill="none" stroke="#a06020" stroke-width="8" stroke-linecap="round" filter="url(#cld-glow)"/>
                <path d="M 33,62 Q 12,62 12,80 Q 12,95 33,93" fill="none" stroke="#c87828" stroke-width="3" stroke-linecap="round"/>

                <!-- ── Right handle ── -->
                <path d="M 187,62 Q 208,62 208,80 Q 208,95 187,93" fill="none" stroke="#a06020" stroke-width="8" stroke-linecap="round" filter="url(#cld-glow)"/>
                <path d="M 187,62 Q 208,62 208,80 Q 208,95 187,93" fill="none" stroke="#c87828" stroke-width="3" stroke-linecap="round"/>

                <!-- ── Three legs ── -->
                <rect x="68"  y="158" width="14" height="36" rx="5" fill="#2a1000" stroke="#7a3c0a" stroke-width="1.5" filter="url(#cld-glow)"/>
                <rect x="138" y="158" width="14" height="36" rx="5" fill="#2a1000" stroke="#7a3c0a" stroke-width="1.5" filter="url(#cld-glow)"/>
                <rect x="103" y="162" width="14" height="32" rx="5" fill="#2a1000" stroke="#7a3c0a" stroke-width="1.5" filter="url(#cld-glow)"/>

                <!-- ── Leg feet ── -->
                <ellipse cx="75"  cy="196" rx="12" ry="4" fill="#1a0800" stroke="#7a3c0a" stroke-width="1"/>
                <ellipse cx="145" cy="196" rx="12" ry="4" fill="#1a0800" stroke="#7a3c0a" stroke-width="1"/>
                <ellipse cx="110" cy="196" rx="12" ry="4" fill="#1a0800" stroke="#7a3c0a" stroke-width="1"/>

                <!-- ── Base fire glow under legs ── -->
                <ellipse cx="110" cy="198" rx="85" ry="14" fill="rgba(255,60,0,0.2)" filter="url(#cld-glow)"/>

                <!-- ── Decorative pattern lines on body ── -->
                <path d="M 60,70 L 60,145" stroke="rgba(200,130,40,0.18)" stroke-width="1"/>
                <path d="M 80,65 L 80,152" stroke="rgba(200,130,40,0.12)" stroke-width="1"/>
                <path d="M 160,70 L 160,145" stroke="rgba(200,130,40,0.18)" stroke-width="1"/>
                <path d="M 140,65 L 140,152" stroke="rgba(200,130,40,0.12)" stroke-width="1"/>
              </svg>

              <!-- 丹 inscription -->
              <div class="bld-dan-rune">丹</div>
            </div>
          </div>
`;

// Insert furnace BEFORE the log panel
html = html.replace(
  '          <!-- Log panel (slides up from bottom) -->',
  furnaceHTML + '\n          <!-- Log panel (slides up from bottom) -->'
);

// ═══════════════════════════════════════════════════════════════════
// 3. JS — Ember spawner (continuous rising embers from furnace)
//    + Throw animation + Furnace burst
// ═══════════════════════════════════════════════════════════════════
const furnaceJS = `
    // ══ LUYỆN ĐAN FURNACE EFFECTS ══════════════════════════════

    // Start continuous ember particles
    function _bldStartEmbers() {
      const furnace = document.getElementById('builder-ld-furnace');
      if (!furnace) return;
      setInterval(() => {
        if (!document.getElementById('builder-modal') ||
            document.getElementById('builder-modal').style.display === 'none') return;
        const canvas = document.getElementById('builder-canvas');
        const fr = furnace.getBoundingClientRect();
        const cr = canvas.getBoundingClientRect();
        const cx = fr.left - cr.left + fr.width * 0.5;
        const cy = fr.top  - cr.top  + fr.height * 0.05;
        const ember = document.createElement('div');
        ember.className = 'bld-ember';
        const sz = 2 + Math.random() * 4;
        const colors = ['#ff8800','#ffcc00','#ff4400','#ffee44'];
        const col = colors[Math.floor(Math.random()*colors.length)];
        const spreadX = (Math.random()-0.5) * 80;
        const driftX  = (Math.random()-0.5) * 40;
        const dur = 1.2 + Math.random() * 1.4;
        ember.style.cssText = \`
          width:\${sz}px;height:\${sz}px;
          left:\${cx + spreadX}px;
          top:\${cy}px;
          background:\${col};
          box-shadow:0 0 \${sz*2}px \${col};
          --ex:\${spreadX * 0.2}px;
          --edx:\${driftX}px;
          animation-duration:\${dur}s;
          animation-delay:\${Math.random()*0.5}s;
        \`;
        canvas.appendChild(ember);
        setTimeout(() => ember.remove(), (dur + 0.5) * 1000);
      }, 160);
    }

    // Throw animation: herb icon flies arc from dropPoint → furnace mouth, then burst
    function _bldThrowHerb(canvas, dropX, dropY, icon, color, onDone) {
      const furnace = document.getElementById('builder-ld-furnace');
      if (!furnace) { onDone(); return; }
      const fr = furnace.getBoundingClientRect();
      const cr = canvas.getBoundingClientRect();
      // Target = cauldron mouth center
      const endX = fr.left - cr.left + fr.width  * 0.5 - 14;
      const endY = fr.top  - cr.top  + fr.height * 0.10;

      // Flying herb div
      const fly = document.createElement('div');
      fly.className = 'bld-flying-herb';
      fly.textContent = icon;
      fly.style.cssText = \`left:\${dropX}px;top:\${dropY}px;--herb-color:\${color};\`;
      canvas.appendChild(fly);

      // Arc control point (high arc)
      const midX = (dropX + endX) / 2 + (Math.random()-0.5) * 60;
      const midY = Math.min(dropY, endY) - Math.abs(dropX - endX) * 0.5 - 80;

      const t0 = performance.now();
      const dur = 520;
      function ease(t) { return t * (2 - t); } // ease-in-out

      (function animate(now) {
        const raw = Math.min((now - t0) / dur, 1);
        const t   = ease(raw);
        // Quadratic bezier
        const bx = (1-t)*(1-t)*dropX + 2*(1-t)*t*midX + t*t*endX;
        const by = (1-t)*(1-t)*dropY + 2*(1-t)*t*midY + t*t*endY;
        const sc = 1.8 - t * 1.5;
        const rot = t * 540;
        const op  = raw > 0.80 ? 1 - (raw - 0.80) / 0.20 : 1;
        fly.style.left      = bx + 'px';
        fly.style.top       = by + 'px';
        fly.style.transform = \`scale(\${sc}) rotate(\${rot}deg)\`;
        fly.style.opacity   = op;
        if (raw < 1) {
          requestAnimationFrame(animate);
        } else {
          fly.remove();
          _bldFurnaceBurst(canvas, endX + 14, endY);
          setTimeout(onDone, 120);
        }
      })(t0);
    }

    // Burst effect at furnace mouth when herb lands
    function _bldFurnaceBurst(canvas, cx, cy) {
      // Flash circle
      const flash = document.createElement('div');
      flash.className = 'bld-burst-flash';
      flash.style.cssText = \`left:\${cx-40}px;top:\${cy-40}px;width:80px;height:80px;\`;
      canvas.appendChild(flash);
      setTimeout(() => flash.remove(), 500);

      // 2 expanding rings
      for (let i = 0; i < 2; i++) {
        const ring = document.createElement('div');
        ring.className = 'bld-burst-ring';
        const sz = 40 + i * 20;
        ring.style.cssText = \`
          left:\${cx - sz/2}px;top:\${cy - sz/2}px;
          width:\${sz}px;height:\${sz}px;
          animation-delay:\${i*0.12}s;
          border-color:rgba(255,\${180 - i*60},0,0.9);\`;
        canvas.appendChild(ring);
        setTimeout(() => ring.remove(), 900);
      }

      // Spark shower
      const colors = ['#ff8800','#ffcc00','#ff4400','#ffee44','#ffffff'];
      for (let i = 0; i < 22; i++) {
        const sp = document.createElement('div');
        sp.className = 'ld-spark';
        const sz  = 2.5 + Math.random() * 5;
        const ang = Math.random() * Math.PI * 2;
        const dist = 15 + Math.random() * 60;
        const col = colors[Math.floor(Math.random()*colors.length)];
        sp.style.cssText = \`
          width:\${sz}px;height:\${sz}px;
          left:\${cx + Math.cos(ang)*dist}px;
          top:\${cy + Math.sin(ang)*dist}px;
          background:\${col};
          box-shadow:0 0 \${sz*2.5}px \${col};
          --sx:\${Math.cos(ang)*30}px;
          animation-duration:\${0.4 + Math.random()*0.5}s;
          animation-delay:\${Math.random()*0.08}s;
        \`;
        canvas.appendChild(sp);
        setTimeout(() => sp.remove(), 1000);
      }

      // Flash the furnace
      const furnace = document.getElementById('builder-ld-furnace');
      if (furnace) {
        furnace.style.filter = 'brightness(3) saturate(2)';
        furnace.style.transition = 'filter 0.08s';
        setTimeout(() => { furnace.style.filter = 'none'; furnace.style.transition = 'filter 0.5s'; }, 80);
      }
    }

    // Start embers when builder opens
    let _bldEmbersStarted = false;
    function _bldEnsureEmbers() {
      if (!_bldEmbersStarted) { _bldEmbersStarted = true; _bldStartEmbers(); }
    }
`;

// Insert before spawnLdSparks function
html = html.replace(
  'function spawnLdSparks(canvas, cx, cy) {',
  furnaceJS + '\n    function spawnLdSparks(canvas, cx, cy) {'
);

// ═══════════════════════════════════════════════════════════════════
// 4. Modify drop() — use throw animation, delay node appearance
// ═══════════════════════════════════════════════════════════════════
html = html.replace(
  `  node.classList.add('ld-herb-land');
  canvas.appendChild(node);
  bNodes.push(node);
  drawLines();
  draggedType = null;
  // ── Luyện Đan spark burst ──
  spawnLdSparks(canvas, x + 60, y + 20);`,
  `  // ── Luyện Đan: throw herb into furnace then reveal node ──
  _bldEnsureEmbers();
  const _savedDragType = draggedType;
  draggedType = null;
  const _herbIcon = (() => {
    const tk = (_savedDragType||'').split(' / ')[0].trim();
    const _d2 = _nodeData[tk] || _ndList[_nodeHash(tk) % _ndList.length];
    return _d2.icon;
  })();
  const _herbColor = (() => {
    const tk = (_savedDragType||'').split(' / ')[0].trim();
    const _d2 = _nodeData[tk] || _ndList[_nodeHash(tk) % _ndList.length];
    return _d2.color;
  })();
  // Throw animation — node is invisible during flight
  node.style.opacity = '0';
  node.style.transform = 'scale(0.01)';
  canvas.appendChild(node);
  bNodes.push(node);
  drawLines();
  _bldThrowHerb(canvas, x + 40, y + 10, _herbIcon, _herbColor, function() {
    node.classList.add('ld-herb-land');
    node.style.opacity = '';
    node.style.transform = '';
    spawnLdSparks(canvas, x + 60, y + 20);
  });`
);

// ═══════════════════════════════════════════════════════════════════
// 5. Modify loadPreset() — staggered throw into furnace
// ═══════════════════════════════════════════════════════════════════
// After "canvas.appendChild(node); bNodes.push(node);" in loadPreset
// We need the nodes to also fly in from above with stagger
html = html.replace(
  `        node.ondragstart = function () { return false; };
        canvas.appendChild(node);
        bNodes.push(node);
      });
      drawLines();
      showToast(currentTheme === 'xx' ? \`Đã bày trận: \${agent.name_xx}!\` : \`Loaded Pipeline: \${agent.name}!\`, 'success');`,
  `        node.ondragstart = function () { return false; };
        // Start hidden for stagger animation
        node.style.opacity = '0';
        node.style.transform = 'scale(0.01)';
        canvas.appendChild(node);
        bNodes.push(node);
      });
      drawLines();
      // Staggered ingredient throw — each node pops in after flying into furnace
      _bldEnsureEmbers();
      bNodes.forEach((n, idx) => {
        const delay = idx * 160;
        setTimeout(() => {
          const rawT = n.getAttribute('data-raw-type') || 'Data Source';
          const tk   = rawT.split(' / ')[0].trim();
          const _dd  = _nodeData[tk] || _ndList[_nodeHash(tk) % _ndList.length];
          const nr   = n.getBoundingClientRect();
          const cr   = canvas.getBoundingClientRect();
          const sx   = nr.left - cr.left + nr.width/2;
          const sy   = cr.top  - cr.top  + 20; // drop from top of canvas
          _bldThrowHerb(canvas, sx, 20, _dd.icon, _dd.color, () => {
            n.classList.add('ld-herb-land');
            n.style.opacity   = '';
            n.style.transform = '';
            spawnLdSparks(canvas, sx, nr.top - cr.top + 20);
          });
        }, delay);
      });
      showToast(currentTheme === 'xx' ? \`Đã bày trận: \${agent.name_xx}!\` : \`Loaded Pipeline: \${agent.name}!\`, 'success');`
);

// ═══════════════════════════════════════════════════════════════════
// 6. Start embers when builder modal opens
// ═══════════════════════════════════════════════════════════════════
html = html.replace(
  `function openBuilder() {`,
  `function openBuilder() {
    setTimeout(_bldEnsureEmbers, 300);`
);

fs.writeFileSync('tienhiepv3.html', html, 'utf-8');
console.log('✅ Furnace + throw animation complete!');

// Verify
const checks = ['builder-ld-furnace','bld-cauldron-svg','bld-fl f0','bld-flying-herb','_bldThrowHerb','_bldFurnaceBurst','_bldStartEmbers','bld-smoke-wrap','bld-dan-rune','丹'];
let ok = 0;
checks.forEach(c => {
  if (html.includes(c)) { console.log(`  ✅ ${c}`); ok++; }
  else { console.log(`  ❌ MISSING: ${c}`); }
});
console.log(`${ok}/${checks.length} checks passed.`);
