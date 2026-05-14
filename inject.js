const fs = require('fs');

let html = fs.readFileSync('tienhiepv3.html', 'utf-8');

// 1. Dharma Wheel
if(!html.includes('dharma-wheel')) {
  html = html.replace('<div class="hologram-circle"></div>', 
  `<div class="hologram-circle"></div>
      <svg class="dharma-wheel" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#00ffff" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>
        <path d="M50 5 L50 95 M5 50 L95 50 M18 18 L82 82 M18 82 L82 18" stroke="#00ffff" stroke-width="0.5" opacity="0.3"/>
        <circle cx="50" cy="50" r="30" fill="none" stroke="#00ff88" stroke-width="1" stroke-dasharray="2 6" opacity="0.8"/>
      </svg>`);
}

// 2. Right Sidebar Buttons
if(!html.includes('openGuide()')) {
  html = html.replace('<div class="panel-btn" onclick="openNeural()">',
  `<div class="panel-btn" onclick="openGuide()">
        <span class="icon">📖</span>
        <div><div class="pbtn-label" id="guide-lbl">BÍ KÍP VŨ TRỤ</div><div class="pbtn-sub" id="guide-sub">HƯỚNG DẪN TÂN THỦ</div></div>
      </div>
      <div class="panel-btn" onclick="openBuilder()">
        <span class="icon">🔮</span>
        <div><div class="pbtn-label" id="t-build-l">TRẬN PHÁP BUILDER</div><div class="pbtn-sub" id="t-build-s">TẠO LUỒNG AI</div></div>
      </div>
      <div class="panel-btn" onclick="toggleTheme()">
        <span class="icon">☯️</span>
        <div><div class="pbtn-label" id="theme-lbl">VĂN PHONG: TIÊN HIỆP</div><div class="pbtn-sub" id="theme-sub">CHUYỂN SANG SCI-FI</div></div>
      </div>
      <div class="panel-btn" onclick="openNeural()">`);
}

// 3. CSS
if(!html.includes('.builder-modal-content')) {
  html = html.replace('</style>', `
  .dharma-wheel {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 280px; height: 280px; z-index: 1;
    animation: rotateDharma 20s linear infinite; pointer-events: none;
  }
  @keyframes rotateDharma { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
  #agent-avatar { z-index: 2; position: relative; }

  #builder-modal.show { display:flex; }
  .builder-modal-content {
    background:rgba(0,10,20,0.95);border:2px solid #00ffff;box-shadow:0 0 30px rgba(0,255,255,0.3);
    border-radius:15px;width:95%;max-width:1400px;height:90vh;display:flex;flex-direction:column;position:relative;
  }
  #builder-layout { display:flex; flex:1; overflow:hidden; }
  #builder-sidebar { width:250px; background:rgba(0,20,40,0.8); border-right:1px solid #00ffff44; padding:20px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; }
  #builder-canvas { flex:1; position:relative; overflow:hidden; background:radial-gradient(circle at center, #001122 0%, #000 100%); }
  #builder-svg { position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; }
  .builder-line { fill:none; stroke:#00ff88; stroke-width:2; stroke-dasharray:5 5; animation:flow 2s linear infinite; }
  @keyframes flow { to { stroke-dashoffset: -10; } }
  
  .builder-title{font-family:'Orbitron',sans-serif;font-size:16px;color:#00ffff;letter-spacing:4px;margin-bottom:20px;}
  .builder-node-item{background:rgba(0,255,255,0.1);border:1px solid #00ffff44;padding:10px;cursor:grab;color:#00ffff;font-size:11px;text-align:center;transition:all .2s;}
  .builder-node-item:hover{background:rgba(0,255,255,0.2);box-shadow:0 0 10px rgba(0,255,255,0.4);}
  .preset-btn{background:rgba(255,170,0,0.1);border:1px solid rgba(255,170,0,0.4);padding:8px;cursor:pointer;color:#ffaa00;font-size:10px;text-align:center;transition:all .2s;font-family:'Orbitron',sans-serif;}
  .preset-btn:hover{background:rgba(255,170,0,0.3);box-shadow:0 0 10px rgba(255,170,0,0.5);}
  .canvas-node{position:absolute;background:rgba(0,20,40,0.9);border:1px solid #00ff88;color:#00ff88;padding:10px 16px;cursor:move;font-size:11px;min-width:120px;text-align:center;box-shadow:0 0 15px rgba(0,255,136,0.2);user-select:none;}
  .canvas-node::after{content:'';position:absolute;right:-6px;top:50%;transform:translateY(-50%);width:12px;height:12px;background:#00ff88;border-radius:50%;box-shadow:0 0 5px #00ff88;}
  .canvas-node::before{content:'';position:absolute;left:-6px;top:50%;transform:translateY(-50%);width:12px;height:12px;background:#00ffff;border-radius:50%;box-shadow:0 0 5px #00ffff;}
</style>`);
}

