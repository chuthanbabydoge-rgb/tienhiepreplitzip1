const fs   = require('fs');
const path = require('path');

const ROOT        = __dirname;
const OUTPUT_FILE = 'TONG_HOP_APP.md';
const STATE_FILE  = '.roadmap-state.json';

// ─── Files theo dõi ──────────────────────────────────────────────────────────
const WATCH_FILES = [
  'server.js', 'package.json', 'tienhiepv3.html',
  'create-character.html', 'profile.html', 'admin.html',
  'inject.js','inject2.js','inject3.js','inject4.js','inject5.js','inject6.js',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function exists(p)      { return fs.existsSync(path.join(ROOT, p)); }
function readFile(p)    { return exists(p) ? fs.readFileSync(path.join(ROOT, p), 'utf-8') : ''; }
function statFile(p)    { return exists(p) ? fs.statSync(path.join(ROOT, p)) : null; }
function formatBytes(b) {
  if (b < 1024)     return `${b} B`;
  if (b < 1048576)  return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(2)} MB`;
}
function countLines(s)  { return s ? s.split('\n').length : 0; }
function now()          { return new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }); }

// ─── State persistence (để detect "vừa hoàn thành") ──────────────────────────
function loadState() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, STATE_FILE), 'utf-8')); }
  catch(e) { return {}; }
}
function saveState(state) {
  try { fs.writeFileSync(path.join(ROOT, STATE_FILE), JSON.stringify(state, null, 2), 'utf-8'); }
  catch(e) {}
}

// ─── API routes ───────────────────────────────────────────────────────────────
function parseRoutes(src) {
  const routes = [], re = /app\.(get|post|put|delete|patch)\(['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(src)) !== null) routes.push({ method: m[1].toUpperCase(), path: m[2] });
  return routes;
}

// ─── Gemini models ────────────────────────────────────────────────────────────
function parseModels(src) {
  const models = new Set(), re = /model:\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(src)) !== null) models.add(m[1]);
  return [...models];
}

// ─── Dependencies ─────────────────────────────────────────────────────────────
function parseDeps(pkgSrc) {
  try {
    const pkg = JSON.parse(pkgSrc);
    return { deps: Object.keys(pkg.dependencies || {}), dev: Object.keys(pkg.devDependencies || {}), name: pkg.name, version: pkg.version };
  } catch { return { deps: [], dev: [], name: '?', version: '?' }; }
}

// ─── Scan sources ─────────────────────────────────────────────────────────────
function buildSrc() {
  const server  = readFile('server.js');
  const front   = readFile('tienhiepv3.html');
  const profile = readFile('profile.html');
  const admin   = readFile('admin.html');
  const create  = readFile('create-character.html');
  return { server, front, profile, admin, create, all: server+front+profile+admin+create };
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE CHECKLIST — những gì đã có, auto-detect
// ══════════════════════════════════════════════════════════════════════════════
const FEATURE_CHECKLIST = [
  {
    category: '🎨 GIAO DIỆN & UI',
    items: [
      { label: 'Màn hình boot / intro với hiệu ứng matrix chữ Hán rơi',     detect: s => s.front.includes('matrix') || s.front.includes('boot-screen') },
      { label: 'Vũ trụ 3D (Three.js) — 100 agent dạng hành tinh quay orbit', detect: s => s.front.includes('THREE') || s.front.includes('three.js') },
      { label: 'Topbar: đồng hồ thực, đếm agent, trạng thái hệ thống',       detect: s => s.front.includes('topbar') && s.front.includes('clock') || s.front.includes('m-uptime') },
      { label: 'Metrics bar: tốc độ, băng thông, độ trễ, GPU',               detect: s => s.front.includes('m-speed') || s.front.includes('m-latency') },
      { label: 'Filter tabs lọc agent: Nội Dung / Tài Chính / Công Nghệ…',   detect: s => s.front.includes('filterAgents') },
      { label: 'Thanh tìm kiếm agent',                                        detect: s => s.front.includes('searchAgents') || s.front.includes('agent-search') },
      { label: 'Responsive mobile (≤768px, ≤420px) + touch support',         detect: s => s.front.includes('max-width: 768px') || s.front.includes('max-width:768px') },
      { label: 'Mobile HUD: single-column layout, scrollable tabs/actions',  detect: s => s.front.includes('grid-template-columns: 1fr !important') || (s.front.includes('#hud-tabs') && s.front.includes('flex-wrap: nowrap !important')) },
      { label: 'Mobile HUD: hide left sidebar, full-screen chat',            detect: s => s.front.includes('#hud-left') && s.front.includes('display: none !important') },
      { label: 'Mobile modals: full-screen Builder, WFM, App Summary',       detect: s => s.front.includes('98vh !important') || s.front.includes('100vw !important') },
      { label: 'Mobile boot/auth dialog: max-width 440px responsive',        detect: s => s.front.includes('.sys-panel-box') && s.front.includes('max-width: 440px') },
      { label: 'Mobile topbar: truncated username, hidden rank badge',        detect: s => s.front.includes('#topbar-rank') && s.front.includes('display: none !important') },
      { label: 'Sidebar trái + Sidebar phải với panel buttons',               detect: s => s.front.includes('sidebar-right') && (s.front.includes('sidebar-left') || s.front.includes('panel-btn')) },
      { label: 'Shortcut hints overlay',                                      detect: s => s.front.includes('shortcut-hint') },
      { label: 'Chuyển đổi văn phong: Tiên Hiệp / Tiếng Việt / English',    detect: s => s.front.includes('setTheme') && s.front.includes('toggleThemeMenu') },
    ]
  },
  {
    category: '🔐 XÁC THỰC & NGƯỜI DÙNG',
    items: [
      { label: 'Replit OIDC Auth',                                            detect: s => s.server.includes('openid-client') || s.server.includes('ensureStrategy') },
      { label: 'Google OAuth 2.0',                                            detect: s => s.server.includes('GoogleStrategy') || s.server.includes('passport-google-oauth20') },
      { label: 'Session lưu trên PostgreSQL (connect-pg-simple)',             detect: s => s.server.includes('connect-pg-simple') || s.server.includes('pgSession') },
      { label: 'Topbar user badge (avatar + tên)',                            detect: s => s.front.includes('topbar-user') && s.front.includes('topbar-avatar') },
      { label: 'Màn hình đăng nhập chọn văn phong (showAuth)',               detect: s => s.front.includes('showAuth') },
      { label: 'Upsert user vào DB khi login',                               detect: s => s.server.includes('upsertUser') },
      { label: 'API /api/auth/user trả thông tin user session',              detect: s => s.server.includes("'/api/auth/user'") || s.server.includes('"/api/auth/user"') },
    ]
  },
  {
    category: '🗄️ DATABASE POSTGRESQL',
    items: [
      { label: 'Bảng `users` — hồ sơ & cấp bậc tu luyện',                  detect: s => s.server.includes('CREATE TABLE IF NOT EXISTS users') },
      { label: 'Bảng `uc_chat_history` — lịch sử Vạn Giới Truyền Tin',     detect: s => s.server.includes('uc_chat_history') },
      { label: 'Bảng `agent_chat_history` — chat riêng từng agent',         detect: s => s.server.includes('agent_chat_history') },
      { label: 'Bảng `vault` — Kho Tàng lưu kết quả chat',                  detect: s => s.server.includes('CREATE TABLE IF NOT EXISTS vault') },
      { label: 'Bảng `favorites` — agent yêu thích',                        detect: s => s.server.includes('CREATE TABLE IF NOT EXISTS favorites') },
      { label: 'Bảng `agent_topics` — chủ đề đặt cho từng agent',          detect: s => s.server.includes('agent_topics') },
      { label: 'API CRUD đầy đủ cho tất cả bảng (/api/db/*)',               detect: s => s.server.includes('/api/db/uc-history') && s.server.includes('/api/db/vault') },
      { label: 'DB Sync Layer trong frontend: load DB → localStorage',       detect: s => s.front.includes('initDBLayer') || s.front.includes('_dbSyncAgentChat') },
      { label: 'API /api/db/user-profile với thống kê thật',                detect: s => s.server.includes('/api/db/user-profile') },
      { label: 'Xóa dữ liệu bulk (vault, history, favorites)',              detect: s => s.server.includes('DELETE FROM vault WHERE user_id') && s.server.includes('DELETE FROM uc_chat_history WHERE user_id') },
    ]
  },
  {
    category: '💬 CHAT & AI',
    items: [
      { label: 'Vạn Giới Truyền Tin — Chat AI toàn cầu với Gemini',         detect: s => s.front.includes('uc-chat') || s.front.includes('ucSendMessage') || s.server.includes('/api/chat') },
      { label: 'Lưu & xóa lịch sử chat Vạn Giới',                          detect: s => s.front.includes('ucSaveHistory') || s.front.includes('ucClearHistory') },
      { label: 'Chat riêng Agent — personality & lịch sử độc lập',          detect: s => s.front.includes('openAgentChat') },
      { label: 'Mỗi agent có lịch sử chat riêng biệt (DB + localStorage)', detect: s => s.front.includes('AGENT_CHAT_KEY') && s.front.includes('_dbSyncAgentChat') },
      { label: 'Xóa lịch sử chat riêng từng agent',                         detect: s => s.front.includes('acClearChat') && s.front.includes('_dbClearAgentChat') },
      { label: 'Đặt chủ đề chuyên biệt cho từng agent',                     detect: s => s.front.includes('hudSaveTopic') || s.front.includes('agent_topic_') },
      { label: 'Lưu phản hồi agent vào Kho Tàng (Vault)',                   detect: s => s.front.includes('acSaveLastToVault') || s.front.includes('vaultAddFromChat') },
      { label: 'Voice Chat — Web Speech API (nhận giọng nói)',              detect: s => s.front.includes('SpeechRecognition') || s.front.includes('speechSynthesis') },
      { label: 'AI Advisor — gợi ý agent phù hợp theo yêu cầu',            detect: s => s.front.includes('openAdvisor') },
      { label: 'Tạo nhân vật AI + xóa nền tự động (Gemini Image + Jimp)',  detect: s => s.server.includes('/api/generate-character') && (s.server.includes('jimp') || s.server.includes('Jimp')) },
    ]
  },
  {
    category: '⚙️ QUẢN TRỊ & HỒ SƠ',
    items: [
      { label: 'Trang Hồ Sơ Tu Sĩ (profile.html) kết nối DB',              detect: s => exists('profile.html') && s.profile.includes('/api/db/user-profile') },
      { label: 'Chỉnh sửa Tiên Hiệu (display name) lưu DB',                detect: s => s.profile.includes('saveDisplayName') && s.profile.includes('/api/db/user-profile') },
      { label: 'Thống kê thật từ DB (login, tin nhắn, kho, yêu thích)',     detect: s => s.profile.includes('stat-logins') && s.profile.includes('stat-agent-msgs') },
      { label: 'Cấp bậc tu luyện tự động (Sơ Kỳ → Vô Thượng Đế)',         detect: s => s.profile.includes('rankFromLogins') || s.profile.includes('VÔ THƯỢNG ĐẾ') },
      { label: 'Admin Dashboard (admin.html)',                               detect: s => exists('admin.html') },
      { label: 'Admin: bảng user với thống kê đầy đủ',                      detect: s => s.admin.includes('stat-logins') || s.admin.includes('s-users') },
      { label: 'Admin: tìm kiếm, lọc, sắp xếp user',                       detect: s => s.admin.includes('renderTable') && s.admin.includes('setSort') },
      { label: 'Admin: xóa toàn bộ dữ liệu 1 user',                        detect: s => s.server.includes('/api/db/admin/delete-user/') },
      { label: 'Panel Tổng Hợp APP với checklist tính năng (admin only)',   detect: s => s.front.includes('openAppSummary') && s.front.includes("app-summary-btn") },
      { label: 'Auto-generate TONG_HOP_APP.md khi code thay đổi',          detect: s => exists('generate-app-summary.js') },
    ]
  },
  {
    category: '🌌 TÍNH NĂNG ĐẶC BIỆT',
    items: [
      { label: 'Bảng Xếp Hạng — top agent theo doanh thu',                  detect: s => s.front.includes('openLeaderboard') },
      { label: 'So Sánh Agent — phân tích 2 agent cạnh nhau',               detect: s => s.front.includes('openCompare') },
      { label: 'Analytics Dashboard — biểu đồ doanh thu / phân loại',       detect: s => s.front.includes('openAnalytics') },
      { label: 'Hướng Dẫn Sử Dụng — 8 bước dùng app thực tế',             detect: s => s.front.includes('openGuide') && s.front.includes('ĐĂNG NHẬP') },
      { label: 'Trận Pháp Builder — kéo thả xây dựng workflow AI',          detect: s => s.front.includes('openBuilder') },
      { label: 'Mạng Thần Kinh — visualize neural network',                 detect: s => s.front.includes('openNeural') },
      { label: 'Nhiệm Vụ (Mission Control) — kích hoạt agent theo đợt',     detect: s => s.front.includes('openMission') },
      { label: 'Kích Hoạt Tất Cả — 100 agent song song',                    detect: s => s.front.includes('runAllAgents') },
      { label: 'Kho Tàng (Vault) — lưu, filter/sort kết quả chat',         detect: s => s.front.includes('openVault') },
      { label: 'Mini Game (Agent Hunt) — đoán agent',                       detect: s => s.front.includes('openMiniGame') },
      { label: 'Yêu Thích — bookmark agent, sync DB',                       detect: s => s.front.includes('openFavorites') && s.front.includes('saveFavs') },
      { label: 'Lịch Sử — nhật ký kích hoạt agent',                        detect: s => s.front.includes('openHistory') },
      { label: 'Cảnh Báo — đặt ngưỡng doanh thu để nhận alert',             detect: s => s.front.includes('openAlerts') },
      { label: 'Workflow Manager — quản lý luồng từng agent',               detect: s => s.front.includes('openWFM') },
      { label: '9 Realms — màn hình vũ trụ 9 cõi toàn màn hình',           detect: s => s.front.includes('openNineRealms') },
      { label: 'Resize chatbox bằng kéo góc (desktop & mobile)',            detect: s => s.front.includes('resizeable') || s.front.includes('resize-handle') || (s.front.includes('onMouseDown') && s.front.includes('chatbox')) },
    ]
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// ROADMAP — những feature cần build, CÓ auto-detect khi hoàn thành
// Khi bạn build xong → code match detect() → tự động [x] trong file tổng hợp
// ══════════════════════════════════════════════════════════════════════════════
const ROADMAP_FEATURES = [

  // ─── 🔴 ƯU TIÊN CAO — build ngay ─────────────────────────────────────────
  {
    id: 'export-vault',
    priority: '🔴',
    label: 'Export Kho Tàng ra file (Markdown / CSV / JSON)',
    hint: 'Thêm nút "Xuất File" trong vault modal, tạo Blob và trigger download',
    detect: s => s.front.includes('exportVault') || s.front.includes('downloadVault') || (s.front.includes('URL.createObjectURL') && s.front.includes('vault')),
  },
  {
    id: 'markdown-chat',
    priority: '🔴',
    label: 'Markdown rendering trong chat (bold, code block, danh sách)',
    hint: 'Dùng thư viện marked.js — npm install marked, thêm parseMarkdown() vào chat render',
    detect: s => s.front.includes('marked.parse') || s.front.includes('renderMarkdown') || s.front.includes("import 'marked'") || s.all.includes("require('marked')"),
  },
  {
    id: 'copy-clipboard',
    priority: '🔴',
    label: 'Copy to clipboard — nút sao chép cho mỗi tin nhắn agent',
    hint: 'Thêm icon 📋 vào mỗi message bubble, dùng navigator.clipboard.writeText()',
    detect: s => s.front.includes('navigator.clipboard') || s.front.includes('copyToClipboard') || s.front.includes('copyMessage'),
  },
  {
    id: 'syntax-highlight',
    priority: '🔴',
    label: 'Code syntax highlighting trong chat (highlight.js hoặc Prism.js)',
    hint: 'Kết hợp với Markdown rendering — highlight các block ```code```',
    detect: s => s.front.includes('highlight.js') || s.front.includes('hljs.') || s.front.includes('Prism.') || s.all.includes("require('highlight.js'") || s.all.includes("require('prismjs'"),
  },
  {
    id: 'share-result',
    priority: '🔴',
    label: 'Chia sẻ kết quả agent qua link công khai',
    hint: 'API POST /api/share → tạo share token → GET /s/:token render nội dung',
    detect: s => s.server.includes('/api/share') || s.front.includes('shareResult') || s.front.includes('share-link'),
  },
  {
    id: 'upload-avatar',
    priority: '🔴',
    label: 'Upload avatar người dùng tùy chỉnh (lưu vào DB)',
    hint: 'Thêm input file trong profile.html, upload tới /api/db/avatar, lưu base64 hoặc URL vào cột avatar của bảng users',
    detect: s => s.server.includes('/api/db/avatar') || s.front.includes('uploadAvatar') || s.profile.includes('upload-avatar'),
  },

  // ─── 🟡 ƯU TIÊN TRUNG — build sau ────────────────────────────────────────
  {
    id: 'search-history',
    priority: '🟡',
    label: 'Tìm kiếm toàn văn trong lịch sử chat (server-side ILIKE)',
    hint: 'API GET /api/db/history/search?q=xxx, dùng PostgreSQL ILIKE, hiện kết quả trong modal',
    detect: s => s.front.includes('searchHistory') || s.front.includes('search-history') || (s.server.includes('ILIKE') && s.server.includes('history')),
  },
  {
    id: 'notification-center',
    priority: '🟡',
    label: 'Notification center — lịch sử cảnh báo & thông báo hệ thống',
    hint: 'Panel mới hiện danh sách alerts đã kích hoạt, đọc từ localStorage/DB',
    detect: s => s.front.includes('openNotifications') || s.front.includes('notification-center') || s.front.includes('notifCenter'),
  },
  {
    id: 'realtime-sse',
    priority: '🟡',
    label: 'Streaming response (SSE) — AI trả lời từng chữ như ChatGPT',
    hint: 'Đổi /api/chat sang text/event-stream, frontend dùng EventSource hoặc fetch stream',
    detect: s => s.server.includes('text/event-stream') || s.server.includes('res.write(') && s.server.includes('/api/chat') || s.front.includes('EventSource'),
  },
  {
    id: 'dark-light-mode',
    priority: '🟡',
    label: 'Light mode / Dark mode toggle (chế độ sáng)',
    hint: 'Thêm CSS variables, nút toggle thay đổi data-theme attribute trên body',
    detect: s => s.front.includes('light-mode') || s.front.includes('data-theme') || s.front.includes('toggleColorScheme'),
  },
  {
    id: 'import-export-data',
    priority: '🟡',
    label: 'Import/Export toàn bộ dữ liệu người dùng (JSON backup)',
    hint: 'API GET /api/db/export → zip tất cả data user, API POST /api/db/import để phục hồi',
    detect: s => s.server.includes('/api/db/export') || s.front.includes('exportAllData') || s.front.includes('importUserData'),
  },
  {
    id: 'rate-limit',
    priority: '🟡',
    label: 'Rate limiting chat API (giới hạn request/phút per user)',
    hint: 'npm install express-rate-limit, apply middleware cho POST /api/chat',
    detect: s => s.server.includes('rateLimit') || s.server.includes('express-rate-limit') || s.all.includes("require('express-rate-limit'"),
  },
  {
    id: 'agent-notes',
    priority: '🟡',
    label: 'Ghi chú cá nhân cho từng agent (private notes)',
    hint: 'Thêm textarea trong HUD agent, lưu vào bảng agent_notes (user_id, agent_id, note)',
    detect: s => s.front.includes('agentNote') || s.server.includes('agent_notes') || s.front.includes('saveAgentNote'),
  },
  {
    id: 'batch-vault',
    priority: '🟡',
    label: 'Bulk operations Kho Tàng — chọn nhiều, xóa hàng loạt',
    hint: 'Thêm checkbox vào vault-card, nút "Xóa đã chọn", hàm vaultBulkDelete()',
    detect: s => s.front.includes('vaultSelectAll') || s.front.includes('vault-select') || s.front.includes('vaultBulkDelete'),
  },
  {
    id: 'custom-agent',
    priority: '🟡',
    label: 'Tạo AI Agent tùy chỉnh (custom agent với system prompt riêng)',
    hint: 'Form tạo agent mới: tên, emoji, màu, system prompt; lưu vào bảng custom_agents; hiện trong vũ trụ 3D',
    detect: s => s.front.includes('createCustomAgent') || s.server.includes('custom_agents') || s.server.includes('/api/agents/custom'),
  },

  // ─── 🟢 ƯU TIÊN THẤP — build dần ────────────────────────────────────────
  {
    id: 'pwa',
    priority: '🟢',
    label: 'PWA: manifest.json + service worker (cài app lên điện thoại)',
    hint: 'Tạo manifest.json, service-worker.js với cache strategy, thêm meta tags',
    detect: s => s.server.includes('manifest.json') || s.front.includes('serviceWorker') || exists('manifest.json') || exists('service-worker.js'),
  },
  {
    id: 'agent-chain',
    priority: '🟢',
    label: 'Agent Chain — kết nối output agent này thành input agent khác',
    hint: 'Trong Builder: thêm loại node "Chain", output của Agent A tự động gửi vào Agent B',
    detect: s => s.front.includes('agentChain') || s.front.includes('chainAgents') || s.front.includes('chain-node'),
  },
  {
    id: 'agent-scheduling',
    priority: '🟢',
    label: 'Agent Scheduling — đặt lịch chạy agent tự động theo giờ/ngày',
    hint: 'npm install node-cron, lưu lịch vào DB, background job chạy agent và lưu kết quả vào vault',
    detect: s => s.server.includes('node-cron') || s.server.includes('cron') && s.server.includes('agentId') || s.front.includes('openScheduler'),
  },
  {
    id: 'webhook',
    priority: '🟢',
    label: 'Webhook output — gửi kết quả agent tới URL webhook ngoài',
    hint: 'Thêm input webhookUrl trong agent settings, sau khi agent trả lời thì POST tới URL đó',
    detect: s => s.server.includes('/api/webhook') || s.front.includes('webhookUrl') || s.front.includes('sendWebhook'),
  },
  {
    id: 'admin-charts',
    priority: '🟢',
    label: 'Admin: biểu đồ đăng ký user theo ngày/tuần (Chart.js)',
    hint: 'npm install chart.js, thêm canvas trong admin.html, API /api/db/admin/stats theo ngày',
    detect: s => s.admin.includes('Chart(') || s.admin.includes('chart.js') || s.server.includes('/api/db/admin/stats'),
  },
  {
    id: 'print-chat',
    priority: '🟢',
    label: 'In / xuất lịch sử chat ra PDF',
    hint: 'Thêm nút "In" trong agent chat, dùng window.print() với print-only CSS hoặc jsPDF',
    detect: s => s.front.includes('printChat') || s.front.includes('window.print') || s.front.includes('jsPDF') || s.all.includes("require('jspdf'"),
  },
  {
    id: 'agent-rating',
    priority: '🟢',
    label: 'Đánh giá chất lượng câu trả lời agent (👍/👎 feedback)',
    hint: 'Thêm 2 nút vote dưới mỗi tin nhắn AI, lưu vào bảng agent_feedback(user_id, agent_id, msg_id, vote)',
    detect: s => s.front.includes('rateAgent') || s.front.includes('agent-rating') || s.server.includes('agent_feedback'),
  },
  {
    id: 'shortcut-modal',
    priority: '🟢',
    label: 'Modal hiển thị tất cả keyboard shortcuts',
    hint: 'Nhấn ? để mở overlay liệt kê đầy đủ phím tắt, hoặc thêm vào Hướng Dẫn Sử Dụng',
    detect: s => s.front.includes('shortcut-modal') || s.front.includes('showShortcuts') || s.front.includes("key === '?'") && s.front.includes('shortcut'),
  },
  {
    id: 'lazy-load-3d',
    priority: '🟢',
    label: 'Lazy load 3D universe (chỉ render agent trong viewport)',
    hint: 'Sử dụng frustum culling của Three.js, chỉ load texture khi planet trong view frustum',
    detect: s => s.front.includes('lazyLoadPlanets') || s.front.includes('frustum') || (s.front.includes('LOD') && s.front.includes('THREE')),
  },
  {
    id: 'gemini-cache',
    priority: '🟢',
    label: 'Cache Gemini response (Node.js in-memory hoặc Redis)',
    hint: 'Hash câu hỏi làm cache key, TTL 10 phút, skip cache nếu có system topic',
    detect: s => s.server.includes('geminiCache') || s.server.includes('responseCache') || (s.server.includes('Map') && s.server.includes('cache') && s.server.includes('/api/chat')),
  },
  {
    id: 'embed-widget',
    priority: '🟢',
    label: 'Embed widget — nhúng 1 agent vào website khác qua iframe',
    hint: 'Route /embed/:agentId render giao diện chat tối giản, nhúng vào site ngoài dễ dàng',
    detect: s => s.server.includes('/embed/') || s.front.includes('embed-widget') || exists('embed.html'),
  },
  {
    id: 'public-api',
    priority: '🟢',
    label: 'Public API cho developer (API key + /api/v1/chat)',
    hint: 'Tạo bảng api_keys, middleware check Bearer token, route /api/v1/chat cho external access',
    detect: s => s.server.includes('/api/v1/') || s.server.includes('api_keys') || (s.server.includes('Bearer') && s.server.includes('apiKey')),
  },
  {
    id: 'agent-compare-output',
    priority: '🟢',
    label: 'So sánh output thật: chạy cùng prompt trên 2 agent, hiện kết quả song song',
    hint: 'Trong openCompare(): gửi cùng prompt tới 2 agent, hiện 2 cột chat side-by-side',
    detect: s => s.front.includes('compareOutput') || s.front.includes('compare-output') || (s.front.includes('openCompare') && s.front.includes('Promise.all')),
  },
  {
    id: 'agent-template',
    priority: '🟢',
    label: 'Template prompt — thư viện câu hỏi mẫu cho từng loại agent',
    hint: 'Danh sách 5-10 prompt mẫu hiện trong HUD khi chưa có chủ đề, click để điền vào input',
    detect: s => s.front.includes('promptTemplate') || s.front.includes('template-prompt') || s.front.includes('openTemplates'),
  },
  {
    id: 'voice-output',
    priority: '🟢',
    label: 'Text-to-Speech — đọc to câu trả lời agent bằng giọng nói',
    hint: 'Dùng Web Speech API speechSynthesis.speak(), thêm nút 🔊 dưới tin nhắn AI',
    detect: s => s.front.includes('speechSynthesis.speak') || s.front.includes('speakResponse') || s.front.includes('ttsSpeak'),
  },

];

// ─── Routes parser ────────────────────────────────────────────────────────────
const ROUTE_NOTES = {
  'GET /':                           'Trang chủ — serve tienhiepv3.html',
  'GET /user':                       'Trang user (yêu cầu đăng nhập)',
  'GET /admin':                      'Trang Admin Dashboard (yêu cầu đăng nhập)',
  'GET /create-character':           'Trang tạo nhân vật AI',
  'GET /profile':                    'Trang hồ sơ (yêu cầu đăng nhập)',
  'GET /api/login':                  'Bắt đầu flow đăng nhập OIDC',
  'GET /api/callback':               'Callback sau đăng nhập OIDC',
  'GET /api/logout':                 'Đăng xuất + redirect Replit',
  'GET /api/auth/user':              'Lấy thông tin user session',
  'GET /api/auth/google':            'Bắt đầu flow Google OAuth',
  'GET /api/auth/google/callback':   'Callback sau Google OAuth',
  'GET /api/auth/debug':             'Debug OAuth URLs',
  'GET /api/status':                 'Health check backend',
  'GET /api/app-summary':            'Trả nội dung TONG_HOP_APP.md (JSON)',
  'POST /api/chat':                  'Chat với AI Agent (Gemini)',
  'POST /api/generate-character':    'Tạo nhân vật AI + xóa nền (Gemini Image)',
  'GET /api/db/uc-history':          'Lấy lịch sử Vạn Giới Truyền Tin',
  'POST /api/db/uc-history':         'Thêm 1 tin nhắn vào lịch sử',
  'DELETE /api/db/uc-history':       'Xóa toàn bộ lịch sử Vạn Giới',
  'GET /api/db/agent-chat/:agentId': 'Lấy lịch sử chat agent',
  'POST /api/db/agent-chat/:agentId':'Lưu lịch sử chat agent',
  'DELETE /api/db/agent-chat/:agentId':'Xóa lịch sử chat agent',
  'GET /api/db/vault':               'Lấy toàn bộ Kho Tàng',
  'POST /api/db/vault':              'Thêm vật phẩm vào Kho Tàng',
  'DELETE /api/db/vault/:id':        'Xóa 1 vật phẩm khỏi Kho',
  'DELETE /api/db/vault':            'Xóa toàn bộ Kho Tàng',
  'GET /api/db/favorites':           'Lấy danh sách agent yêu thích',
  'POST /api/db/favorites':          'Cập nhật danh sách yêu thích',
  'GET /api/db/topics':              'Lấy tất cả chủ đề agent',
  'POST /api/db/topics/:agentId':    'Cập nhật chủ đề agent',
  'GET /api/db/user-profile':        'Hồ sơ user + thống kê thật từ DB',
  'POST /api/db/user-profile':       'Cập nhật Tiên Hiệu (display name)',
  'GET /api/db/admin/users':         'Danh sách tất cả user (admin)',
  'DELETE /api/db/admin/delete-user/:uid': 'Xóa toàn bộ dữ liệu 1 user (admin)',
};

// ─── Scan thư mục ─────────────────────────────────────────────────────────────
function scanFiles() {
  return fs.readdirSync(ROOT).filter(f => fs.statSync(path.join(ROOT,f)).isFile()).sort();
}

// ─── Generate ─────────────────────────────────────────────────────────────────
function generate() {
  const timestamp = now();
  const serverSrc = readFile('server.js');
  const pkgSrc    = readFile('package.json');
  const src       = buildSrc();

  const routes            = parseRoutes(serverSrc);
  const models            = parseModels(serverSrc);
  const { deps, name, version } = parseDeps(pkgSrc);

  // ── Evaluate checklist (các feature đã có) ──────────────────────────────────
  let totalItems = 0, totalDone = 0;
  const checklist = FEATURE_CHECKLIST.map(cat => {
    const items = cat.items.map(item => {
      let done = false;
      try { done = !!item.detect(src); } catch(e) {}
      totalItems++;
      if (done) totalDone++;
      return { label: item.label, done };
    });
    const catDone = items.filter(i => i.done).length;
    return { category: cat.category, items, catDone, catTotal: items.length };
  });
  const pct = totalItems > 0 ? Math.round(totalDone / totalItems * 100) : 0;

  // ── Evaluate roadmap (feature cần build) ────────────────────────────────────
  const prevState = loadState();
  const newState  = {};
  const newlyDone = [];

  const roadmapEval = ROADMAP_FEATURES.map(f => {
    let done = false;
    try { done = !!f.detect(src); } catch(e) {}
    newState[f.id] = done;
    if (done && !prevState[f.id]) newlyDone.push(f);
    return { ...f, done };
  });

  saveState(newState);

  const roadmapDone  = roadmapEval.filter(f => f.done).length;
  const roadmapTotal = roadmapEval.length;
  const roadmapTodo  = roadmapEval.filter(f => !f.done);
  const roadmapRed   = roadmapTodo.filter(f => f.priority === '🔴');
  const roadmapYel   = roadmapTodo.filter(f => f.priority === '🟡');
  const roadmapGrn   = roadmapTodo.filter(f => f.priority === '🟢');

  // ── File stats ──────────────────────────────────────────────────────────────
  const trackedFiles = [
    { p: 'server.js',              role: 'Backend — Express + Auth + Gemini AI + DB' },
    { p: 'tienhiepv3.html',        role: 'Frontend chính — UI + Three.js 3D' },
    { p: 'create-character.html',  role: 'Trang tạo nhân vật AI' },
    { p: 'profile.html',           role: 'Trang hồ sơ người dùng' },
    { p: 'admin.html',             role: 'Admin Dashboard' },
    { p: 'package.json',           role: 'Cấu hình dependencies' },
    { p: 'generate-snapshot.js',   role: 'Tổng hợp code → TONG_HOP_CODE.md' },
    { p: 'generate-app-summary.js',role: 'Tổng hợp app → TONG_HOP_APP.md (file này)' },
    { p: 'inject.js',  role: 'Script inject 1' },
    { p: 'inject2.js', role: 'Script inject 2' },
    { p: 'inject3.js', role: 'Script inject 3' },
    { p: 'inject4.js', role: 'Script inject 4' },
    { p: 'inject5.js', role: 'Script inject 5' },
    { p: 'inject6.js', role: 'Script inject 6' },
  ].filter(f => exists(f.p)).map(f => {
    const s = readFile(f.p), st = statFile(f.p);
    return { ...f, lines: countLines(s), size: st.size };
  });
  const totalLines = trackedFiles.reduce((s,f) => s+f.lines, 0);
  const totalSize  = trackedFiles.reduce((s,f) => s+f.size,  0);

  // ── Build markdown ──────────────────────────────────────────────────────────
  const out = [];

  out.push(`# 🏯 TỔNG HỢP APP — VƯƠNG ĐẾ AI`);
  out.push(`> ⚡ Tự động cập nhật khi code thay đổi — build xong feature → file này tự tick ✅`);
  out.push(`> 🕐 Cập nhật lần cuối: **${timestamp}**`);
  out.push('');
  out.push('---');
  out.push('');

  // 1. Tổng quan
  out.push('## 1. APP NÀY LÀ GÌ?');
  out.push('');
  out.push('Nền tảng AI chủ đề **Tiên Hiệp / Xianxia** — người dùng tương tác với 100 "AI Agent" được hình tượng hóa thành các tinh cầu trong vũ trụ 3D. Chat AI, tạo nhân vật bằng AI, xây workflow, xem analytics, quản lý Kho Tàng, và nhiều tính năng khác.');
  out.push('');

  // 2. Tech Stack
  out.push('## 2. TECH STACK');
  out.push('');
  out.push('| Layer | Công nghệ |');
  out.push('|-------|-----------|');
  out.push('| Backend | Node.js + Express.js |');
  out.push('| Frontend | HTML / CSS / JS thuần + Three.js 3D |');
  out.push(`| AI | ${models.length > 0 ? models.join(', ') : 'Gemini 2.5'} (Replit AI Integration) |`);
  out.push('| Auth | Replit OIDC + Google OAuth 2.0 |');
  out.push('| Database | PostgreSQL — 6 bảng (users, vault, chat, favorites, topics, session) |');
  out.push('| Session | connect-pg-simple (lưu session vào PG) |');
  out.push('| Image | Jimp — BFS background removal |');
  out.push('');

  // 3. Dependencies
  out.push('## 3. DEPENDENCIES');
  out.push('');
  out.push(`**${deps.length} packages:** ${deps.map(d => `\`${d}\``).join(' · ')}`);
  out.push('');

  // 4. API Routes
  out.push('## 4. API ROUTES');
  out.push(`> ${routes.length} routes phát hiện từ \`server.js\``);
  out.push('');
  out.push('| Method | Path | Mô tả |');
  out.push('|--------|------|-------|');
  for (const r of routes) {
    const key  = `${r.method} ${r.path}`;
    const note = ROUTE_NOTES[key] || '—';
    out.push(`| \`${r.method}\` | \`${r.path}\` | ${note} |`);
  }
  out.push('');

  // 5. Checklist (các feature đã build)
  out.push('## 5. CHECKLIST TÍNH NĂNG ĐÃ CÓ (AUTO-DETECT)');
  out.push('');
  const barFill = Math.round(pct / 5);
  const bar = '█'.repeat(barFill) + '░'.repeat(20 - barFill);
  out.push(`> **${totalDone}/${totalItems} tính năng đã xong (${pct}%)**  \`[${bar}]\``);
  out.push('');
  for (const cat of checklist) {
    out.push(`### ${cat.category} — ${cat.catDone}/${cat.catTotal}`);
    out.push('');
    for (const item of cat.items) {
      out.push(`- [${item.done ? 'x' : ' '}] ${item.label}`);
    }
    out.push('');
  }

  // 6. File stats
  out.push('## 6. THỐNG KÊ FILE');
  out.push(`> **${trackedFiles.length} file** | **${totalLines.toLocaleString()} dòng** | **${formatBytes(totalSize)}**`);
  out.push('');
  out.push('| File | Dòng | Kích thước | Vai trò |');
  out.push('|------|------|------------|---------|');
  for (const f of trackedFiles) {
    out.push(`| \`${f.p}\` | ${f.lines.toLocaleString()} | ${formatBytes(f.size)} | ${f.role} |`);
  }
  out.push(`| **TỔNG** | **${totalLines.toLocaleString()}** | **${formatBytes(totalSize)}** | — |`);
  out.push('');

  // 7. Pages
  out.push('## 7. TRANG (PAGES)');
  out.push('');
  out.push('| URL | Auth? | File |');
  out.push('|-----|-------|------|');
  out.push('| `/` | Không | `tienhiepv3.html` |');
  out.push('| `/user` | ✅ | `tienhiepv3.html` |');
  out.push('| `/admin` | ✅ | `admin.html` |');
  out.push('| `/create-character` | Không | `create-character.html` |');
  out.push('| `/profile` | ✅ | `profile.html` |');
  out.push('');

  // 8. Cần gì để chạy
  out.push('## 8. CẦN GÌ ĐỂ CHẠY ĐẦY ĐỦ?');
  out.push('');
  out.push('| # | Thứ cần | Trạng thái | Ghi chú |');
  out.push('|---|---------|------------|---------|');
  out.push('| 1 | `DATABASE_URL` (PostgreSQL) | ✅ Có | Replit DB tích hợp sẵn |');
  out.push('| 2 | `SESSION_SECRET` | ✅ Có | Lưu session server-side |');
  out.push('| 3 | `AI_INTEGRATIONS_GEMINI_API_KEY` | ✅ Có | Replit AI Integrations |');
  out.push('| 4 | `AI_INTEGRATIONS_GEMINI_BASE_URL` | ✅ Có | Replit AI Integrations |');
  out.push('| 5 | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | ✅ Có | Google OAuth (tùy chọn) |');
  out.push('| 6 | `ADMIN_PASSWORD` | ✅ Có | Mật khẩu vào /admin |');
  out.push('| 7 | `REPL_ID` + `REPLIT_DOMAINS` | ✅ Auto | Tự inject bởi Replit |');
  out.push('');

  // 9. ROADMAP — cần build (auto-detect khi hoàn thành)
  out.push('## 9. 🗺 ROADMAP — CẦN BUILD (tự tick ✅ khi code xong)');
  out.push('');
  out.push(`> **Đã xong: ${roadmapDone}/${roadmapTotal}** — Còn lại: 🔴 ${roadmapRed.length} cao · 🟡 ${roadmapYel.length} trung · 🟢 ${roadmapGrn.length} thấp`);
  out.push('');

  // Show done items first
  const roadmapDoneItems = roadmapEval.filter(f => f.done);
  if (roadmapDoneItems.length > 0) {
    out.push('### ✅ Đã hoàn thành trong Roadmap');
    out.push('');
    for (const f of roadmapDoneItems) {
      out.push(`- [x] ${f.priority} **${f.label}**`);
    }
    out.push('');
  }

  if (roadmapRed.length > 0) {
    out.push('### 🔴 Ưu tiên cao — build ngay');
    out.push('');
    for (const f of roadmapRed) {
      out.push(`- [ ] **${f.label}**`);
      out.push(`  > 💡 *${f.hint}*`);
    }
    out.push('');
  }

  if (roadmapYel.length > 0) {
    out.push('### 🟡 Ưu tiên trung — build sau');
    out.push('');
    for (const f of roadmapYel) {
      out.push(`- [ ] **${f.label}**`);
      out.push(`  > 💡 *${f.hint}*`);
    }
    out.push('');
  }

  if (roadmapGrn.length > 0) {
    out.push('### 🟢 Ưu tiên thấp — build dần');
    out.push('');
    for (const f of roadmapGrn) {
      out.push(`- [ ] **${f.label}**`);
      out.push(`  > 💡 *${f.hint}*`);
    }
    out.push('');
  }

  // 10. Vừa hoàn thành (auto-detected từ state diff)
  out.push('## 10. 🆕 VỪA HOÀN THÀNH (auto-detect từ lần cập nhật trước)');
  out.push('');
  if (newlyDone.length > 0) {
    out.push(`> Phát hiện **${newlyDone.length} feature mới** được hoàn thành kể từ lần cập nhật trước:`);
    out.push('');
    for (const f of newlyDone) {
      out.push(`- ✅ ${f.priority} **${f.label}**`);
    }
  } else {
    out.push('> *(Chưa có feature roadmap nào mới hoàn thành kể từ lần cập nhật trước)*');
  }
  out.push('');

  out.push('---');
  out.push(`*Auto-generated bởi \`generate-app-summary.js\` lúc ${timestamp} — Build xong feature → file tự cập nhật ✅*`);

  return out.join('\n');
}

// ─── Ghi file ─────────────────────────────────────────────────────────────────
function run() {
  try {
    const content = generate();
    fs.writeFileSync(path.join(ROOT, OUTPUT_FILE), content, 'utf-8');
    const size = formatBytes(Buffer.byteLength(content, 'utf-8'));
    console.log(`[${now()}] ✅ Đã cập nhật ${OUTPUT_FILE} (${size})`);
  } catch (e) {
    console.error(`[${now()}] ❌ Lỗi:`, e.message);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
console.log('📋 Vương Đế AI — App Summary Generator');
console.log(`👁️  Đang theo dõi ${WATCH_FILES.length} file...`);
run();

// ─── Watcher ──────────────────────────────────────────────────────────────────
let debounce = null;
for (const f of WATCH_FILES) {
  const full = path.join(ROOT, f);
  if (!fs.existsSync(full)) continue;
  fs.watch(full, () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      console.log(`🔄 Phát hiện thay đổi: ${f} — đang cập nhật...`);
      run();
    }, 800);
  });
}
console.log('👁️  Đang theo dõi thay đổi... (Ctrl+C để dừng)');
