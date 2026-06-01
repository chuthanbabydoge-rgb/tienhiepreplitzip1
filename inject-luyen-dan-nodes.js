const fs = require('fs');
let html = fs.readFileSync('tienhiepv3.html', 'utf-8');

// ── 1. UPDATE _nodeData — alchemy ingredient names, fire colors ────────────
html = html.replace(
  `    const _nodeData = {
      'Data Source': { icon:'📥', color:'#4488ff', bg:'rgba(0,8,38,0.96)',  glow:'rgba(60,130,255,0.5)',  ring:'rgba(80,150,255,0.16)', badge:'水·WATER',   xxName:'Thủy Nguyên Khí'  },
      'LLM Engine':  { icon:'🧠', color:'#cc55ff', bg:'rgba(15,0,38,0.96)', glow:'rgba(200,80,255,0.5)', ring:'rgba(180,80,255,0.16)', badge:'魂·SOUL',    xxName:'Thần Hồn Lực'     },
      'Vision API':  { icon:'👁', color:'#ffcc00', bg:'rgba(26,18,0,0.96)', glow:'rgba(255,200,0,0.5)',  ring:'rgba(255,200,0,0.16)',  badge:'光·LIGHT',   xxName:'Thiên Nhãn Thức'  },
      'Audio Gen':   { icon:'🎵', color:'#ff5533', bg:'rgba(32,5,0,0.96)',  glow:'rgba(255,80,40,0.5)',  ring:'rgba(255,80,40,0.16)',  badge:'火·FIRE',    xxName:'Hỏa Âm Pháp'     },
      'Filter Logic':{ icon:'⚡', color:'#bb44ff', bg:'rgba(18,0,38,0.96)', glow:'rgba(180,60,255,0.5)', ring:'rgba(180,60,255,0.16)', badge:'雷·THUNDER', xxName:'Lôi Pháp Ấn'     },
      'Publish':     { icon:'🚀', color:'#00ff88', bg:'rgba(0,24,12,0.96)', glow:'rgba(0,255,130,0.5)',  ring:'rgba(0,255,120,0.16)',  badge:'木·WOOD',    xxName:'Mộc Xuất Thế'    },
    };`,
  `    const _nodeData = {
      'Data Source': { icon:'🌿', color:'#50c878', bg:'rgba(0,18,8,0.96)',  glow:'rgba(60,200,100,0.55)',  ring:'rgba(80,200,120,0.18)', badge:'木·MỘC',    xxName:'Linh Căn Thảo'   },
      'LLM Engine':  { icon:'🔥', color:'#ff6030', bg:'rgba(30,6,0,0.96)', glow:'rgba(255,90,30,0.55)',  ring:'rgba(255,80,30,0.18)',  badge:'火·HỎA',    xxName:'Thiên Hỏa Tinh'  },
      'Vision API':  { icon:'💎', color:'#cc88ff', bg:'rgba(18,0,32,0.96)', glow:'rgba(200,120,255,0.55)', ring:'rgba(180,100,255,0.18)', badge:'水·THỦY',  xxName:'Huyền Tinh Thạch' },
      'Audio Gen':   { icon:'⚡', color:'#ffe030', bg:'rgba(26,20,0,0.96)', glow:'rgba(255,220,30,0.55)', ring:'rgba(255,210,40,0.18)', badge:'雷·LÔI',    xxName:'Thanh Lôi Thảo'  },
      'Filter Logic':{ icon:'⚗️', color:'#00e5cc', bg:'rgba(0,22,20,0.96)', glow:'rgba(0,220,200,0.55)',  ring:'rgba(0,200,180,0.18)',  badge:'水·HUYỀN',  xxName:'Luyện Đan Trận'   },
      'Publish':     { icon:'✨', color:'#ffd700', bg:'rgba(24,18,0,0.96)', glow:'rgba(255,210,0,0.55)',  ring:'rgba(255,200,0,0.18)',  badge:'金·KIM',    xxName:'Kim Đan Thành'    },
    };`
);

