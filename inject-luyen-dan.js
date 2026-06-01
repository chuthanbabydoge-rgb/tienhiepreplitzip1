const fs = require('fs');
let html = fs.readFileSync('tienhiepv3.html', 'utf-8');

// ── 1. SIDEBAR BUTTON LABEL ──────────────────────────────────────────────────
html = html.replace(
  '<div class="pbtn-label" id="t-build-l">TRẬN PHÁP BUILDER</div><div class="pbtn-sub" id="t-build-s">TẠO LUỒNG AI</div>',
  '<div class="pbtn-label" id="t-build-l">LÒ LUYỆN ĐAN</div><div class="pbtn-sub" id="t-build-s">LUYỆN ĐAN PHÁP THUẬT</div>'
);

// ── 2. BUILDER MODAL TOP BAR ──────────────────────────────────────────────────
// Title in top bar
html = html.replace(
  `            Quy Trình AI\n          </span>\n          <span style="font-family:-apple-system,'Segoe UI',sans-serif;font-size:11px;color:rgba(255,255,255,0.38);letter-spacing:0.3px;">\n            Kéo thả các khối để xây dựng luồng tự động`,
  `            🔥 Lò Luyện Đan\n          </span>\n          <span style="font-family:-apple-system,'Segoe UI',sans-serif;font-size:11px;color:rgba(255,160,40,0.65);letter-spacing:0.3px;">\n            Thả dược liệu vào lò — thi triển pháp thuật luyện kim đan`
);

// Clear button
html = html.replace('✕ Xóa', '💨 Xả Tro');

// Run button
html = html.replace(
  '⚡ VẬN TRẬN',
  '🔥 KHAI LÒ'
);
// Run button color: change from orange to deep fire red-orange
html = html.replace(
  'background:linear-gradient(135deg,rgba(255,160,0,0.22),rgba(255,70,0,0.14));\n          border:1px solid rgba(255,160,0,0.6);\n          color:#ffcc00;',
  'background:linear-gradient(135deg,rgba(255,80,0,0.35),rgba(200,20,0,0.25));\n          border:1px solid rgba(255,100,30,0.75);\n          color:#ff8844;'
);

// Status pill
html = html.replace('LINH KHÍ SẴN SÀNG', 'LÒ ĐAN SẴN SÀNG');

// ── 3. SIDEBAR CONTENT ────────────────────────────────────────────────────────
// Sidebar section title
html = html.replace(
  '<div class="builder-title" id="t-b-title2">Khối thành phần</div>',
  '<div class="builder-title" id="t-b-title2">⚗️ Dược Liệu Trân Quý</div>'
);