// 4. Modals HTML
if(!html.includes('id="builder-modal"')) {
  html = html.replace('<div class="modal-overlay" id="compare-modal">',
  `<div class="modal-overlay" id="builder-modal">
  <div class="builder-modal-content">
    <button class="close-btn" onclick="closeBuilder()">×</button>
    <div style="padding:15px; border-bottom:1px solid #00ffff44; display:flex; justify-content:space-between; align-items:center;">
      <div class="builder-title" style="margin:0;">TRẬN PHÁP BUILDER (BETA)</div>
      <div style="color:#00ff88; font-size:12px;">TRẠNG THÁI: <span class="pulse-dot"></span> SẴN SÀNG</div>
    </div>
    <div id="builder-layout">
      <div id="builder-sidebar">
        <div class="builder-title" id="t-b-title">KHO TÀNG PHÁP KHÍ</div>
        <div class="builder-node-item" draggable="true" ondragstart="drag(event)" data-type="Data Source">Data Source / Thu thập</div>
        <div class="builder-node-item" draggable="true" ondragstart="drag(event)" data-type="LLM Engine">LLM Engine / Thần Thức</div>
        <div class="builder-node-item" draggable="true" ondragstart="drag(event)" data-type="Vision API">Vision API / Thiên Nhãn</div>
        <div class="builder-node-item" draggable="true" ondragstart="drag(event)" data-type="Audio Gen">Audio Gen / Truyền Âm</div>
        <div class="builder-node-item" draggable="true" ondragstart="drag(event)" data-type="Filter Logic">Filter Logic / Luyện Hoá</div>
        <div class="builder-node-item" draggable="true" ondragstart="drag(event)" data-type="Publish">Publish / Xuất Thế</div>
        
        <div class="builder-title" style="margin-top:20px; color:#ffaa00;" id="t-p-title">TRẬN PHÁP MẪU</div>
        <div id="preset-list" style="display:flex;flex-direction:column;gap:8px;"></div>
      </div>
      <div id="builder-canvas" ondrop="drop(event)" ondragover="allowDrop(event)">
        <svg id="builder-svg"></svg>
      </div>
    </div>
  </div>
</div>

<div class="modal-overlay" id="guide-modal">
  <div class="builder-modal-content" style="width:700px; max-width:90%; height:auto;">
    <button class="close-btn" onclick="closeGuide()">×</button>
    <div class="builder-title" id="g-m-title" style="margin-top:20px; margin-left:20px;">BÍ KÍP VŨ TRỤ AI</div>
    <div style="color:#00ffff; font-family:'Share Tech Mono', monospace; line-height:1.6; font-size:13px; text-align:left; background:rgba(0,0,0,0.5); padding:20px; border-top:1px solid #00ffff44; overflow-y:auto; max-height:60vh;">
       <h3 id="g-m-h1" style="color:#ffaa00; margin-top:0;">CHƯƠNG 1: TỔNG QUAN</h3>
       <p id="g-m-p1">Hệ thống này là một trận đồ phức tạp giúp điều khiển hàng vạn Tác Nhân. Mỗi tác nhân mang một quyền năng riêng biệt, tự động xử lý thông tin, phân tích dữ liệu và thu thập linh thạch (doanh thu) cho bạn.</p>
       <h3 id="g-m-h2" style="color:#ffaa00;">CHƯƠNG 2: TRẬN PHÁP BUILDER</h3>
       <p id="g-m-p2">Sử dụng nút 🔮 ở menu bên phải để mở khóa không gian Trận Pháp Builder. Tại đây, bạn có thể thiết lập các luồng tự động hoá bằng cách kéo thả Pháp Khí vào Trận đồ. Các luồng sẽ tự động kết nối qua dòng chảy năng lượng.</p>
       <h3 id="g-m-h3" style="color:#ffaa00;">CHƯƠNG 3: VĂN PHONG VÀ NGÔN TỪ</h3>
       <p id="g-m-p3">Sử dụng nút ☯️ để linh hoạt chuyển đổi giữa thể thức Tu Tiên (Huyền ảo) và Không Gian Mạng (Sci-Fi) sao cho phù hợp với nhận thức của bạn.</p>
    </div>
  </div>
</div>

<div class="modal-overlay" id="compare-modal">`);
}