// ── 2. REPLACE _mkNodeHtml — pháp luân wheel → luyện đan ingredient orb ────
html = html.replace(
  `    function _mkNodeHtml(rawType, dispName) {
      const typeKey = (rawType||'').split(' / ')[0].trim();
      const d = _nodeData[typeKey] || _ndList[_nodeHash(typeKey) % _ndList.length];
      return \`<div class="node-card" style="--nc:\${d.color};--nc-bg:\${d.bg};--nc-glow:\${d.glow};--nc-ring:\${d.ring};">
        <div class="phap-luan-wheel">
          <svg class="plaw-svg" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Outer rim -->
            <circle cx="40" cy="40" r="36" stroke="currentColor" stroke-width="2.2"/>
            <!-- Middle ring -->
            <circle cx="40" cy="40" r="24" stroke="currentColor" stroke-width="0.9" opacity="0.5"/>
            <!-- Inner ring -->
            <circle cx="40" cy="40" r="13" stroke="currentColor" stroke-width="0.9" opacity="0.4"/>
            <!-- 8 căm (bát quái spokes) -->
            <line x1="40" y1="4" x2="40" y2="76" stroke="currentColor" stroke-width="2"/>
            <line x1="4" y1="40" x2="76" y2="40" stroke="currentColor" stroke-width="2"/>
            <line x1="14.9" y1="14.9" x2="65.1" y2="65.1" stroke="currentColor" stroke-width="1.5"/>
            <line x1="65.1" y1="14.9" x2="14.9" y2="65.1" stroke="currentColor" stroke-width="1.5"/>
            <!-- Bát cực dots at rim (8 directions) -->
            <circle cx="40" cy="4" r="2.8" fill="currentColor"/>
            <circle cx="76" cy="40" r="2.8" fill="currentColor"/>
            <circle cx="40" cy="76" r="2.8" fill="currentColor"/>
            <circle cx="4" cy="40" r="2.8" fill="currentColor"/>
            <circle cx="65.1" cy="14.9" r="2.2" fill="currentColor" opacity="0.8"/>
            <circle cx="65.1" cy="65.1" r="2.2" fill="currentColor" opacity="0.8"/>
            <circle cx="14.9" cy="65.1" r="2.2" fill="currentColor" opacity="0.8"/>
            <circle cx="14.9" cy="14.9" r="2.2" fill="currentColor" opacity="0.8"/>
            <!-- Hub trung tâm -->
            <circle cx="40" cy="40" r="5.5" fill="currentColor" opacity="0.95"/>
          </svg>
          <div class="plaw-hub"></div>
        </div>
        <div class="node-name-xx">\${dispName}</div>
      </div>\`;
    }`,
  `    function _mkNodeHtml(rawType, dispName) {
      const typeKey = (rawType||'').split(' / ')[0].trim();
      const d = _nodeData[typeKey] || _ndList[_nodeHash(typeKey) % _ndList.length];
      return \`<div class="node-card ld-node-card" style="--nc:\${d.color};--nc-bg:\${d.bg};--nc-glow:\${d.glow};--nc-ring:\${d.ring};">
        <div class="ld-ingredient-orb">
          <svg class="ld-orb-svg" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Outer pulse ring -->
            <circle cx="40" cy="40" r="37" stroke="currentColor" stroke-width="1" stroke-dasharray="3 7" opacity="0.4"/>
            <!-- Hexagon jar shape (lục giác linh phẩm) -->
            <polygon points="40,6 69,22 69,58 40,74 11,58 11,22"
              stroke="currentColor" stroke-width="2" fill="currentColor" fill-opacity="0.08" opacity="0.75"/>
            <!-- Inner hexagon shine -->
            <polygon points="40,16 61,28 61,52 40,64 19,52 19,28"
              stroke="currentColor" stroke-width="0.8" fill="none" opacity="0.35"/>
            <!-- Center pill circle -->
            <circle cx="40" cy="40" r="14" fill="currentColor" opacity="0.18"/>
            <circle cx="40" cy="40" r="9" fill="currentColor" opacity="0.55"/>
            <!-- 6 ember dots at hexagon vertices -->
            <circle cx="40" cy="6"  r="2.8" fill="currentColor" opacity="0.7"/>
            <circle cx="69" cy="22" r="2.2" fill="currentColor" opacity="0.6"/>
            <circle cx="69" cy="58" r="2.2" fill="currentColor" opacity="0.6"/>
            <circle cx="40" cy="74" r="2.8" fill="currentColor" opacity="0.7"/>
            <circle cx="11" cy="58" r="2.2" fill="currentColor" opacity="0.6"/>
            <circle cx="11" cy="22" r="2.2" fill="currentColor" opacity="0.6"/>
            <!-- Ingredient rune lines -->
            <line x1="40" y1="16" x2="40" y2="64" stroke="currentColor" stroke-width="0.6" opacity="0.25"/>
            <line x1="19" y1="28" x2="61" y2="52" stroke="currentColor" stroke-width="0.6" opacity="0.25"/>
            <line x1="61" y1="28" x2="19" y2="52" stroke="currentColor" stroke-width="0.6" opacity="0.25"/>
          </svg>
          <div class="ld-orb-icon">\${d.icon}</div>
        </div>
        <div class="node-name-xx">\${dispName}</div>
      </div>\`;
    }`
);

