const fs = require('fs');
let html = fs.readFileSync('tienhiepv3.html', 'utf-8');

// ═══════════════════════════════════════════════════════════════════
// CSS — Mini Cultivator Character
// ═══════════════════════════════════════════════════════════════════
const cultivatorCSS = `
    /* ══════════════════════════════════════════════════════
       MINI TU TIÊN — Luyện Đan Canvas Character
       ══════════════════════════════════════════════════════ */

    #td-cultivator {
      position: absolute;
      bottom: 14%;
      right: 8%;
      width: 72px;
      height: 108px;
      z-index: 20;
      pointer-events: none;
      animation: td-float 3.2s ease-in-out infinite;
      transform-origin: center bottom;
      filter: drop-shadow(0 0 8px rgba(160,80,255,0.45));
      transition: filter 0.3s ease;
    }
    #td-cultivator.td-dragging {
      filter: drop-shadow(0 0 14px rgba(255,160,40,0.75));
      animation: td-float-excited 1.4s ease-in-out infinite;
    }
    #td-cultivator.td-throwing {
      animation: td-throw-anim 0.55s cubic-bezier(0.25,0.46,0.45,0.94) forwards;
      filter: drop-shadow(0 0 20px rgba(255,80,0,0.9));
    }
    #td-cultivator.td-landed {
      animation: td-celebrate 0.7s ease-out forwards;
      filter: drop-shadow(0 0 16px rgba(255,210,0,0.8));
    }

    /* SVG element animations */
    .td-arm-right-g {
      transform-origin: 38px 42px;
      transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
    }
    #td-cultivator.td-dragging .td-arm-right-g {
      transform: rotate(-75deg);
    }
    #td-cultivator.td-throwing .td-arm-right-g {
      transform: rotate(-110deg);
    }

    .td-arm-left-g {
      transform-origin: 22px 42px;
      transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
    }
    #td-cultivator.td-dragging .td-arm-left-g {
      transform: rotate(20deg);
    }
    #td-cultivator.td-throwing .td-arm-left-g {
      transform: rotate(35deg);
    }

    /* Qi orb on raised hand */
    .td-qi-orb {
      opacity: 0;
      transform: scale(0);
      transform-origin: center;
      transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    #td-cultivator.td-dragging .td-qi-orb {
      opacity: 1;
      transform: scale(1);
      animation: td-qi-pulse 0.8s ease-in-out infinite alternate;
    }
    #td-cultivator.td-throwing .td-qi-orb {
      opacity: 0;
      transform: scale(2.5);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    /* Floating particles around character */
    .td-particle {
      opacity: 0;
    }
    #td-cultivator.td-dragging .td-particle {
      opacity: 1;
      animation: td-particle-orbit 1.8s linear infinite;
    }
    .td-particle.p2 { animation-delay: -0.6s !important; }
    .td-particle.p3 { animation-delay: -1.2s !important; }

    /* Robe sway */
    .td-robe-hem {
      transform-origin: 30px 78px;
      animation: td-robe-sway 3.2s ease-in-out infinite;
    }

    /* Topknot tassel */
    .td-tassel {
      transform-origin: 30px 12px;
      animation: td-tassel-wave 2.8s ease-in-out infinite;
    }

    /* ── Keyframes ── */
    @keyframes td-float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      25%       { transform: translateY(-5px) rotate(-1deg); }
      75%       { transform: translateY(-3px) rotate(1deg); }
    }
    @keyframes td-float-excited {
      0%, 100% { transform: translateY(0px) rotate(-1.5deg); }
      50%       { transform: translateY(-8px) rotate(1.5deg); }
    }
    @keyframes td-throw-anim {
      0%   { transform: translateY(0)   rotate(0deg)   scale(1); }
      30%  { transform: translateY(-4px) rotate(-8deg) scale(1.08) translateX(-6px); }
      60%  { transform: translateY(2px)  rotate(10deg) scale(0.95) translateX(8px); }
      100% { transform: translateY(0)   rotate(0deg)   scale(1); }
    }
    @keyframes td-celebrate {
      0%   { transform: translateY(0)    scale(1);    rotate: 0deg; }
      20%  { transform: translateY(-10px) scale(1.1); }
      40%  { transform: translateY(2px)   scale(0.95); }
      60%  { transform: translateY(-5px)  scale(1.05); }
      100% { transform: translateY(0)    scale(1); }
    }
    @keyframes td-qi-pulse {
      from { filter: drop-shadow(0 0 4px rgba(255,200,60,0.9)); }
      to   { filter: drop-shadow(0 0 12px rgba(255,120,0,1)) drop-shadow(0 0 20px rgba(255,80,0,0.6)); }
    }
    @keyframes td-particle-orbit {
      0%   { transform: rotate(0deg)   translateX(28px) scale(1);   opacity: 0.9; }
      50%  { opacity: 0.5; }
      100% { transform: rotate(360deg) translateX(28px) scale(0.5); opacity: 0; }
    }
    @keyframes td-robe-sway {
      0%, 100% { transform: skewX(0deg); }
      40%       { transform: skewX(2deg); }
      70%       { transform: skewX(-2deg); }
    }
    @keyframes td-tassel-wave {
      0%, 100% { transform: rotate(0deg); }
      35%       { transform: rotate(-8deg); }
      70%       { transform: rotate(6deg); }
    }

    /* Herb sparkle trail when dragging over canvas */
    .td-sparkle-trail {
      position: absolute;
      width: 8px; height: 8px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,200,60,1) 0%, rgba(255,80,0,0) 70%);
      pointer-events: none;
      z-index: 25;
      animation: td-sparkle-fade 0.6s ease-out forwards;
    }
    @keyframes td-sparkle-fade {
      0%   { transform: scale(1);   opacity: 1; }
      100% { transform: scale(2.5); opacity: 0; }
    }
`;

