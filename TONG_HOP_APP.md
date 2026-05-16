# 🏯 TỔNG HỢP APP — VƯƠNG ĐẾ AI
> ⚡ Tự động cập nhật khi code thay đổi — build xong feature → file này tự tick ✅
> 🕐 Cập nhật lần cuối: **21:13:54 16/5/2026**

---

## 1. APP NÀY LÀ GÌ?

Nền tảng AI chủ đề **Tiên Hiệp / Xianxia** — người dùng tương tác với 100 "AI Agent" được hình tượng hóa thành các tinh cầu trong vũ trụ 3D. Chat AI, tạo nhân vật bằng AI, xây workflow, xem analytics, quản lý Kho Tàng, và nhiều tính năng khác.

## 2. TECH STACK

| Layer | Công nghệ |
|-------|-----------|
| Backend | Node.js + Express.js |
| Frontend | HTML / CSS / JS thuần + Three.js 3D |
| AI | gemini-2.5-flash, gemini-2.5-flash-image (Replit AI Integration) |
| Auth | Replit OIDC + Google OAuth 2.0 |
| Database | PostgreSQL — 6 bảng (users, vault, chat, favorites, topics, session) |
| Session | connect-pg-simple (lưu session vào PG) |
| Image | Jimp — BFS background removal |

## 3. DEPENDENCIES

**21 packages:** `@google/genai` · `@imgly/background-removal-node` · `@types/connect-pg-simple` · `@types/express-session` · `@types/memoizee` · `@types/passport` · `connect-pg-simple` · `drizzle-zod` · `express` · `express-session` · `jimp` · `jsdom` · `memoizee` · `openid-client` · `p-limit` · `p-retry` · `passport` · `passport-google-oauth20` · `pg` · `zod` · `zod-validation-error`

## 4. API ROUTES
> 49 routes phát hiện từ `server.js`

| Method | Path | Mô tả |
|--------|------|-------|
| `GET` | `/api/auth/google` | Bắt đầu flow Google OAuth |
| `GET` | `/api/auth/google/callback` | Callback sau Google OAuth |
| `GET` | `/api/login` | Bắt đầu flow đăng nhập OIDC |
| `GET` | `/api/callback` | Callback sau đăng nhập OIDC |
| `GET` | `/api/logout` | Đăng xuất + redirect Replit |
| `GET` | `/api/auth/user` | Lấy thông tin user session |
| `POST` | `/api/chat` | Chat với AI Agent (Gemini) |
| `GET` | `/app` | — |
| `GET` | `/user` | Trang user (yêu cầu đăng nhập) |
| `GET` | `/` | Trang chủ — serve tienhiepv3.html |
| `GET` | `/admin/login` | — |
| `POST` | `/api/admin/login` | — |
| `GET` | `/api/admin/logout` | — |
| `GET` | `/admin` | Trang Admin Dashboard (yêu cầu đăng nhập) |
| `GET` | `/admin/users` | — |
| `GET` | `/create-character` | Trang tạo nhân vật AI |
| `GET` | `/ar` | — |
| `GET` | `/profile` | Trang hồ sơ (yêu cầu đăng nhập) |
| `POST` | `/api/generate-character` | Tạo nhân vật AI + xóa nền (Gemini Image) |
| `GET` | `/api/status` | Health check backend |
| `GET` | `/api/app-summary` | Trả nội dung TONG_HOP_APP.md (JSON) |
| `GET` | `/api/db/uc-history` | Lấy lịch sử Vạn Giới Truyền Tin |
| `POST` | `/api/db/uc-history` | Thêm 1 tin nhắn vào lịch sử |
| `DELETE` | `/api/db/uc-history` | Xóa toàn bộ lịch sử Vạn Giới |
| `GET` | `/api/db/agent-chat/:agentId` | Lấy lịch sử chat agent |
| `POST` | `/api/db/agent-chat/:agentId` | Lưu lịch sử chat agent |
| `DELETE` | `/api/db/agent-chat/:agentId` | Xóa lịch sử chat agent |
| `GET` | `/api/db/vault` | Lấy toàn bộ Kho Tàng |
| `POST` | `/api/db/vault` | Thêm vật phẩm vào Kho Tàng |
| `DELETE` | `/api/db/vault/:id` | Xóa 1 vật phẩm khỏi Kho |
| `DELETE` | `/api/db/vault` | Xóa toàn bộ Kho Tàng |
| `GET` | `/api/db/favorites` | Lấy danh sách agent yêu thích |
| `POST` | `/api/db/favorites` | Cập nhật danh sách yêu thích |
| `GET` | `/api/db/topics` | Lấy tất cả chủ đề agent |
| `POST` | `/api/db/topics/:agentId` | Cập nhật chủ đề agent |
| `GET` | `/api/db/user-profile` | Hồ sơ user + thống kê thật từ DB |
| `POST` | `/api/db/user-profile` | Cập nhật Tiên Hiệu (display name) |
| `GET` | `/api/db/admin/users` | Danh sách tất cả user (admin) |
| `DELETE` | `/api/db/admin/delete-user/:uid` | Xóa toàn bộ dữ liệu 1 user (admin) |
| `GET` | `/api/auth/debug` | Debug OAuth URLs |
| `POST` | `/api/kocraft/koc` | — |
| `POST` | `/api/kocraft/avatar` | — |
| `POST` | `/api/kocraft/video` | — |
| `POST` | `/api/kocraft/workflow-fill` | — |
| `POST` | `/api/kocraft/content-calendar` | — |
| `POST` | `/api/kocraft/rate-card` | — |
| `POST` | `/api/kocraft/brand-pitch` | — |
| `POST` | `/api/kocraft/hashtag-strategy` | — |
| `POST` | `/api/agent-mode/content-plan` | — |