// ── 3. UPDATE _spGradDefs — replace purple mandala gradient with fire ────────
html = html.replace(
  `      return \`<defs>
        <linearGradient id="sp-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:rgba(180,80,255,0.9)"/>
          <stop offset="50%" style="stop-color:rgba(80,200,255,0.9)"/>
          <stop offset="100%" style="stop-color:rgba(255,180,60,0.9)"/>
        </linearGradient>
        <radialGradient id="sp-center-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:rgba(120,80,255,0.18)"/>
          <stop offset="100%" style="stop-color:rgba(0,0,0,0)"/>
        </radialGradient>`,
  `      return \`<defs>
        <linearGradient id="sp-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   style="stop-color:rgba(255,80,0,0.95)"/>
          <stop offset="45%"  style="stop-color:rgba(255,180,0,0.95)"/>
          <stop offset="100%" style="stop-color:rgba(255,230,60,0.9)"/>
        </linearGradient>
        <radialGradient id="sp-center-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style="stop-color:rgba(255,120,0,0.20)"/>
          <stop offset="100%" style="stop-color:rgba(0,0,0,0)"/>
        </radialGradient>`
);

// Also fix the mid-point orb and bright core color in drawLines
html = html.replace(
  `        paths += \`<circle cx="\${mx.toFixed(1)}" cy="\${my.toFixed(1)}" r="2.5" fill="rgba(180,120,255,0.55)" filter="url(#particle-glow-sm)"/>\`;`,
  `        paths += \`<circle cx="\${mx.toFixed(1)}" cy="\${my.toFixed(1)}" r="2.5" fill="rgba(255,180,40,0.65)" filter="url(#particle-glow-sm)"/>\`;`
);
html = html.replace(
  `        // Bright core tia sáng
        paths += \`<path d="M\${p1.x},\${p1.y} L\${p2.x},\${p2.y}" stroke="rgba(220,200,255,0.28)" stroke-width="0.6" fill="none"/>\`;`,
  `        // Bright core ember beam
        paths += \`<path d="M\${p1.x},\${p1.y} L\${p2.x},\${p2.y}" stroke="rgba(255,230,120,0.25)" stroke-width="0.6" fill="none"/>\`;`
);

// ── 4. FIX loadPreset reset — update status + button text to luyện đan ──────
html = html.replace(
  `      if (runBtn) { runBtn.disabled = false; runBtn.style.opacity = ''; runBtn.innerHTML = '⚡ VẬN TRẬN'; }
      _setBuilderStatus('LINH KHÍ SẴN SÀNG', '#ffaa00');`,
  `      if (runBtn) { runBtn.disabled = false; runBtn.style.opacity = ''; runBtn.innerHTML = '🔥 KHAI LÒ'; }
      _setBuilderStatus('LÒ ĐAN SẴN SÀNG', '#ff8800');`
);

// Also fix any other places that reset the run button text
html = html.replace(
  /runBtn\.innerHTML\s*=\s*'⚡ VẬN TRẬN'/g,
  `runBtn.innerHTML = '🔥 KHAI LÒ'`
);

