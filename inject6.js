const fs = require('fs');

let html = fs.readFileSync('tienhiepv3.html', 'utf-8');

// 1. Replace the entire #dharma-wheel-container and #avatar-speech-bubble with the new fixed version
const startMarker = '<div id="dharma-wheel-container"';
const endMarker = '<!-- END RED DHARMA WHEEL & SPEECH BUBBLE -->';

const startIndex = html.indexOf(startMarker);
const endIndex = html.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const oldCode = html.substring(startIndex, endIndex + endMarker.length);

    const newCode = `
<div id="dharma-wheel-container" style="position:fixed;top:32%;left:50%;transform:translate(-50%,-50%);width:240px;height:240px;z-index:4;pointer-events:none;display:flex;align-items:center;justify-content:center;">
  <img src="anhquytrinhtaothe.png" style="width:100%;height:100%;object-fit:contain;mix-blend-mode:screen;animation:rotateDharma2 25s linear infinite;filter:drop-shadow(0 0 20px #ff0000) drop-shadow(0 0 40px #ff3300); opacity: 0.9;" alt="Dharma Wheel">
</div>

<div id="avatar-speech-bubble" style="position:fixed;bottom:15%;left:50%;transform:translateX(-50%);width:450px;height:55px;background:rgba(40,0,0,0.85);border:1px solid #ff4400;box-shadow:0 0 30px rgba(255,68,0,0.5);border-radius:25px;animation:floatBubbleUp 4s ease-in-out infinite;z-index:10;pointer-events:auto;backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:0 20px;">
  <input type="text" id="avatar-search-input" placeholder="Đạo Hữu Xin Dừng Bước, mời gọi trận pháp!!!" style="width:100%;background:transparent;border:none;outline:none;color:#00ffff;font-family:'Share Tech Mono',monospace;font-size:16px;text-align:center;text-shadow:0 0 8px rgba(0,255,255,0.6);">
  <div class="bubble-arrow" style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:10px solid #ff4400;">
    <div style="content:'';position:absolute;top:2px;left:-8px;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:8px solid rgba(40,0,0,0.85);"></div>
  </div>
</div>
<!-- END RED DHARMA WHEEL & SPEECH BUBBLE -->
`;

    html = html.replace(oldCode, newCode.trim() + '\n');
    fs.writeFileSync('tienhiepv3.html', html, 'utf-8');
    console.log("Successfully updated Dharma Wheel to image and fixed bubble size.");
} else {
    console.log("Could not find the HTML to replace.");
}