// Node items — replace with alchemy ingredient theme
html = html.replace(
  `          <div class="builder-node-item" draggable="true" ondragstart="drag(event)" data-type="Data Source" data-icon="📥" style="--node-color:#5E9FFF;">
            Data Source / Thu thập
          </div>
          <div class="builder-node-item" draggable="true" ondragstart="drag(event)" data-type="LLM Engine" data-icon="🧠" style="--node-color:#BF5AF2;">
            LLM Engine / Thần Thức
          </div>
          <div class="builder-node-item" draggable="true" ondragstart="drag(event)" data-type="Vision API" data-icon="👁" style="--node-color:#FF9F0A;">
            Vision API / Thiên Nhãn
          </div>
          <div class="builder-node-item" draggable="true" ondragstart="drag(event)" data-type="Audio Gen" data-icon="🎵" style="--node-color:#FF375F;">
            Audio Gen / Truyền Âm
          </div>
          <div class="builder-node-item" draggable="true" ondragstart="drag(event)" data-type="Filter Logic" data-icon="⚡" style="--node-color:#30D158;">
            Filter Logic / Luyện Hoá
          </div>
          <div class="builder-node-item" draggable="true" ondragstart="drag(event)" data-type="Publish" data-icon="🚀" style="--node-color:#FF9F0A;">
            Publish / Xuất Thế
          </div>`,
  `          <div class="builder-node-item ld-herb" draggable="true" ondragstart="drag(event)" data-type="Data Source" data-icon="🌿" style="--node-color:#50c878;--ld-glow:#50c878;">
            🌿 Linh Căn / Thu Thập
          </div>
          <div class="builder-node-item ld-herb" draggable="true" ondragstart="drag(event)" data-type="LLM Engine" data-icon="🔥" style="--node-color:#ff6030;--ld-glow:#ff6030;">
            🔥 Thiên Hỏa / Thần Thức
          </div>
          <div class="builder-node-item ld-herb" draggable="true" ondragstart="drag(event)" data-type="Vision API" data-icon="💎" style="--node-color:#cc88ff;--ld-glow:#cc88ff;">
            💎 Huyền Tinh / Thiên Nhãn
          </div>
          <div class="builder-node-item ld-herb" draggable="true" ondragstart="drag(event)" data-type="Audio Gen" data-icon="⚡" style="--node-color:#ffe030;--ld-glow:#ffe030;">
            ⚡ Thanh Lôi Thảo / Truyền Âm
          </div>
          <div class="builder-node-item ld-herb" draggable="true" ondragstart="drag(event)" data-type="Filter Logic" data-icon="⚗️" style="--node-color:#00e5cc;--ld-glow:#00e5cc;">
            ⚗️ Luyện Đan Trận / Luyện Hoá
          </div>
          <div class="builder-node-item ld-herb" draggable="true" ondragstart="drag(event)" data-type="Publish" data-icon="✨" style="--node-color:#ffd700;--ld-glow:#ffd700;">
            ✨ Kim Đan / Xuất Thế
          </div>`
);

// Preset section title
html = html.replace(
  '<div class="builder-title" id="t-p-title">Quy trình mẫu</div>',
  '<div class="builder-title" id="t-p-title">📜 Đơn Phương Mẫu</div>'
);

// ── 4. CANVAS EMPTY STATE ─────────────────────────────────────────────────────
html = html.replace(
  `            <div style="font-size:48px;opacity:0.18;">⬡</div>
            <div style="
              font-family:-apple-system,'Segoe UI',sans-serif;
              font-size:13px;color:rgba(255,255,255,0.22);
              font-weight:400;letter-spacing:0.3px;text-align:center;line-height:1.6;">
              Kéo thả khối từ bên trái<br>hoặc chọn một quy trình mẫu
            </div>`,
  `            <div style="font-size:52px;opacity:0.28;filter:drop-shadow(0 0 18px #ff8800);">🏺</div>
            <div style="
              font-family:'Share Tech Mono',monospace;
              font-size:12px;color:rgba(255,160,60,0.45);
              font-weight:400;letter-spacing:1px;text-align:center;line-height:1.9;">
              Kéo dược liệu vào lò<br>Thi triển pháp thuật — Kim Đan sẽ thành
            </div>`
);

// ── 5. CANVAS BACKGROUND — fire/furnace gradient ──────────────────────────────
// Change the canvas grid background to furnace embers
html = html.replace(
  `            background-image:
              linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
            background-size:40px 40px;`,
  `            background-image:
              linear-gradient(rgba(255,120,0,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,120,0,0.04) 1px, transparent 1px);
            background-size:44px 44px;`
);

// Change ambient glow to fire
html = html.replace(
  `background:radial-gradient(ellipse, rgba(94,159,255,0.06) 0%, transparent 70%);`,
  `background:radial-gradient(ellipse, rgba(255,100,0,0.12) 0%, rgba(255,50,0,0.05) 50%, transparent 70%);`
);

// ── 6. SVG LINE GRADIENT — fire colors ───────────────────────────────────────
html = html.replace(
  `              <linearGradient id="sp-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:rgba(100,220,160,0.8)"/>
                <stop offset="100%" style="stop-color:rgba(94,159,255,0.8)"/>
              </linearGradient>`,
  `              <linearGradient id="sp-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:rgba(255,80,0,0.9)"/>
                <stop offset="50%" style="stop-color:rgba(255,180,0,0.9)"/>
                <stop offset="100%" style="stop-color:rgba(255,220,50,0.85)"/>
              </linearGradient>`
);