// ── 5. UPDATE xxNodePrefix & xxNodeSuffix — to alchemy ingredient words ─────
html = html.replace(
  `        const xxNodePrefix = ["Luyện", "Tụ", "Thu", "Phát", "Hóa", "Tạo", "Truy", "Thám", "Kiến", "Phân"];
        const xxNodeSuffix = ["Khí", "Hồn", "Tâm", "Thần", "Linh", "Cảnh", "Ảnh", "Âm", "Thức", "Mạch"];`,
  `        const xxNodePrefix = ["Linh", "Hỏa", "Băng", "Lôi", "Kim", "Mộc", "Thủy", "Huyền", "Thiên", "Ngọc", "Địa", "Quang", "Dương", "Âm", "Phong", "Hồng"];
        const xxNodeSuffix = ["Căn", "Thảo", "Tinh", "Hoàn", "Đan", "Hoa", "Nhũ", "Chi", "Dịch", "Cốt", "Quả", "Phấn", "Khí", "Nhân", "Lực", "Thạch"];`
);

// ── 6. ADD CSS — luyện đan ingredient orb styles + fix run states ─────────────
html = html.replace(
  `    .node-card::before, .node-card::after { display: none; }`,
  `    .node-card::before, .node-card::after { display: none; }

    /* ══ LUYỆN ĐAN INGREDIENT ORB ══ */
    .ld-ingredient-orb {
      position: relative;
      width: 76px; height: 76px;
      display: flex; align-items: center; justify-content: center;
    }
    .ld-orb-svg {
      width: 76px; height: 76px;
      color: var(--nc, #ff8800);
      filter:
        drop-shadow(0 0 5px var(--nc, #ff8800))
        drop-shadow(0 0 14px var(--nc, #ff8800));
      animation: ld-orb-float 3.5s ease-in-out infinite alternate;
      overflow: visible;
    }
    @keyframes ld-orb-float {
      from {
        filter: drop-shadow(0 0 4px var(--nc,#ff8800)) drop-shadow(0 0 10px var(--nc,#ff8800));
        transform: translateY(0px);
      }
      to {
        filter: drop-shadow(0 0 11px var(--nc,#ff8800)) drop-shadow(0 0 28px var(--nc,#ff8800));
        transform: translateY(-4px);
      }
    }
    .ld-orb-icon {
      position: absolute;
      font-size: 22px;
      line-height: 1;
      pointer-events: none;
      filter: drop-shadow(0 0 8px var(--nc, #ff8800));
      animation: ld-orb-icon-pulse 2.8s ease-in-out infinite alternate;
    }
    @keyframes ld-orb-icon-pulse {
      from { transform: scale(0.92); opacity: 0.88; }
      to   { transform: scale(1.08); opacity: 1; }
    }`
);

// ── 7. UPDATE run states CSS — target .ld-orb-svg and .ld-orb-icon ──────────
// Running state
html = html.replace(
  `    .canvas-node.sp-running .plaw-svg { color:#ffaa00 !important; filter: drop-shadow(0 0 14px #ffaa00) drop-shadow(0 0 36px #ff8800) !important; animation-duration: 1.1s !important; }
    .canvas-node.sp-running .plaw-hub { background:#ffaa00 !important; box-shadow: 0 0 22px #ffaa00, 0 0 50px #ff8800 !important; animation-duration: 0.4s !important; }
    .canvas-node.sp-running .node-name-xx { color:#ffe080 !important; text-shadow:0 0 18px rgba(255,180,0,1) !important; }`,
  `    .canvas-node.sp-running .plaw-svg { color:#ffaa00 !important; filter: drop-shadow(0 0 14px #ffaa00) drop-shadow(0 0 36px #ff8800) !important; animation-duration: 1.1s !important; }
    .canvas-node.sp-running .plaw-hub { background:#ffaa00 !important; box-shadow: 0 0 22px #ffaa00, 0 0 50px #ff8800 !important; animation-duration: 0.4s !important; }
    .canvas-node.sp-running .ld-orb-svg { color:#ffcc00 !important; filter: drop-shadow(0 0 16px #ffcc00) drop-shadow(0 0 40px #ff8800) !important; animation-duration: 0.8s !important; }
    .canvas-node.sp-running .ld-orb-icon { filter: drop-shadow(0 0 18px #ffcc00) drop-shadow(0 0 36px #ff6600) !important; animation-duration: 0.4s !important; transform: scale(1.2) !important; }
    .canvas-node.sp-running .node-name-xx { color:#ffe080 !important; text-shadow:0 0 18px rgba(255,180,0,1) !important; }`
);

