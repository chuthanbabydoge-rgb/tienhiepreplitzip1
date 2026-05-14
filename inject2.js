const fs = require('fs');

let html = fs.readFileSync('tienhiepv3.html', 'utf-8');

if(!html.includes('id="builder-modal"')) {
  html = html.replace('<div id="compare-modal">',
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

<div id="compare-modal">`);
  fs.writeFileSync('tienhiepv3.html', html, 'utf-8');
  console.log("Modals injected.");
} else {
  console.log("Modals already exist.");
}