// ── 7. FORMATION OVERLAY — replace with furnace/cauldron ─────────────────────
html = html.replace(
  `          <!-- ══ BÁT QUÁI FORMATION OVERLAY ══ -->
          <div id="builder-formation-overlay">
            <!-- Static SVG formation base -->
            <svg viewBox="0 0 600 600" style="position:absolute;width:min(560px,88%);height:min(560px,88%);top:50%;left:50%;transform:translate(-50%,-50%);">
              <defs>
                <radialGradient id="fo-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stop-color="rgba(255,180,0,0.15)"/>
                  <stop offset="100%" stop-color="rgba(255,80,0,0)"/>
                </radialGradient>
              </defs>
              <!-- Center ambient glow -->
              <circle cx="300" cy="300" r="260" fill="url(#fo-glow)"/>
              <!-- Outer ring -->
              <circle cx="300" cy="300" r="248" fill="none" stroke="#ffaa00" stroke-width="1.2" stroke-dasharray="6 8" opacity="0.35"/>
              <!-- Mid ring -->
              <circle cx="300" cy="300" r="190" fill="none" stroke="#ff8800" stroke-width="0.9" stroke-dasharray="3 9" opacity="0.28"/>
              <!-- Inner ring -->
              <circle cx="300" cy="300" r="130" fill="none" stroke="#ffcc44" stroke-width="1" stroke-dasharray="2 6" opacity="0.32"/>
              <!-- Core -->
              <circle cx="300" cy="300" r="70" fill="none" stroke="#ffdd00" stroke-width="1.5" stroke-dasharray="2 4" opacity="0.45"/>
              <!-- Cross axes -->
              <line x1="52" y1="300" x2="548" y2="300" stroke="#ffaa00" stroke-width="0.6" opacity="0.25"/>
              <line x1="300" y1="52" x2="300" y2="548" stroke="#ffaa00" stroke-width="0.6" opacity="0.25"/>
              <line x1="122" y1="122" x2="478" y2="478" stroke="#ff9900" stroke-width="0.5" opacity="0.2"/>
              <line x1="478" y1="122" x2="122" y2="478" stroke="#ff9900" stroke-width="0.5" opacity="0.2"/>
              <!-- 8 trigram position markers -->
              <circle cx="300" cy="52"  r="5" fill="#ffaa00" opacity="0.6"/>
              <circle cx="300" cy="548" r="5" fill="#ffaa00" opacity="0.6"/>
              <circle cx="52"  cy="300" r="5" fill="#ffaa00" opacity="0.6"/>
              <circle cx="548" cy="300" r="5" fill="#ffaa00" opacity="0.6"/>
              <circle cx="122" cy="122" r="4" fill="#ff8800" opacity="0.5"/>
              <circle cx="478" cy="122" r="4" fill="#ff8800" opacity="0.5"/>
              <circle cx="122" cy="478" r="4" fill="#ff8800" opacity="0.5"/>
              <circle cx="478" cy="478" r="4" fill="#ff8800" opacity="0.5"/>
              <!-- Yin-yang center -->
              <circle cx="300" cy="300" r="32" fill="none" stroke="#ffdd00" stroke-width="2" opacity="0.75"/>
              <text x="300" y="312" text-anchor="middle" font-size="32" fill="#ffcc00" opacity="0.7" font-family="serif">☯</text>
            </svg>
            <!-- Rotating outer ring (clockwise, slow) -->
            <div class="xx-ring-cw" style="width:500px;height:500px;border:1px dashed rgba(255,150,0,0.2);animation-duration:12s;"></div>
            <!-- Counter-rotating middle ring -->
            <div class="xx-ring-ccw" style="width:380px;height:380px;border:1px solid rgba(255,120,0,0.15);animation-duration:7s;"></div>
            <!-- Fast inner ring -->
            <div class="xx-ring-cw" style="width:260px;height:260px;border:1px dotted rgba(255,200,0,0.2);animation-duration:4s;"></div>
          </div>`,

  `          <!-- ══ LÒ LUYỆN ĐAN FORMATION OVERLAY ══ -->
          <div id="builder-formation-overlay">
            <!-- Furnace / cauldron SVG -->
            <svg viewBox="0 0 600 600" style="position:absolute;width:min(540px,85%);height:min(540px,85%);top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;">
              <defs>
                <radialGradient id="furnace-core" cx="50%" cy="60%" r="45%">
                  <stop offset="0%"   stop-color="rgba(255,200,60,0.22)"/>
                  <stop offset="50%"  stop-color="rgba(255,80,0,0.10)"/>
                  <stop offset="100%" stop-color="rgba(255,30,0,0)"/>
                </radialGradient>
                <radialGradient id="ember-glow" cx="50%" cy="55%" r="40%">
                  <stop offset="0%"   stop-color="rgba(255,140,0,0.18)"/>
                  <stop offset="100%" stop-color="rgba(255,40,0,0)"/>
                </radialGradient>
              </defs>
              <!-- Outer furnace ring -->
              <circle cx="300" cy="310" r="240" fill="none" stroke="#ff6600" stroke-width="1.5" stroke-dasharray="8 10" opacity="0.3"/>
              <!-- Mid ring — cauldron mouth -->
              <ellipse cx="300" cy="310" rx="175" ry="55" fill="none" stroke="#ff8800" stroke-width="1.2" stroke-dasharray="4 7" opacity="0.35"/>
              <!-- Cauldron body outline -->
              <path d="M130,310 Q110,420 175,470 Q240,510 300,515 Q360,510 425,470 Q490,420 470,310" fill="url(#furnace-core)" stroke="#ff6600" stroke-width="1.3" opacity="0.45"/>
              <!-- Cauldron legs -->
              <line x1="190" y1="505" x2="175" y2="545" stroke="#ff4400" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
              <line x1="300" y1="515" x2="300" y2="555" stroke="#ff4400" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
              <line x1="410" y1="505" x2="425" y2="545" stroke="#ff4400" stroke-width="4" stroke-linecap="round" opacity="0.4"/>
              <!-- Inner fire glow -->
              <ellipse cx="300" cy="370" rx="130" ry="80" fill="url(#ember-glow)"/>
              <!-- Flame wisps (static) -->
              <path d="M280,310 Q270,270 285,240 Q295,210 300,200 Q305,210 315,240 Q330,270 320,310" fill="none" stroke="#ff9900" stroke-width="1.5" opacity="0.3"/>
              <path d="M260,310 Q245,260 265,220 Q275,195 278,180 Q283,195 288,225 Q295,260 280,310" fill="none" stroke="#ff6600" stroke-width="1" opacity="0.22"/>
              <path d="M320,310 Q340,260 322,220 Q312,195 310,178 Q315,192 322,222 Q335,260 340,310" fill="none" stroke="#ff6600" stroke-width="1" opacity="0.22"/>
              <!-- Inscription rings (bát quái style on cauldron) -->
              <circle cx="300" cy="310" r="90"  fill="none" stroke="#ffaa00" stroke-width="0.8" stroke-dasharray="3 5" opacity="0.28"/>
              <circle cx="300" cy="310" r="55"  fill="none" stroke="#ffcc44" stroke-width="1"   stroke-dasharray="2 4" opacity="0.3"/>
              <!-- Center 丹 symbol -->
              <text x="300" y="325" text-anchor="middle" font-size="38" fill="#ffcc00" opacity="0.5" font-family="serif" letter-spacing="2">丹</text>
            </svg>
            <!-- Slowly rotating ember ring -->
            <div class="xx-ring-cw"  style="width:480px;height:480px;border:1px dashed rgba(255,100,0,0.18);animation-duration:18s;"></div>
            <!-- Counter-rotating rune ring -->
            <div class="xx-ring-ccw" style="width:350px;height:350px;border:1px solid rgba(255,150,0,0.13);animation-duration:10s;"></div>
            <!-- Inner fast spin -->
            <div class="xx-ring-cw"  style="width:210px;height:210px;border:1px dotted rgba(255,200,50,0.18);animation-duration:5s;"></div>
          </div>`
);