// Khai tran burst for ld-orb
html = html.replace(
  `    .canvas-node.khai-tran .plaw-svg {
      animation: khai-tran-burst 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards !important;
      color: #ffe030 !important;
      filter: drop-shadow(0 0 24px #ffe030) drop-shadow(0 0 60px #ff9900) !important;
    }
    .canvas-node.khai-tran .plaw-hub {
      background: #ffe030 !important;
      box-shadow: 0 0 30px #ffe030, 0 0 70px #ff9900 !important;
      animation: khai-hub-burst 0.7s ease-out forwards !important;
    }`,
  `    .canvas-node.khai-tran .plaw-svg {
      animation: khai-tran-burst 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards !important;
      color: #ffe030 !important;
      filter: drop-shadow(0 0 24px #ffe030) drop-shadow(0 0 60px #ff9900) !important;
    }
    .canvas-node.khai-tran .plaw-hub {
      background: #ffe030 !important;
      box-shadow: 0 0 30px #ffe030, 0 0 70px #ff9900 !important;
      animation: khai-hub-burst 0.7s ease-out forwards !important;
    }
    .canvas-node.khai-tran .ld-orb-svg {
      animation: khai-tran-burst 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards !important;
      color: #ffe030 !important;
      filter: drop-shadow(0 0 30px #ffe030) drop-shadow(0 0 70px #ff6600) !important;
    }
    .canvas-node.khai-tran .ld-orb-icon {
      animation: khai-hub-burst 0.7s ease-out forwards !important;
      filter: drop-shadow(0 0 40px #ffe030) !important;
    }`
);

// Done state for ld-orb
html = html.replace(
  `    .canvas-node.sp-done .plaw-svg { color:#00ffaa !important; filter: drop-shadow(0 0 8px #00ffaa) drop-shadow(0 0 20px #00ffaa) !important; }
    .canvas-node.sp-done .plaw-hub { background:#00ffaa !important; box-shadow: 0 0 14px #00ffaa, 0 0 28px #00ffaa !important; }
    .canvas-node.sp-done .node-name-xx { color:#00ffaa !important; text-shadow:0 0 12px rgba(0,255,160,1) !important; }`,
  `    .canvas-node.sp-done .plaw-svg { color:#00ffaa !important; filter: drop-shadow(0 0 8px #00ffaa) drop-shadow(0 0 20px #00ffaa) !important; }
    .canvas-node.sp-done .plaw-hub { background:#00ffaa !important; box-shadow: 0 0 14px #00ffaa, 0 0 28px #00ffaa !important; }
    .canvas-node.sp-done .ld-orb-svg { color:#ffd700 !important; filter: drop-shadow(0 0 14px #ffd700) drop-shadow(0 0 32px #ffaa00) !important; }
    .canvas-node.sp-done .ld-orb-icon { filter: drop-shadow(0 0 22px #ffd700) !important; }
    .canvas-node.sp-done .node-name-xx { color:#ffd700 !important; text-shadow:0 0 14px rgba(255,210,0,1) !important; }`
);

// Error state for ld-orb
html = html.replace(
  `    .canvas-node.sp-error .plaw-svg { color:#ff3333 !important; filter: drop-shadow(0 0 10px #ff3333) drop-shadow(0 0 22px #ff3333) !important; }
    .canvas-node.sp-error .plaw-hub { background:#ff3333 !important; box-shadow: 0 0 14px #ff3333 !important; }
    .canvas-node.sp-error .node-name-xx { color:#ff6666 !important; }`,
  `    .canvas-node.sp-error .plaw-svg { color:#ff3333 !important; filter: drop-shadow(0 0 10px #ff3333) drop-shadow(0 0 22px #ff3333) !important; }
    .canvas-node.sp-error .plaw-hub { background:#ff3333 !important; box-shadow: 0 0 14px #ff3333 !important; }
    .canvas-node.sp-error .ld-orb-svg { color:#ff3333 !important; filter: drop-shadow(0 0 12px #ff3333) drop-shadow(0 0 24px #ff3333) !important; }
    .canvas-node.sp-error .ld-orb-icon { filter: drop-shadow(0 0 16px #ff3333) !important; }
    .canvas-node.sp-error .node-name-xx { color:#ff6666 !important; }`
);