// Inject CSS before last </style> in head
html = html.replace(
  /(<\/style>\s*<\/head>)/,
  cultivatorCSS + '\n  $1'
);

// ═══════════════════════════════════════════════════════════════════
// HTML — The Mini Cultivator SVG Character
// ═══════════════════════════════════════════════════════════════════
const cultivatorHTML = `
          <!-- ── MINI TU TIÊN ── -->
          <div id="td-cultivator" aria-hidden="true">
            <svg viewBox="0 0 60 108" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
              <defs>
                <radialGradient id="td-robe-grad" cx="50%" cy="40%" r="55%">
                  <stop offset="0%" stop-color="#9955ff"/>
                  <stop offset="100%" stop-color="#441188"/>
                </radialGradient>
                <radialGradient id="td-skin-grad" cx="40%" cy="35%" r="60%">
                  <stop offset="0%" stop-color="#ffddaa"/>
                  <stop offset="100%" stop-color="#e8a868"/>
                </radialGradient>
                <radialGradient id="td-qi-grad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#ffffaa"/>
                  <stop offset="40%" stop-color="#ffaa00"/>
                  <stop offset="100%" stop-color="rgba(255,60,0,0)"/>
                </radialGradient>
                <filter id="td-glow-filter">
                  <feGaussianBlur stdDeviation="1.5" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              <!-- Aura disc -->
              <ellipse cx="30" cy="96" rx="22" ry="6" fill="rgba(140,60,255,0.18)"/>
              <ellipse cx="30" cy="96" rx="14" ry="3.5" fill="rgba(180,100,255,0.25)"/>

              <!-- ROBE body -->
              <g class="td-robe-hem">
                <!-- Outer robe -->
                <path d="M20,46 L10,96 L50,96 L40,46 Z" fill="url(#td-robe-grad)" opacity="0.95"/>
                <!-- Robe lapels / inner -->
                <path d="M30,46 L26,96 L34,96 Z" fill="rgba(255,255,255,0.12)"/>
                <!-- Belt sash -->
                <rect x="18" y="52" width="24" height="3" rx="1.5" fill="rgba(255,200,80,0.75)"/>
                <!-- Robe bottom detail lines -->
                <line x1="18" y1="68" x2="22" y2="96" stroke="rgba(255,255,255,0.12)" stroke-width="0.8"/>
                <line x1="42" y1="68" x2="38" y2="96" stroke="rgba(255,255,255,0.12)" stroke-width="0.8"/>
                <!-- Robe collar -->
                <path d="M24,46 Q30,50 36,46" stroke="rgba(255,220,120,0.6)" stroke-width="1.2" fill="none"/>
              </g>

              <!-- LEFT ARM (slight movement for balance) -->
              <g class="td-arm-left-g">
                <line x1="22" y1="50" x2="12" y2="65" stroke="#9955ff" stroke-width="5" stroke-linecap="round"/>
                <line x1="22" y1="50" x2="12" y2="65" stroke="url(#td-robe-grad)" stroke-width="4" stroke-linecap="round" opacity="0.85"/>
                <!-- Left hand -->
                <circle cx="11" cy="67" r="3.2" fill="url(#td-skin-grad)"/>
              </g>

              <!-- RIGHT ARM (the throwing arm) -->
              <g class="td-arm-right-g">
                <line x1="38" y1="50" x2="50" y2="64" stroke="#9955ff" stroke-width="5" stroke-linecap="round"/>
                <line x1="38" y1="50" x2="50" y2="64" stroke="url(#td-robe-grad)" stroke-width="4" stroke-linecap="round" opacity="0.85"/>
                <!-- Right hand -->
                <circle cx="51" cy="66" r="3.2" fill="url(#td-skin-grad)"/>
                <!-- Qi orb on hand -->
                <circle class="td-qi-orb" cx="51" cy="60" r="7" fill="url(#td-qi-grad)" filter="url(#td-glow-filter)"/>
                <circle class="td-qi-orb" cx="51" cy="60" r="4" fill="rgba(255,255,200,0.9)"/>
              </g>

              <!-- NECK -->
              <rect x="27" y="35" width="6" height="12" rx="3" fill="url(#td-skin-grad)"/>

              <!-- HEAD -->
              <circle cx="30" cy="26" r="13" fill="url(#td-skin-grad)" filter="url(#td-glow-filter)"/>
              <!-- Head shading -->
              <ellipse cx="34" cy="23" rx="5" ry="4" fill="rgba(255,255,255,0.15)"/>

              <!-- Hair -->
              <path d="M17,22 Q18,12 30,11 Q42,12 43,22 Q40,16 30,15 Q20,16 17,22 Z" fill="#1a0a3a"/>
              <!-- Hair bun / topknot -->
              <g class="td-tassel">
                <ellipse cx="30" cy="12" rx="5" ry="6" fill="#1a0a3a"/>
                <ellipse cx="30" cy="7"  rx="3" ry="4" fill="#2a0a5a"/>
                <!-- Hairpin -->
                <line x1="25" y1="10" x2="35" y2="10" stroke="rgba(255,200,80,0.8)" stroke-width="1.2" stroke-linecap="round"/>
                <circle cx="36" cy="10" r="2" fill="rgba(255,160,40,0.9)"/>
                <!-- Tassel strands -->
                <line x1="30" y1="2"  x2="28" y2="-3" stroke="rgba(255,160,40,0.6)" stroke-width="0.8"/>
                <line x1="30" y1="2"  x2="30" y2="-4" stroke="rgba(255,200,80,0.6)" stroke-width="0.8"/>
                <line x1="30" y1="2"  x2="32" y2="-3" stroke="rgba(255,160,40,0.6)" stroke-width="0.8"/>
              </g>

              <!-- FACE -->
              <!-- Eyes -->
              <ellipse cx="26" cy="26" rx="2.2" ry="2.5" fill="#1a0a3a"/>
              <ellipse cx="34" cy="26" rx="2.2" ry="2.5" fill="#1a0a3a"/>
              <!-- Eye shine -->
              <circle cx="27" cy="25" r="0.8" fill="rgba(255,255,255,0.9)"/>
              <circle cx="35" cy="25" r="0.8" fill="rgba(255,255,255,0.9)"/>
              <!-- Brows -->
              <path d="M23,22.5 Q26,21 29,22.5" stroke="#1a0a3a" stroke-width="1.2" fill="none" stroke-linecap="round"/>
              <path d="M31,22.5 Q34,21 37,22.5" stroke="#1a0a3a" stroke-width="1.2" fill="none" stroke-linecap="round"/>
              <!-- Smile -->
              <path d="M27,30.5 Q30,33.5 33,30.5" stroke="#c07040" stroke-width="1" fill="none" stroke-linecap="round"/>
              <!-- Cheek blush -->
              <ellipse cx="23.5" cy="29" rx="3" ry="1.8" fill="rgba(255,120,80,0.25)"/>
              <ellipse cx="36.5" cy="29" rx="3" ry="1.8" fill="rgba(255,120,80,0.25)"/>

              <!-- Floating qi particles (orbit during drag) -->
              <circle class="td-particle p1" cx="30" cy="55" r="3" fill="rgba(255,200,60,0.9)"/>
              <circle class="td-particle p2" cx="30" cy="55" r="2" fill="rgba(100,220,255,0.9)"/>
              <circle class="td-particle p3" cx="30" cy="55" r="2.5" fill="rgba(220,100,255,0.9)"/>
            </svg>
          </div>`;