// ── 8. CSS — node item alchemy styling ───────────────────────────────────────
// Add luyện đan CSS after existing builder CSS block (after .builder-node-item:active)
html = html.replace(
  '    .builder-node-item:active { cursor: grabbing; transform: scale(0.97); }',
  `    .builder-node-item:active { cursor: grabbing; transform: scale(0.97); }

    /* ── Luyện Đan herb items ── */
    .builder-node-item.ld-herb {
      border-color: color-mix(in srgb, var(--ld-glow, #ff8800) 30%, transparent);
      background: color-mix(in srgb, var(--ld-glow, #ff8800) 8%, rgba(10,5,0,0.5));
      color: color-mix(in srgb, var(--ld-glow, #ff8800) 80%, #fff);
    }
    .builder-node-item.ld-herb:hover {
      background: color-mix(in srgb, var(--ld-glow, #ff8800) 18%, rgba(15,8,0,0.6));
      border-color: color-mix(in srgb, var(--ld-glow, #ff8800) 60%, transparent);
      box-shadow: 0 0 18px color-mix(in srgb, var(--ld-glow, #ff8800) 35%, transparent),
                  0 6px 20px rgba(0,0,0,0.4);
      color: var(--ld-glow, #ff8800);
    }
    /* ── Canvas background: furnace ── */
    #builder-canvas {
      background: radial-gradient(ellipse at 50% 65%,
        rgba(60,20,0,0.9) 0%,
        rgba(20,8,0,0.95) 55%,
        rgba(5,3,0,0.98) 100%) !important;
    }
    /* ── Spark drop animation ── */
    @keyframes ld-spark-rise {
      0%   { transform: translate(var(--sx,0px), 0) scale(1); opacity: 1; }
      100% { transform: translate(var(--sx,0px), -80px) scale(0); opacity: 0; }
    }
    .ld-spark {
      position: absolute; border-radius: 50%; pointer-events: none; z-index: 100;
      animation: ld-spark-rise 0.7s ease-out forwards;
    }
    @keyframes ld-herb-land {
      0%   { transform: scale(0.4) rotate(-12deg); opacity: 0; filter: brightness(4); }
      40%  { transform: scale(1.18) rotate(4deg);  opacity: 1; filter: brightness(2); }
      70%  { transform: scale(0.94) rotate(-1deg); opacity: 1; filter: brightness(1.3); }
      100% { transform: scale(1)    rotate(0deg);  opacity: 1; filter: brightness(1); }
    }
    .ld-herb-land { animation: ld-herb-land 0.55s cubic-bezier(0.34,1.56,0.64,1) both; }
    /* ── Connection lines: fire pulse ── */
    .builder-line {
      stroke: url(#sp-line-grad) !important;
      filter: drop-shadow(0 0 4px rgba(255,140,0,0.7)) drop-shadow(0 0 10px rgba(255,60,0,0.4)) !important;
      opacity: 0.85 !important;
      stroke-width: 2px !important;
    }
    /* ── Ember particle dot (runs along line) ── */
    @keyframes ld-ember-travel {
      0%   { opacity: 0; }
      10%  { opacity: 1; }
      90%  { opacity: 1; }
      100% { opacity: 0; }
    }`
);

