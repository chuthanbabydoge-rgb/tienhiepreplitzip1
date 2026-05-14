const fs = require('fs');

let html = fs.readFileSync('tienhiepv3.html', 'utf-8');

// 1. Redesign Close Buttons (CSS)
const closeCSS = `
  .close-btn, .modal-close {
    background: rgba(255, 0, 0, 0.15) !important;
    border: 1px solid #ff2200 !important;
    color: #ffaa00 !important;
    padding: 6px 16px !important;
    font-family: 'Orbitron', sans-serif !important;
    font-size: 12px !important;
    letter-spacing: 2px !important;
    border-radius: 4px !important;
    cursor: pointer !important;
    transition: all 0.3s !important;
    box-shadow: 0 0 10px rgba(255, 34, 0, 0.4) !important;
    text-shadow: 0 0 5px #ffaa00 !important;
    position: absolute !important;
    top: 15px !important;
    right: 15px !important;
  }
  .close-btn:hover, .modal-close:hover {
    background: rgba(255, 34, 0, 0.4) !important;
    box-shadow: 0 0 20px rgba(255, 34, 0, 0.8), inset 0 0 10px rgba(255, 34, 0, 0.5) !important;
    transform: scale(1.05) !important;
    color: #fff !important;
  }
`;
if(!html.includes('rgba(255, 0, 0, 0.15) !important;')) {
    html = html.replace('</style>', closeCSS + '</style>');
}

// Update Button Texts
html = html.replace('<button class="close-btn" onclick="closeBuilder()">×</button>', '<button class="close-btn" onclick="closeBuilder()">⮐ TRỞ VỀ</button>');
html = html.replace('<button class="close-btn" onclick="closeGuide()">×</button>', '<button class="close-btn" onclick="closeGuide()">⮐ TRỞ VỀ</button>');
html = html.replace('<button class="modal-close" onclick="document.getElementById(\'compare-modal\').classList.remove(\'show\')">×</button>', '<button class="modal-close" onclick="document.getElementById(\'compare-modal\').classList.remove(\'show\')">⮐ TRỞ VỀ</button>');
html = html.replace('<button class="modal-close" onclick="document.getElementById(\'leaderboard-modal\').classList.remove(\'show\')">×</button>', '<button class="modal-close" onclick="document.getElementById(\'leaderboard-modal\').classList.remove(\'show\')">⮐ TRỞ VỀ</button>');
html = html.replace('<button class="modal-close" onclick="document.getElementById(\'neural-modal\').classList.remove(\'show\')">×</button>', '<button class="modal-close" onclick="document.getElementById(\'neural-modal\').classList.remove(\'show\')">⮐ TRỞ VỀ</button>');
html = html.replace('<button class="modal-close" onclick="document.getElementById(\'mission-modal\').classList.remove(\'show\')">×</button>', '<button class="modal-close" onclick="document.getElementById(\'mission-modal\').classList.remove(\'show\')">⮐ TRỞ VỀ</button>');


// 2. Dharma Wheel & Speech Bubble HTML
const newAvatarWrap = `
  <div id="agent-avatar-wrap">
    <div class="hologram-circle"></div>
    <svg class="dharma-wheel" viewBox="0 0 200 200">
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
    <img src="https://i.imgur.com/kP74F2y.jpeg" id="agent-avatar" alt="Avatar">
    
    <div id="avatar-speech-bubble">
      <input type="text" id="avatar-search-input" placeholder="Yêu cầu trận pháp...">
      <div class="bubble-arrow"></div>
    </div>
  </div>
`;

// Replace existing #agent-avatar-wrap
const startIndex = html.indexOf('<div id="agent-avatar-wrap">');
if(startIndex !== -1) {
    const endIndex = html.indexOf('</div>', html.indexOf('id="agent-avatar"', startIndex)) + 6;
    const oldWrap = html.substring(startIndex, endIndex);
    if(!html.includes('id="avatar-speech-bubble"')) {
        html = html.replace(oldWrap, newAvatarWrap);
    }
}

// 3. Speech Bubble CSS & Wheel Update
const bubbleCSS = `
  .dharma-wheel {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 400px; height: 400px; z-index: 1;
    animation: rotateDharma 30s linear infinite; pointer-events: none;
  }
  .spin-fast { transform-origin: center; animation: spinReverse 15s linear infinite; }
  @keyframes spinReverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }

  #avatar-speech-bubble {
    position: absolute;
    top: 20%; right: -280px;
    width: 250px;
    background: rgba(40, 0, 0, 0.85);
    border: 1px solid #ff4400;
    box-shadow: 0 0 20px rgba(255, 68, 0, 0.4);
    padding: 12px;
    border-radius: 12px;
    animation: floatBubble 4s ease-in-out infinite;
    z-index: 10;
  }
  .bubble-arrow {
    position: absolute;
    top: 50%; left: -12px; transform: translateY(-50%);
    width: 0; height: 0;
    border-top: 12px solid transparent;
    border-bottom: 12px solid transparent;
    border-right: 12px solid #ff4400;
  }
  .bubble-arrow::after {
    content: ''; position: absolute;
    top: -10px; left: 2px;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-right: 10px solid rgba(40,0,0,0.85);
  }
  #avatar-search-input {
    width: 100%; background: transparent; border: none; outline: none;
    color: #ffaa00; font-family: 'Share Tech Mono', monospace;
    font-size: 14px; text-shadow: 0 0 5px rgba(255,136,68,0.5);
  }
  #avatar-search-input::placeholder { color: #ff884488; }
  @keyframes floatBubble {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
`;

if(!html.includes('#avatar-speech-bubble {')) {
    html = html.replace('</style>', bubbleCSS + '</style>');
}

// 4. Update Translation Dictionary for the new input
if(!html.includes('avatar-search-input')) {
    const transAddition = `
  const searchInput2 = document.getElementById('avatar-search-input');
  if(searchInput2) searchInput2.placeholder = currentTheme === 'xx' ? 'Yêu cầu trận pháp...' : 'Request pipeline...';
`;
    html = html.replace("const searchInput = document.getElementById('search-input');", transAddition + "\n  const searchInput = document.getElementById('search-input');");
}

fs.writeFileSync('tienhiepv3.html', html, 'utf-8');
console.log("UI enhancements injected successfully.");