// Inject character HTML right after builder-canvas opening div
html = html.replace(
  `<div id="builder-canvas" ondrop="drop(event)" ondragover="allowDrop(event)" style="position:relative;overflow:hidden;">`,
  `<div id="builder-canvas" ondrop="drop(event)" ondragover="allowDrop(event)" style="position:relative;overflow:hidden;">
${cultivatorHTML}`
);

// ═══════════════════════════════════════════════════════════════════
// JS — Event hooks for character animation
// ═══════════════════════════════════════════════════════════════════
const cultivatorJS = `
  // ── MINI TU TIÊN — Drag-drop animation controller ──────────────────
  (function() {
    var _cult = null;
    var _throwTimer = null;
    var _landTimer = null;

    function getCult() {
      if (!_cult) _cult = document.getElementById('td-cultivator');
      return _cult;
    }

    function setState(state) {
      var el = getCult();
      if (!el) return;
      el.classList.remove('td-dragging', 'td-throwing', 'td-landed');
      if (state) el.classList.add(state);
    }

    function onThrow() {
      clearTimeout(_throwTimer);
      clearTimeout(_landTimer);
      setState('td-throwing');
      _landTimer = setTimeout(function() {
        setState('td-landed');
        _landTimer = setTimeout(function() {
          setState('');
        }, 750);
      }, 500);
    }

    // Listen for dragstart on herb items → raise arm
    document.addEventListener('dragstart', function(e) {
      if (e.target && e.target.classList && e.target.classList.contains('ld-herb')) {
        clearTimeout(_throwTimer);
        clearTimeout(_landTimer);
        setState('td-dragging');
        // Sparkle trail on builder-canvas drag over
        var canvas = document.getElementById('builder-canvas');
        if (canvas) {
          canvas._tdDragMove = function(ev) {
            var rect = canvas.getBoundingClientRect();
            var spark = document.createElement('div');
            spark.className = 'td-sparkle-trail';
            spark.style.left = (ev.clientX - rect.left - 4) + 'px';
            spark.style.top  = (ev.clientY - rect.top  - 4) + 'px';
            canvas.appendChild(spark);
            setTimeout(function() { if (spark.parentNode) spark.remove(); }, 600);
          };
          canvas.addEventListener('dragover', canvas._tdDragMove);
        }
      }
    }, true);

    // Listen for dragend → reset (cancelled drop)
    document.addEventListener('dragend', function(e) {
      if (e.target && e.target.classList && e.target.classList.contains('ld-herb')) {
        var canvas = document.getElementById('builder-canvas');
        if (canvas && canvas._tdDragMove) {
          canvas.removeEventListener('dragover', canvas._tdDragMove);
          canvas._tdDragMove = null;
        }
        // If still in dragging state (no drop fired), reset after short delay
        var el = getCult();
        if (el && el.classList.contains('td-dragging')) {
          clearTimeout(_throwTimer);
          _throwTimer = setTimeout(function() { setState(''); }, 200);
        }
      }
    }, true);

    // Patch the drop function to trigger throw animation
    var _origDrop = window.drop;
    window.drop = function(ev) {
      // Fire throw animation BEFORE original drop
      onThrow();
      if (typeof _origDrop === 'function') _origDrop(ev);
    };
    // Also hook builder-canvas ondrop attribute (already handled via window.drop patch above)
  })();
`;

// Inject JS just before </body>
html = html.replace(
  '</body>',
  `  <script>\n${cultivatorJS}\n  </script>\n</body>`
);

fs.writeFileSync('tienhiepv3.html', html);
console.log('✅ Mini Cultivator injected successfully!');