// 5. JS
if(!html.includes('function toggleTheme()')) {
  html = html.replace('</script>\n</body>',
`// ── THEME TOGGLE (VĂN PHONG) ──
let currentTheme = 'xx'; // xx: xianxia, sf: scifi

const textTranslations = [
  { sel: '.brand', xx: '⬡ VŨ TRỤ AI', sf: '⬡ AI UNIVERSE' },
  { sel: '#boot .subtitle', xx: 'MẠNG LƯỚI TRÍ TUỆ VŨ TRỤ v4.2.0', sf: 'GLOBAL INTELLIGENCE NETWORK v4.2.0' },
  { sel: '.stat:nth-child(1)', xx: '<span class="pulse-dot"></span>HỆ THỐNG <span>TRỰC TUYẾN</span>', sf: '<span class="pulse-dot"></span>SYSTEM <span>ONLINE</span>', html: true },
  { sel: '.stat:nth-child(2)', xx: 'TÁC NHÂN <span id="agent-count">100</span>', sf: 'AGENTS <span id="agent-count">100</span>', html: true },
  { sel: '.stat:nth-child(3)', xx: 'MẠNG LƯỚI <span>HOẠT ĐỘNG</span>', sf: 'NETWORK <span>ACTIVE</span>', html: true },
  
  { sel: '#sidebar-left .panel:nth-child(1) .panel-title', xx: 'Tổng Tác Nhân', sf: 'Total Agents' },
  { sel: '#sidebar-left .panel:nth-child(1) .panel-sub', xx: 'TRỰC TUYẾN & HOẠT ĐỘNG', sf: 'ONLINE & ACTIVE' },
  { sel: '#sidebar-left .panel:nth-child(2) .panel-title', xx: 'Doanh Thu / Ngày', sf: 'Daily Revenue' },
  { sel: '#sidebar-left .panel:nth-child(2) .panel-sub', xx: 'TIỀM NĂNG ƯỚC TÍNH', sf: 'ESTIMATED POTENTIAL' },
  { sel: '#sidebar-left .panel:nth-child(3) .panel-title', xx: 'Nhiệm Vụ Đang Chạy', sf: 'Active Tasks' },
  { sel: '#sidebar-left .panel:nth-child(3) .panel-sub', xx: 'QUY TRÌNH SONG SONG', sf: 'PARALLEL PROCESSES' },
  { sel: '#sidebar-left .panel:nth-child(4) .panel-title', xx: 'Thần Lực Thần Kinh', sf: 'Compute Power' },
  { sel: '#sidebar-left .panel:nth-child(4) .panel-sub', xx: 'CÔNG SUẤT LƯỢNG TỬ', sf: 'QUANTUM CAPACITY' },

  { sel: '#metrics-bar .metric-item:nth-child(1) .mk:first-child', xx: 'TỐC ĐỘ XỬ LÝ', sf: 'PROCESSING SPEED' },
  { sel: '#metrics-bar .metric-item:nth-child(2) .mk:first-child', xx: 'BĂNG THÔNG', sf: 'BANDWIDTH' },
  { sel: '#metrics-bar .metric-item:nth-child(3) .mk:first-child', xx: 'ĐỘ TRỄ', sf: 'LATENCY' },
  { sel: '#metrics-bar .metric-item:nth-child(4) .mk:first-child', xx: 'ĐỘ CHÍNH XÁC', sf: 'ACCURACY' },
  { sel: '#metrics-bar .metric-item:nth-child(5) .mk:first-child', xx: 'NHIỆT ĐỘ GPU', sf: 'GPU TEMP' },

  { sel: '#guide-lbl', xx: 'BÍ KÍP VŨ TRỤ', sf: 'AI HANDBOOK' },
  { sel: '#guide-sub', xx: 'HƯỚNG DẪN TÂN THỦ', sf: 'USER GUIDE' },
  { sel: '#theme-lbl', xx: 'VĂN PHONG: TIÊN HIỆP', sf: 'THEME: SCI-FI' },
  { sel: '#theme-sub', xx: 'CHUYỂN SANG SCI-FI', sf: 'SWITCH TO XIANXIA' },
  { sel: '#t-build-l', xx: 'TRẬN PHÁP BUILDER', sf: 'WORKFLOW BUILDER' },
  { sel: '#t-build-s', xx: 'TẠO LUỒNG AI', sf: 'CREATE AI PIPELINE' },
  { sel: '#sidebar-right .panel-btn:nth-child(4) .pbtn-label', xx: 'BẢNG XẾP HẠNG', sf: 'LEADERBOARD' },
  { sel: '#sidebar-right .panel-btn:nth-child(4) .pbtn-sub', xx: 'TOP DOANH THU', sf: 'TOP REVENUE' },
  { sel: '#sidebar-right .panel-btn:nth-child(5) .pbtn-label', xx: 'SO SÁNH AGENT', sf: 'COMPARE AGENTS' },
  { sel: '#sidebar-right .panel-btn:nth-child(5) .pbtn-sub', xx: 'PHÂN TÍCH HIỆU SUẤT', sf: 'PERFORMANCE ANALYSIS' },
  { sel: '#sidebar-right .panel-btn:nth-child(6) .pbtn-label', xx: 'MẠNG THẦN KINH', sf: 'NEURAL NETWORK' },
  { sel: '#sidebar-right .panel-btn:nth-child(6) .pbtn-sub', xx: 'TRỰC QUAN HÓA', sf: 'VISUALIZATION' },
  { sel: '#sidebar-right .panel-btn:nth-child(7) .pbtn-label', xx: 'NHIỆM VỤ', sf: 'MISSIONS' },
  { sel: '#sidebar-right .panel-btn:nth-child(8) .pbtn-label', xx: 'KÍCH HOẠT TẤT CẢ', sf: 'ACTIVATE ALL' },
  { sel: '#sidebar-right .panel-btn:nth-child(8) .pbtn-sub', xx: '100 AGENT SONG SONG', sf: '100 PARALLEL AGENTS' },
  { sel: '#sidebar-right .panel-btn:nth-child(9) .pbtn-sub', xx: 'BIỂU ĐỒ DOANH THU', sf: 'REVENUE CHART' },
  { sel: '#sidebar-right .panel-btn:nth-child(10) .pbtn-label', xx: 'YÊU THÍCH', sf: 'FAVORITES' },
  { sel: '#sidebar-right .panel-btn:nth-child(11) .pbtn-label', xx: 'LỊCH SỬ', sf: 'HISTORY' },
  { sel: '#sidebar-right .panel-btn:nth-child(11) .pbtn-sub', xx: 'NHẬT KÝ KÍCH HOẠT', sf: 'ACTIVATION LOGS' },
  { sel: '#sidebar-right .panel-btn:nth-child(12) .pbtn-sub', xx: 'GỢI Ý AGENT', sf: 'AGENT SUGGESTIONS' },
  { sel: '#sidebar-right .panel-btn:nth-child(14) .pbtn-label', xx: 'CẢNH BÁO', sf: 'ALERTS' },

  { sel: '#search-btn', xx: 'TÌM', sf: 'SEARCH' },

  { sel: '#t-b-title', xx: 'KHO TÀNG PHÁP KHÍ', sf: 'MODULE LIBRARY' },
  { sel: '#t-p-title', xx: 'TRẬN PHÁP MẪU', sf: 'WORKFLOW PRESETS' },
  { sel: '#run-automation-btn .run-text', xx: 'KÍCH HOẠT', sf: 'ACTIVATE' },
  { sel: '#fav-hud-btn span:nth-child(2)', xx: 'YÊU THÍCH', sf: 'FAVORITE' },
  { sel: '#g-m-title', xx: 'BÍ KÍP VŨ TRỤ AI', sf: 'AI UNIVERSE HANDBOOK' },
  { sel: '#g-m-h1', xx: 'CHƯƠNG 1: TỔNG QUAN', sf: 'CHAPTER 1: OVERVIEW' },
  { sel: '#g-m-p1', xx: 'Hệ thống này là một trận đồ phức tạp giúp điều khiển hàng vạn Tác Nhân. Mỗi tác nhân mang một quyền năng riêng biệt, tự động xử lý thông tin, phân tích dữ liệu và thu thập linh thạch (doanh thu) cho bạn.', sf: 'This system is a complex network controlling tens of thousands of Agents. Each agent has unique capabilities, automating data processing, analyzing information, and generating revenue for you.' },
  { sel: '#g-m-h2', xx: 'CHƯƠNG 2: TRẬN PHÁP BUILDER', sf: 'CHAPTER 2: WORKFLOW BUILDER' },
  { sel: '#g-m-p2', xx: 'Sử dụng nút 🔮 ở menu bên phải để mở khóa không gian Trận Pháp Builder. Tại đây, bạn có thể thiết lập các luồng tự động hoá bằng cách kéo thả Pháp Khí vào Trận đồ. Các luồng sẽ tự động kết nối qua dòng chảy năng lượng.', sf: 'Use the 🔮 button in the right menu to unlock the Workflow Builder. Here, you can design automation pipelines by drag-and-dropping Nodes onto the Canvas. Nodes automatically connect via data flow lines.' },
  { sel: '#g-m-h3', xx: 'CHƯƠNG 3: VĂN PHONG VÀ NGÔN TỪ', sf: 'CHAPTER 3: THEME & TERMINOLOGY' },
  { sel: '#g-m-p3', xx: 'Sử dụng nút ☯️ để linh hoạt chuyển đổi giữa thể thức Tu Tiên (Huyền ảo) và Không Gian Mạng (Sci-Fi) sao cho phù hợp với nhận thức của bạn.', sf: 'Use the ☯️ button to dynamically toggle between the Xianxia (Fantasy) theme and the Sci-Fi (Tech) terminology.' },
];

function toggleTheme() {
  currentTheme = currentTheme === 'xx' ? 'sf' : 'xx';
  
  textTranslations.forEach(item => {
    const el = document.querySelector(item.sel);
    if(el) {
      if(item.html) el.innerHTML = item[currentTheme];
      else el.innerText = item[currentTheme];
    }
  });

  const searchInput = document.getElementById('search-input');
  if(searchInput) searchInput.placeholder = currentTheme === 'xx' ? '🔍 TÌM KIẾM AGENT...' : '🔍 SEARCH AGENTS...';
  
  document.querySelectorAll('.canvas-node').forEach(n => {
    const type = n.getAttribute('data-raw-type');
    if(type) {
        n.innerText = currentTheme === 'xx' ? (type.split(' / ')[1] || type) : type.split(' / ')[0];
    }
  });

  renderPresets();

  showToast(currentTheme === 'xx' ? 'Đã đổi sang văn phong Tiên Hiệp' : 'Switched to Sci-Fi Theme', 'success');
}

// ── GUIDE MODAL ──
function openGuide() {
  document.getElementById('guide-modal').classList.add('show');
}
function closeGuide() {
  document.getElementById('guide-modal').classList.remove('show');
}

// ── DRAG & DROP BUILDER ──
function openBuilder() {
  document.getElementById('builder-modal').classList.add('show');
}
function closeBuilder() {
  document.getElementById('builder-modal').classList.remove('show');
}

let draggedType = null;
let nodeCounter = 0;
let bNodes = [];

function drag(ev) {
  draggedType = ev.target.innerText;
  ev.dataTransfer.setData("text", draggedType);
}
function allowDrop(ev) { ev.preventDefault(); }
function drop(ev) {
  ev.preventDefault();
  if(!draggedType) return;
  const canvas = document.getElementById('builder-canvas');
  const rect = canvas.getBoundingClientRect();
  const x = ev.clientX - rect.left - 60;
  const y = ev.clientY - rect.top - 20;

  const node = document.createElement('div');
  node.className = 'canvas-node';
  node.style.left = x + 'px';
  node.style.top = y + 'px';
  node.setAttribute('data-raw-type', draggedType);
  node.innerText = currentTheme === 'xx' ? (draggedType.split(' / ')[1] || draggedType) : draggedType.split(' / ')[0];
  node.id = 'bnode-' + nodeCounter++;
  
  node.onmousedown = function(e) {
    let shiftX = e.clientX - node.getBoundingClientRect().left;
    let shiftY = e.clientY - node.getBoundingClientRect().top;
    function moveAt(pageX, pageY) {
      node.style.left = pageX - rect.left - shiftX + 'px';
      node.style.top = pageY - rect.top - shiftY + 'px';
      drawLines();
    }
    function onMouseMove(event) { moveAt(event.pageX, event.pageY); }
    document.addEventListener('mousemove', onMouseMove);
    node.onmouseup = function() {
      document.removeEventListener('mousemove', onMouseMove);
      node.onmouseup = null;
    };
  };
  node.ondragstart = function() { return false; };
  canvas.appendChild(node);
  bNodes.push(node);
  drawLines();
  draggedType = null;
}

function drawLines() {
  const svg = document.getElementById('builder-svg');
  svg.innerHTML = '';
  for(let i=0; i<bNodes.length-1; i++) {
    const n1 = bNodes[i];
    const n2 = bNodes[i+1];
    const r1 = n1.getBoundingClientRect();
    const r2 = n2.getBoundingClientRect();
    const c1 = document.getElementById('builder-canvas').getBoundingClientRect();
    
    const x1 = r1.left - c1.left + r1.width;
    const y1 = r1.top - c1.top + r1.height/2;
    const x2 = r2.left - c1.left;
    const y2 = r2.top - c1.top + r2.height/2;
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', \`M\${x1},\${y1} C\${x1+50},\${y1} \${x2-50},\${y2} \${x2},\${y2}\`);
    path.setAttribute('class', 'builder-line');
    svg.appendChild(path);
  }
}

function loadPreset(index) {
  bNodes.forEach(n => n.remove());
  bNodes = [];
  nodeCounter = 0;
  document.getElementById('builder-svg').innerHTML = '';
  
  const agent = AI_AGENTS[index];
  if (!agent) return;
  const nodesData = agent.workflow;

  const canvas = document.getElementById('builder-canvas');
  const rect = canvas.getBoundingClientRect();
  const startX = 50;
  const startY = rect.height / 2 - 20;

  nodesData.forEach((name, i) => {
      const node = document.createElement('div');
      node.className = 'canvas-node';
      node.style.left = (startX + i * 220) + 'px';
      node.style.top = startY + 'px';
      const rawName = name + " / " + name; 
      node.setAttribute('data-raw-type', rawName);
      node.innerText = name;
      node.id = 'bnode-' + nodeCounter++;
      
      node.onmousedown = function(e) {
        let shiftX = e.clientX - node.getBoundingClientRect().left;
        let shiftY = e.clientY - node.getBoundingClientRect().top;
        function moveAt(pageX, pageY) {
          node.style.left = pageX - rect.left - shiftX + 'px';
          node.style.top = pageY - rect.top - shiftY + 'px';
          drawLines();
        }
        function onMouseMove(event) { moveAt(event.pageX, event.pageY); }
        document.addEventListener('mousemove', onMouseMove);
        node.onmouseup = function() {
          document.removeEventListener('mousemove', onMouseMove);
          node.onmouseup = null;
        };
      };
      node.ondragstart = function() { return false; };
      canvas.appendChild(node);
      bNodes.push(node);
  });
  drawLines();
  showToast(currentTheme === 'xx' ? \`Đã bày trận: \${agent.name_xx}!\` : \`Loaded Pipeline: \${agent.name}!\`, 'success');
}

// ── DYNAMIC PRESETS & XIANXIA NAMES ──
const xxNames = [
  "Thiên Lý Nhãn (News)", "Truyền Âm Lược Ảnh", "Huyễn Ảnh Thuật", "Luyện Khí Quyết", "Kim Tiền Trận", 
  "Thiên Cơ Các", "Độn Giáp Thuật (SEO)", "Tụ Bảo Bồn (Affiliate)", "Mê Hồn Trận (Ads)", "Thần Nhãn Ảnh (Video)", 
  "Linh Thư Điêu Khắc", "Bát Quái Trận (Ecom)", "Sưu Hồn Thuật (Social)", "Thính Âm Công", "Thám Báo Các (Data)", 
  "Ngọc Giản Quyết", "Tiên Âm Ký (Chatbot)", "Huyễn Cảnh Lục (Images)", "Truy Hồn Thuật (Leads)", "Vạn Tượng Trận"
];
AI_AGENTS.forEach((a, i) => a.name_xx = xxNames[i] || ("Bí Thuật " + i));

function renderPresets() {
  const container = document.getElementById('preset-list');
  if(!container) return;
  container.innerHTML = '';
  AI_AGENTS.forEach((agent, index) => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.innerText = agent.emoji + " " + (currentTheme === 'xx' ? agent.name_xx : agent.name);
    btn.onclick = () => loadPreset(index);
    container.appendChild(btn);
  });
}
renderPresets();

</script>
</body>`);
}

fs.writeFileSync('tienhiepv3.html', html, 'utf-8');
console.log('Injection successful');