// ── 8. UPDATE xxNames presets to luyện đan themed names ─────────────────────
html = html.replace(
  `    const xxNames = [
      "Thiên Lý Nhãn (News)", "Truyền Âm Lược Ảnh", "Huyễn Ảnh Thuật", "Luyện Khí Quyết", "Kim Tiền Trận",
      "Thiên Cơ Các", "Độn Giáp Thuật (SEO)", "Tụ Bảo Bồn (Affiliate)", "Mê Hồn Trận (Ads)", "Thần Nhãn Ảnh (Video)",
      "Linh Thư Điêu Khắc", "Bát Quái Trận (Ecom)", "Sưu Hồn Thuật (Social)", "Thính Âm Công", "Thám Báo Các (Data)",
      "Ngọc Giản Quyết", "Tiên Âm Ký (Chatbot)", "Huyễn Cảnh Lục (Images)", "Truy Hồn Thuật (Leads)", "Vạn Tượng Trận"
    ];`,
  `    const xxNames = [
      "Thiên Lý Linh Căn (News)", "Hỏa Tinh Luyện Ảnh", "Băng Hồn Huyễn Thuật", "Kim Đan Quyết Pháp", "Hoàng Kim Đan Trận",
      "Huyền Cơ Linh Các", "Địa Mạch Đan Pháp (SEO)", "Tụ Bảo Luyện Đan (Affiliate)", "Mê Hồn Dược Trận (Ads)", "Thần Nhãn Đan Kinh (Video)",
      "Ngọc Giản Luyện Khắc", "Bát Hoàn Đại Trận (Ecom)", "Linh Thảo Hội Tụ (Social)", "Thanh Âm Luyện Pháp", "Thiên Địa Dược Các (Data)",
      "Ngọc Hoàn Luyện Quyết", "Tiên Đan Linh Ký (Chatbot)", "Huyễn Cảnh Đan Lục (Images)", "Truy Linh Thảo Thuật (Leads)", "Vạn Đan Thiên Trận"
    ];`
);

// ── 9. UPDATE particle colors in _spawnParticles to fire/ember ───────────────
html = html.replace(
  `        { r: 4.5, fill: '#ffee44', opacity: 1,    filter: 'particle-glow',    dur: '0.62s', begin: '0s'    },
        { r: 2.5, fill: '#ffffff', opacity: 0.95,  filter: 'particle-glow-sm', dur: '0.62s', begin: '0.21s' },
        { r: 3.5, fill: '#ffcc00', opacity: 0.85,  filter: 'particle-glow',    dur: '0.62s', begin: '0.41s' },
        { r: 1.8, fill: '#ffe8a0', opacity: 0.7,   filter: 'particle-glow-sm', dur: '0.62s', begin: '0.52s' },`,
  `        { r: 4.5, fill: '#ff8800', opacity: 1,    filter: 'particle-glow',    dur: '0.62s', begin: '0s'    },
        { r: 2.5, fill: '#ffdd44', opacity: 0.95,  filter: 'particle-glow-sm', dur: '0.62s', begin: '0.21s' },
        { r: 3.5, fill: '#ff6600', opacity: 0.85,  filter: 'particle-glow',    dur: '0.62s', begin: '0.41s' },
        { r: 1.8, fill: '#ffcc80', opacity: 0.7,   filter: 'particle-glow-sm', dur: '0.62s', begin: '0.52s' },`
);

fs.writeFileSync('tienhiepv3.html', html, 'utf-8');
console.log('✅ Luyện Đan node transformation complete!');
// Count verifications
const checks = [
  ['ld-ingredient-orb', 'Ingredient orb container'],
  ['ld-orb-svg', 'Orb SVG (hexagon)'],
  ['ld-orb-icon', 'Orb icon overlay'],
  ['Linh Căn Thảo', 'Updated _nodeData'],
  ['Thiên Hỏa Tinh', 'Thiên Hỏa node'],
  ['LÒ ĐAN SẴN SÀNG', 'Reset status text'],
  ['🔥 KHAI LÒ', 'Reset button text'],
  ['Linh Căn Thảo.*node.*prefix|xxNodePrefix.*Linh', 'Ingredient prefix'],
  ['rgba(255,80,0,0.95)', 'Fire gradient'],
];
let ok = 0;
checks.forEach(([pattern, label]) => {
  if (new RegExp(pattern).test(html)) { console.log(`  ✅ ${label}`); ok++; }
  else { console.log(`  ❌ MISSING: ${label}`); }
});
console.log(`\n${ok}/${checks.length} checks passed.`);