## 5. CHECKLIST TÍNH NĂNG ĐÃ CÓ (AUTO-DETECT)

> **68/68 tính năng đã xong (100%)**  `[████████████████████]`

### 🎨 GIAO DIỆN & UI — 15/15

- [x] Màn hình boot / intro với hiệu ứng matrix chữ Hán rơi
- [x] Vũ trụ 3D (Three.js) — 100 agent dạng hành tinh quay orbit
- [x] Topbar: đồng hồ thực, đếm agent, trạng thái hệ thống
- [x] Metrics bar: tốc độ, băng thông, độ trễ, GPU
- [x] Filter tabs lọc agent: Nội Dung / Tài Chính / Công Nghệ…
- [x] Thanh tìm kiếm agent
- [x] Responsive mobile (≤768px, ≤420px) + touch support
- [x] Mobile HUD: single-column layout, scrollable tabs/actions
- [x] Mobile HUD: hide left sidebar, full-screen chat
- [x] Mobile modals: full-screen Builder, WFM, App Summary
- [x] Mobile boot/auth dialog: max-width 440px responsive
- [x] Mobile topbar: truncated username, hidden rank badge
- [x] Sidebar trái + Sidebar phải với panel buttons
- [x] Shortcut hints overlay
- [x] Chuyển đổi văn phong: Tiên Hiệp / Tiếng Việt / English

### 🔐 XÁC THỰC & NGƯỜI DÙNG — 7/7

- [x] Replit OIDC Auth
- [x] Google OAuth 2.0
- [x] Session lưu trên PostgreSQL (connect-pg-simple)
- [x] Topbar user badge (avatar + tên)
- [x] Màn hình đăng nhập chọn văn phong (showAuth)
- [x] Upsert user vào DB khi login
- [x] API /api/auth/user trả thông tin user session

### 🗄️ DATABASE POSTGRESQL — 10/10

