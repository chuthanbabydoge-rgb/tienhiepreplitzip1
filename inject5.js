const fs = require('fs');

let html = fs.readFileSync('tienhiepv3.html', 'utf-8');

// 1. Fix Dharma Wheel HTML & CSS
const oldWheelStart = html.indexOf('<div id="dharma-wheel-container"');
const oldWheelEnd = html.indexOf('<!-- END RED DHARMA WHEEL & SPEECH BUBBLE -->');
if(oldWheelStart !== -1 && oldWheelEnd !== -1) {
    const oldWheelCode = html.substring(oldWheelStart, oldWheelEnd);
    
    const newWheelCode = `
<style>
  @keyframes rotateDharma2 {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes floatBubbleUp {
    0%, 100% { transform: translate(-50%, 0); }
    50% { transform: translate(-50%, -10px); }
  }
</style>
<div id="dharma-wheel-container" style="position:fixed;top:52%;left:50%;transform:translate(-50%,-50%);width:700px;height:700px;z-index:4;pointer-events:none;display:flex;align-items:center;justify-content:center;">
  <svg class="dharma-wheel-svg" viewBox="0 0 200 200" style="width:100%;height:100%;animation:rotateDharma2 40s linear infinite;">
    <defs>
      <filter id="glow-red">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="glow-orange">
        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <path id="rune-path" d="M 100, 15 A 85,85 0 1,1 99.9,15" />
    </defs>
    <!-- Complex Fire Rings -->
    <circle cx="100" cy="100" r="95" fill="none" stroke="#ff0000" stroke-width="4" filter="url(#glow-red)" opacity="0.6"/>
    <circle cx="100" cy="100" r="85" fill="none" stroke="#ff3300" stroke-width="2" stroke-dasharray="15 5 5 5" filter="url(#glow-red)" class="spin-fast"/>
    <circle cx="100" cy="100" r="70" fill="none" stroke="#ffaa00" stroke-width="1.5" stroke-dasharray="1 10" filter="url(#glow-orange)"/>
    <circle cx="100" cy="100" r="60" fill="none" stroke="#ff2200" stroke-width="1" opacity="0.8"/>
    
    <!-- Bagua Lines (Bat Quai) -->
    <path d="M 100 35 L 100 165 M 35 100 L 165 100 M 54 54 L 146 146 M 54 146 L 146 54" stroke="#ff3300" stroke-width="1.5" filter="url(#glow-red)" opacity="0.6"/>
    
    <circle cx="100" cy="100" r="35" fill="none" stroke="#ff5500" stroke-width="2" filter="url(#glow-orange)" stroke-dasharray="20 10"/>
    <circle cx="100" cy="100" r="20" fill="none" stroke="#ff0000" stroke-width="1.5" opacity="0.8"/>

    <!-- Runes Text -->
    <text fill="#ffcc00" font-size="11" font-family="'Orbitron', sans-serif" letter-spacing="5" filter="url(#glow-orange)" opacity="1">
      <textPath href="#rune-path" startOffset="0%">
        ᛈ ᛉ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ ᛟ ᛞ ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ᛇ ᛈ ᛉ
      </textPath>
    </text>
  </svg>
</div>

<div id="avatar-speech-bubble" style="position:fixed;bottom:8%;left:50%;transform:translateX(-50%);width:400px;background:rgba(40,0,0,0.85);border:1px solid #ff4400;box-shadow:0 0 30px rgba(255,68,0,0.5);padding:15px 20px;border-radius:12px;animation:floatBubbleUp 4s ease-in-out infinite;z-index:10;pointer-events:auto;backdrop-filter:blur(5px);">
  <input type="text" id="avatar-search-input" placeholder="Đạo Hữu Xin Dừng Bước, mời gọi trận pháp!!!" style="width:100%;background:transparent;border:none;outline:none;color:#00ffff;font-family:'Share Tech Mono',monospace;font-size:16px;text-align:center;text-shadow:0 0 8px rgba(0,255,255,0.6);">
  <div class="bubble-arrow" style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-bottom:12px solid #ff4400;">
    <div style="content:'';position:absolute;top:2px;left:-10px;border-left:10px solid transparent;border-right:10px solid transparent;border-bottom:10px solid rgba(40,0,0,0.85);"></div>
  </div>
</div>
`;

    html = html.replace(oldWheelCode, newWheelCode);
}

// 2. Update Translation Placeholder Logic
const transAddition = `
  const searchInput2 = document.getElementById('avatar-search-input');
  if(searchInput2) searchInput2.placeholder = currentTheme === 'xx' ? 'Đạo Hữu Xin Dừng Bước, mời gọi trận pháp!!!' : 'Initiate pipeline request...';
`;

// It was injected by inject3.js before as:
// const searchInput2 = document.getElementById('avatar-search-input');
// if(searchInput2) searchInput2.placeholder = currentTheme === 'xx' ? 'Yêu cầu trận pháp...' : 'Request pipeline...';

const oldTrans = `if(searchInput2) searchInput2.placeholder = currentTheme === 'xx' ? 'Yêu cầu trận pháp...' : 'Request pipeline...';`;
const newTrans = `if(searchInput2) searchInput2.placeholder = currentTheme === 'xx' ? 'Đạo Hữu Xin Dừng Bước, mời gọi trận pháp!!!' : 'Initiate pipeline request...';`;

if (html.includes(oldTrans)) {
    html = html.replace(oldTrans, newTrans);
}

fs.writeFileSync('tienhiepv3.html', html, 'utf-8');
console.log("Fixes applied successfully.");
