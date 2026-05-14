const fs = require('fs');

let html = fs.readFileSync('tienhiepv3.html', 'utf-8');

const additionalHTML = `
<!-- RED DHARMA WHEEL & SPEECH BUBBLE -->
<div id="dharma-wheel-container" style="position:fixed;top:52%;left:50%;transform:translate(-50%,-50%);width:480px;height:480px;z-index:4;pointer-events:none;display:flex;align-items:center;justify-content:center;">
  <svg class="dharma-wheel-svg" viewBox="0 0 200 200" style="width:100%;height:100%;animation:rotateDharma 30s linear infinite;">
    <defs>
      <filter id="glow-red">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <path id="rune-path" d="M 100, 20 A 80,80 0 1,1 99.9,20" />
    </defs>
    <!-- Outer Fire Ring -->
    <circle cx="100" cy="100" r="90" fill="none" stroke="#ff2200" stroke-width="2" stroke-dasharray="10 5 2 5" filter="url(#glow-red)" opacity="0.8" class="spin-fast"/>
    <!-- Inner Ring -->
    <circle cx="100" cy="100" r="70" fill="none" stroke="#ff5500" stroke-width="1.5" stroke-dasharray="2 15" filter="url(#glow-red)"/>
    <circle cx="100" cy="100" r="65" fill="none" stroke="#ffaa00" stroke-width="0.5" opacity="0.6"/>
    <!-- Runes Text -->
    <text fill="#ffaa00" font-size="12" font-family="'Orbitron', sans-serif" letter-spacing="6" filter="url(#glow-red)" opacity="0.9">
      <textPath href="#rune-path" startOffset="0%">
        ᛈ ᛉ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ ᛟ ᛞ ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ᛇ
      </textPath>
    </text>
    <!-- Geometric Stars -->
    <path d="M 100 25 L 100 175 M 25 100 L 175 100 M 47 47 L 153 153 M 47 153 L 153 47" stroke="#ff2200" stroke-width="1" opacity="0.4" filter="url(#glow-red)"/>
  </svg>
</div>

<div id="avatar-speech-bubble" style="position:fixed;top:40%;left:50%;transform:translateX(150px);width:250px;background:rgba(40,0,0,0.85);border:1px solid #ff4400;box-shadow:0 0 20px rgba(255,68,0,0.4);padding:12px;border-radius:12px;animation:floatBubble 4s ease-in-out infinite;z-index:10;pointer-events:auto;">
  <input type="text" id="avatar-search-input" placeholder="Yêu cầu trận pháp..." style="width:100%;background:transparent;border:none;outline:none;color:#ffaa00;font-family:'Share Tech Mono',monospace;font-size:14px;text-shadow:0 0 5px rgba(255,136,68,0.5);">
  <div class="bubble-arrow" style="position:absolute;top:50%;left:-12px;transform:translateY(-50%);width:0;height:0;border-top:12px solid transparent;border-bottom:12px solid transparent;border-right:12px solid #ff4400;">
    <div style="content:'';position:absolute;top:-10px;left:2px;border-top:10px solid transparent;border-bottom:10px solid transparent;border-right:10px solid rgba(40,0,0,0.85);"></div>
  </div>
</div>
<!-- END RED DHARMA WHEEL & SPEECH BUBBLE -->
`;

if(!html.includes('id="dharma-wheel-container"')) {
    html = html.replace('</body>', additionalHTML + '\n</body>');
    fs.writeFileSync('tienhiepv3.html', html, 'utf-8');
    console.log("Injected HTML successfully.");
} else {
    console.log("Already injected.");
}