- [x] Bảng `users` — hồ sơ & cấp bậc tu luyện
- [x] Bảng `uc_chat_history` — lịch sử Vạn Giới Truyền Tin
- [x] Bảng `agent_chat_history` — chat riêng từng agent
- [x] Bảng `vault` — Kho Tàng lưu kết quả chat
- [x] Bảng `favorites` — agent yêu thích
- [x] Bảng `agent_topics` — chủ đề đặt cho từng agent
- [x] API CRUD đầy đủ cho tất cả bảng (/api/db/*)
- [x] DB Sync Layer trong frontend: load DB → localStorage
- [x] API /api/db/user-profile với thống kê thật
- [x] Xóa dữ liệu bulk (vault, history, favorites)

### 💬 CHAT & AI — 10/10

- [x] Vạn Giới Truyền Tin — Chat AI toàn cầu với Gemini
- [x] Lưu & xóa lịch sử chat Vạn Giới
- [x] Chat riêng Agent — personality & lịch sử độc lập
- [x] Mỗi agent có lịch sử chat riêng biệt (DB + localStorage)
- [x] Xóa lịch sử chat riêng từng agent
- [x] Đặt chủ đề chuyên biệt cho từng agent
- [x] Lưu phản hồi agent vào Kho Tàng (Vault)
- [x] Voice Chat — Web Speech API (nhận giọng nói)
- [x] AI Advisor — gợi ý agent phù hợp theo yêu cầu
- [x] Tạo nhân vật AI + xóa nền tự động (Gemini Image + Jimp)

### ⚙️ QUẢN TRỊ & HỒ SƠ — 10/10

- [x] Trang Hồ Sơ Tu Sĩ (profile.html) kết nối DB
- [x] Chỉnh sửa Tiên Hiệu (display name) lưu DB
- [x] Thống kê thật từ DB (login, tin nhắn, kho, yêu thích)
- [x] Cấp bậc tu luyện tự động (Sơ Kỳ → Vô Thượng Đế)
- [x] Admin Dashboard (admin.html)
- [x] Admin: bảng user với thống kê đầy đủ
- [x] Admin: tìm kiếm, lọc, sắp xếp user
- [x] Admin: xóa toàn bộ dữ liệu 1 user
- [x] Panel Tổng Hợp APP với checklist tính năng (admin only)
- [x] Auto-generate TONG_HOP_APP.md khi code thay đổi

### 🌌 TÍNH NĂNG ĐẶC BIỆT — 16/16

- [x] Bảng Xếp Hạng — top agent theo doanh thu
- [x] So Sánh Agent — phân tích 2 agent cạnh nhau
- [x] Analytics Dashboard — biểu đồ doanh thu / phân loại
- [x] Hướng Dẫn Sử Dụng — 8 bước dùng app thực tế
- [x] Trận Pháp Builder — kéo thả xây dựng workflow AI
- [x] Mạng Thần Kinh — visualize neural network
- [x] Nhiệm Vụ (Mission Control) — kích hoạt agent theo đợt
- [x] Kích Hoạt Tất Cả — 100 agent song song
- [x] Kho Tàng (Vault) — lưu, filter/sort kết quả chat
- [x] Mini Game (Agent Hunt) — đoán agent
- [x] Yêu Thích — bookmark agent, sync DB
- [x] Lịch Sử — nhật ký kích hoạt agent
- [x] Cảnh Báo — đặt ngưỡng doanh thu để nhận alert
- [x] Workflow Manager — quản lý luồng từng agent
- [x] 9 Realms — màn hình vũ trụ 9 cõi toàn màn hình
- [x] Resize chatbox bằng kéo góc (desktop & mobile)

## 6. THỐNG KÊ FILE
> **14 file** | **21,337 dòng** | **1.60 MB**

| File | Dòng | Kích thước | Vai trò |
|------|------|------------|---------|
| `server.js` | 1,381 | 61.2 KB | Backend — Express + Auth + Gemini AI + DB |
| `tienhiepv3.html` | 15,099 | 1.30 MB | Frontend chính — UI + Three.js 3D |
| `create-character.html` | 2,194 | 99.3 KB | Trang tạo nhân vật AI |
| `profile.html` | 582 | 25.5 KB | Trang hồ sơ người dùng |
| `admin.html` | 442 | 22.9 KB | Admin Dashboard |
| `package.json` | 39 | 987 B | Cấu hình dependencies |
| `generate-snapshot.js` | 128 | 6.0 KB | Tổng hợp code → TONG_HOP_CODE.md |
| `generate-app-summary.js` | 714 | 42.2 KB | Tổng hợp app → TONG_HOP_APP.md (file này) |
| `inject.js` | 369 | 20.8 KB | Script inject 1 |
| `inject2.js` | 55 | 3.8 KB | Script inject 2 |
| `inject3.js` | 156 | 7.1 KB | Script inject 3 |
| `inject4.js` | 51 | 3.1 KB | Script inject 4 |
| `inject5.js` | 92 | 5.0 KB | Script inject 5 |
| `inject6.js` | 35 | 2.4 KB | Script inject 6 |
| **TỔNG** | **21,337** | **1.60 MB** | — |

## 7. TRANG (PAGES)

| URL | Auth? | File |
|-----|-------|------|
| `/` | Không | `tienhiepv3.html` |
| `/user` | ✅ | `tienhiepv3.html` |
| `/admin` | ✅ | `admin.html` |
| `/create-character` | Không | `create-character.html` |
| `/profile` | ✅ | `profile.html` |

## 8. CẦN GÌ ĐỂ CHẠY ĐẦY ĐỦ?

| # | Thứ cần | Trạng thái | Ghi chú |
|---|---------|------------|---------|
| 1 | `DATABASE_URL` (PostgreSQL) | ✅ Có | Replit DB tích hợp sẵn |
| 2 | `SESSION_SECRET` | ✅ Có | Lưu session server-side |
| 3 | `AI_INTEGRATIONS_GEMINI_API_KEY` | ✅ Có | Replit AI Integrations |
| 4 | `AI_INTEGRATIONS_GEMINI_BASE_URL` | ✅ Có | Replit AI Integrations |
| 5 | `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | ✅ Có | Google OAuth (tùy chọn) |
| 6 | `ADMIN_PASSWORD` | ✅ Có | Mật khẩu vào /admin |
| 7 | `REPL_ID` + `REPLIT_DOMAINS` | ✅ Auto | Tự inject bởi Replit |

## 9. 🗺 ROADMAP — CẦN BUILD (tự tick ✅ khi code xong)

> **Đã xong: 6/30** — Còn lại: 🔴 4 cao · 🟡 8 trung · 🟢 12 thấp

### ✅ Đã hoàn thành trong Roadmap

- [x] 🔴 **Export Kho Tàng ra file (Markdown / CSV / JSON)**
- [x] 🔴 **Copy to clipboard — nút sao chép cho mỗi tin nhắn agent**
- [x] 🟡 **Ghi chú cá nhân cho từng agent (private notes)**
- [x] 🟢 **Lazy load 3D universe (chỉ render agent trong viewport)**
- [x] 🟢 **Cache Gemini response (Node.js in-memory hoặc Redis)**
- [x] 🟢 **Text-to-Speech — đọc to câu trả lời agent bằng giọng nói**

### 🔴 Ưu tiên cao — build ngay

- [ ] **Markdown rendering trong chat (bold, code block, danh sách)**
  > 💡 *Dùng thư viện marked.js — npm install marked, thêm parseMarkdown() vào chat render*
- [ ] **Code syntax highlighting trong chat (highlight.js hoặc Prism.js)**
  > 💡 *Kết hợp với Markdown rendering — highlight các block ```code```*
- [ ] **Chia sẻ kết quả agent qua link công khai**
  > 💡 *API POST /api/share → tạo share token → GET /s/:token render nội dung*
- [ ] **Upload avatar người dùng tùy chỉnh (lưu vào DB)**
  > 💡 *Thêm input file trong profile.html, upload tới /api/db/avatar, lưu base64 hoặc URL vào cột avatar của bảng users*

### 🟡 Ưu tiên trung — build sau

- [ ] **Tìm kiếm toàn văn trong lịch sử chat (server-side ILIKE)**
  > 💡 *API GET /api/db/history/search?q=xxx, dùng PostgreSQL ILIKE, hiện kết quả trong modal*
- [ ] **Notification center — lịch sử cảnh báo & thông báo hệ thống**
  > 💡 *Panel mới hiện danh sách alerts đã kích hoạt, đọc từ localStorage/DB*
- [ ] **Streaming response (SSE) — AI trả lời từng chữ như ChatGPT**
  > 💡 *Đổi /api/chat sang text/event-stream, frontend dùng EventSource hoặc fetch stream*
- [ ] **Light mode / Dark mode toggle (chế độ sáng)**
  > 💡 *Thêm CSS variables, nút toggle thay đổi data-theme attribute trên body*
- [ ] **Import/Export toàn bộ dữ liệu người dùng (JSON backup)**
  > 💡 *API GET /api/db/export → zip tất cả data user, API POST /api/db/import để phục hồi*
- [ ] **Rate limiting chat API (giới hạn request/phút per user)**
  > 💡 *npm install express-rate-limit, apply middleware cho POST /api/chat*
- [ ] **Bulk operations Kho Tàng — chọn nhiều, xóa hàng loạt**
  > 💡 *Thêm checkbox vào vault-card, nút "Xóa đã chọn", hàm vaultBulkDelete()*
- [ ] **Tạo AI Agent tùy chỉnh (custom agent với system prompt riêng)**
  > 💡 *Form tạo agent mới: tên, emoji, màu, system prompt; lưu vào bảng custom_agents; hiện trong vũ trụ 3D*

### 🟢 Ưu tiên thấp — build dần

- [ ] **PWA: manifest.json + service worker (cài app lên điện thoại)**
  > 💡 *Tạo manifest.json, service-worker.js với cache strategy, thêm meta tags*
- [ ] **Agent Chain — kết nối output agent này thành input agent khác**
  > 💡 *Trong Builder: thêm loại node "Chain", output của Agent A tự động gửi vào Agent B*
- [ ] **Agent Scheduling — đặt lịch chạy agent tự động theo giờ/ngày**
  > 💡 *npm install node-cron, lưu lịch vào DB, background job chạy agent và lưu kết quả vào vault*
- [ ] **Webhook output — gửi kết quả agent tới URL webhook ngoài**
  > 💡 *Thêm input webhookUrl trong agent settings, sau khi agent trả lời thì POST tới URL đó*
- [ ] **Admin: biểu đồ đăng ký user theo ngày/tuần (Chart.js)**
  > 💡 *npm install chart.js, thêm canvas trong admin.html, API /api/db/admin/stats theo ngày*
- [ ] **In / xuất lịch sử chat ra PDF**
  > 💡 *Thêm nút "In" trong agent chat, dùng window.print() với print-only CSS hoặc jsPDF*
- [ ] **Đánh giá chất lượng câu trả lời agent (👍/👎 feedback)**
  > 💡 *Thêm 2 nút vote dưới mỗi tin nhắn AI, lưu vào bảng agent_feedback(user_id, agent_id, msg_id, vote)*
- [ ] **Modal hiển thị tất cả keyboard shortcuts**
  > 💡 *Nhấn ? để mở overlay liệt kê đầy đủ phím tắt, hoặc thêm vào Hướng Dẫn Sử Dụng*
- [ ] **Embed widget — nhúng 1 agent vào website khác qua iframe**
  > 💡 *Route /embed/:agentId render giao diện chat tối giản, nhúng vào site ngoài dễ dàng*
- [ ] **Public API cho developer (API key + /api/v1/chat)**
  > 💡 *Tạo bảng api_keys, middleware check Bearer token, route /api/v1/chat cho external access*
- [ ] **So sánh output thật: chạy cùng prompt trên 2 agent, hiện kết quả song song**
  > 💡 *Trong openCompare(): gửi cùng prompt tới 2 agent, hiện 2 cột chat side-by-side*
- [ ] **Template prompt — thư viện câu hỏi mẫu cho từng loại agent**
  > 💡 *Danh sách 5-10 prompt mẫu hiện trong HUD khi chưa có chủ đề, click để điền vào input*

## 10. 🆕 VỪA HOÀN THÀNH (auto-detect từ lần cập nhật trước)

> *(Chưa có feature roadmap nào mới hoàn thành kể từ lần cập nhật trước)*

---
*Auto-generated bởi `generate-app-summary.js` lúc 21:13:54 16/5/2026 — Build xong feature → file tự cập nhật ✅*