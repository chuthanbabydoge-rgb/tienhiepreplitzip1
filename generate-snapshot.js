const fs = require('fs');
const path = require('path');

// ─── Cấu hình: các file cần gộp vào snapshot ───────────────────────────────
const FILES_TO_INCLUDE = [
  { path: 'package.json',          lang: 'json',       desc: 'Package config & dependencies' },
  { path: 'server.js',             lang: 'javascript', desc: 'Backend Express server + Auth + Gemini AI' },
  { path: 'tienhiepv3.html',       lang: 'html',       desc: 'Main frontend (boot screen → login → universe UI)' },
  { path: 'create-character.html', lang: 'html',       desc: 'Character creation page' },
  { path: 'user.html',             lang: 'html',       desc: 'User page' },
  { path: 'inject.js',             lang: 'javascript', desc: 'Inject script 1' },
  { path: 'inject2.js',            lang: 'javascript', desc: 'Inject script 2' },
  { path: 'inject3.js',            lang: 'javascript', desc: 'Inject script 3' },
  { path: 'inject4.js',            lang: 'javascript', desc: 'Inject script 4' },
  { path: 'inject5.js',            lang: 'javascript', desc: 'Inject script 5' },
  { path: 'inject6.js',            lang: 'javascript', desc: 'Inject script 6' },
  { path: 'test_dom.js',           lang: 'javascript', desc: 'DOM test script' },
];

const OUTPUT_FILE = 'TONG_HOP_CODE.md';
const ROOT = __dirname;

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function countLines(content) {
  return content.split('\n').length;
}

function generateSnapshot() {
  const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const lines = [];

  // ── Header ───────────────────────────────────────────────────────────────
  lines.push(`# 🏯 VƯƠNG ĐẾ AI — TỔNG HỢP CODE`);
  lines.push(`> Cập nhật lần cuối: **${now}**`);
  lines.push(`> File này tự động sinh bởi \`generate-snapshot.js\` và cập nhật khi code thay đổi.`);
  lines.push('');

  // ── Mục lục ──────────────────────────────────────────────────────────────
  lines.push(`## 📋 Mục lục`);
  lines.push('');

  const existingFiles = [];
  for (const f of FILES_TO_INCLUDE) {
    const fullPath = path.join(ROOT, f.path);
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lc = countLines(content);
      existingFiles.push({ ...f, fullPath, size: stat.size, content, lineCount: lc });
      const anchor = f.path.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      lines.push(`- [\`${f.path}\`](#${anchor}) — ${f.desc} *(${lc.toLocaleString()} dòng, ${formatBytes(stat.size)})*`);
    }
  }
  lines.push('');

  // ── Thống kê tổng ────────────────────────────────────────────────────────
  const totalLines = existingFiles.reduce((s, f) => s + f.lineCount, 0);
  const totalSize  = existingFiles.reduce((s, f) => s + f.size, 0);
  lines.push(`## 📊 Thống kê`);
  lines.push('');
  lines.push(`| File | Dòng | Kích thước |`);
  lines.push(`|------|------|------------|`);
  for (const f of existingFiles) {
    lines.push(`| \`${f.path}\` | ${f.lineCount.toLocaleString()} | ${formatBytes(f.size)} |`);
  }
  lines.push(`| **TỔNG** | **${totalLines.toLocaleString()}** | **${formatBytes(totalSize)}** |`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Nội dung từng file ───────────────────────────────────────────────────
  for (const f of existingFiles) {
    const anchor = f.path.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    lines.push(`## \`${f.path}\``);
    lines.push(`<a name="${anchor}"></a>`);
    lines.push('');
    lines.push(`> ${f.desc}  `);
    lines.push(`> ${f.lineCount.toLocaleString()} dòng · ${formatBytes(f.size)}`);
    lines.push('');
    lines.push(`\`\`\`${f.lang}`);
    lines.push(f.content);
    lines.push('```');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  const output = lines.join('\n');
  fs.writeFileSync(path.join(ROOT, OUTPUT_FILE), output, 'utf-8');
  const outSize = formatBytes(Buffer.byteLength(output, 'utf-8'));
  console.log(`[${now}] ✅ Snapshot cập nhật → ${OUTPUT_FILE} (${outSize}, ${totalLines.toLocaleString()} dòng từ ${existingFiles.length} file)`);
}

// ─── Chạy lần đầu ───────────────────────────────────────────────────────────
console.log('🏯 Vương Đế AI — Snapshot Generator');
console.log(`📂 Theo dõi ${FILES_TO_INCLUDE.length} file...`);
generateSnapshot();

// ─── Watcher: tự cập nhật khi file thay đổi ─────────────────────────────────
const watchPaths = FILES_TO_INCLUDE
  .map(f => path.join(ROOT, f.path))
  .filter(p => fs.existsSync(p));

let debounceTimer = null;

for (const watchPath of watchPaths) {
  fs.watch(watchPath, (eventType) => {
    if (eventType !== 'change') return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const rel = path.relative(ROOT, watchPath);
      console.log(`🔄 Phát hiện thay đổi: ${rel} — đang cập nhật snapshot...`);
      try {
        generateSnapshot();
      } catch (e) {
        console.error('❌ Lỗi khi tạo snapshot:', e.message);
      }
    }, 500); // debounce 500ms
  });
}

console.log(`👁️  Đang theo dõi thay đổi... (Ctrl+C để dừng)`);