// ── 9. JS — theme translation updates ────────────────────────────────────────
// Update the text translations for t-build-l and t-b-title
html = html.replace(
  "{ sel: '#t-build-l', xx: 'TRẬN PHÁP BUILDER', vi: 'CÔNG CỤ XÂY DỰNG', en: 'WORKFLOW BUILDER' },",
  "{ sel: '#t-build-l', xx: 'LÒ LUYỆN ĐAN', vi: 'LÒ LUYỆN ĐAN', en: 'ALCHEMY FURNACE' },"
);
html = html.replace(
  "{ sel: '#t-build-s', xx: 'TẠO LUỒNG AI', vi: 'TẠO LUỒNG AI', en: 'CREATE AI PIPELINE' },",
  "{ sel: '#t-build-s', xx: 'LUYỆN ĐAN PHÁP THUẬT', vi: 'LUYỆN ĐAN PHÁP THUẬT', en: 'ALCHEMY PIPELINE' },"
);
html = html.replace(
  "{ sel: '#t-b-title', xx: 'KHO TÀNG PHÁP KHÍ', vi: 'THƯ VIỆN MÔ-ĐUN', en: 'MODULE LIBRARY' },",
  "{ sel: '#t-b-title', xx: '⚗️ Dược Liệu Trân Quý', vi: '⚗️ Dược Liệu Trân Quý', en: '⚗️ Ingredient Library' },"
);
html = html.replace(
  "{ sel: '#t-p-title', xx: 'TRẬN PHÁP MẪU', vi: 'MẪU QUY TRÌNH', en: 'WORKFLOW PRESETS' },",
  "{ sel: '#t-p-title', xx: '📜 Đơn Phương Mẫu', vi: '📜 Đơn Phương Mẫu', en: '📜 Recipe Presets' },"
);

// ── 10. JS — drop function: add spark effect on node landing ─────────────────
// Find the drop function and inject sparks after canvas.appendChild(node)
html = html.replace(
  `  canvas.appendChild(node);
  bNodes.push(node);
  drawLines();
  draggedType = null;`,
  `  node.classList.add('ld-herb-land');
  canvas.appendChild(node);
  bNodes.push(node);
  drawLines();
  draggedType = null;
  // ── Luyện Đan spark burst ──
  spawnLdSparks(canvas, x + 60, y + 20);`
);

// Add spawnLdSparks function before the closing </script> of the last script
// Find the runWorkflow function and add after it
html = html.replace(
  `function clearBuilder() {`,
  `function spawnLdSparks(canvas, cx, cy) {
  const colors = ['#ff8800','#ffcc00','#ff4400','#ff6600','#ffff00','#ff9900'];
  for (let i = 0; i < 18; i++) {
    const sp = document.createElement('div');
    sp.className = 'ld-spark';
    const size = 3 + Math.random() * 5;
    const angle = Math.random() * Math.PI * 2;
    const dist  = 20 + Math.random() * 55;
    const sx    = Math.cos(angle) * dist;
    const sy    = Math.sin(angle) * dist;
    sp.style.cssText = \`
      width:\${size}px;height:\${size}px;
      left:\${cx + sx - size/2}px;
      top:\${cy + sy - size/2}px;
      background:\${colors[Math.floor(Math.random()*colors.length)]};
      box-shadow:0 0 \${size*2}px \${colors[Math.floor(Math.random()*colors.length)]};
      --sx:\${sx * 0.6}px;
      animation-duration:\${0.4 + Math.random() * 0.5}s;
      animation-delay:\${Math.random() * 0.12}s;
    \`;
    canvas.appendChild(sp);
    setTimeout(() => sp.remove(), 900);
  }
}

function clearBuilder() {`
);

// ── 11. Guide modal text about builder ───────────────────────────────────────
html = html.replace(
  '🔮 <b style="color:#ff88ff;">TRẬN PHÁP BUILDER</b> — kéo thả để tạo luồng AI tự động',
  '🔥 <b style="color:#ffaa44;">LÒ LUYỆN ĐAN</b> — thả dược liệu vào lò để luyện luồng AI tự động'
);

fs.writeFileSync('tienhiepv3.html', html, 'utf-8');
console.log('✅ Luyện Đan Builder transformation complete!');
