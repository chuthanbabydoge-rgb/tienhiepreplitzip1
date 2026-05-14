# TỔNG HỢP ĐẦY ĐỦ — VƯƠNG ĐẾ AI (TienHiepAI)
> Tạo: 09/05/2026 | Cập nhật tự động từ codebase

---

## MỤC LỤC
1. [App là gì?](#1-app-là-gì)
2. [Tech Stack](#2-tech-stack)
3. [Danh sách 100 AI Agent](#3-danh-sách-100-ai-agent)
4. [Chi tiết chức năng AI Agent](#4-chi-tiết-chức-năng-ai-agent)
5. [Tính năng đã có — hoạt động](#5-tính-năng-đã-có--hoạt-động)
6. [Còn thiếu — vấn đề cần xử lý](#6-còn-thiếu--vấn-đề-cần-xử-lý)
7. [Cần thêm — đề xuất chi tiết theo ưu tiên](#7-cần-thêm--đề-xuất-chi-tiết-theo-ưu-tiên)
8. [Bảng tổng quan nhanh](#8-bảng-tổng-quan-nhanh)
9. [Cấu trúc file dự án](#9-cấu-trúc-file-dự-án)

---

## 1. App là gì?

**Vương Đế AI** (tên kỹ thuật: TienHiepAI) là nền tảng AI theo chủ đề **Tiên Hiệp / Xianxia** — người dùng tương tác với 100 "AI Agent" được hình tượng hóa thành các **hành tinh trong vũ trụ 3D**. Có thể:
- Chat với AI Gemini qua từng agent có cá tính riêng
- Tạo nhân vật xianxia bằng Gemini Image AI
- Xây dựng workflow tự động hóa (Trận Pháp Builder)
- Xem analytics, leaderboard, so sánh agent
- Lưu kết quả vào Kho Tàng (Vault)
- Chơi mini game, nhận gợi ý agent từ AI Advisor

Giao diện có 3 ngôn ngữ/văn phong: **Tiên Hiệp (xx)**, **Tiếng Việt (vi)**, **English (en)**.

---

## 2. Tech Stack

| Thành phần | Công nghệ |
|-----------|-----------|
| Backend | Node.js 20 + Express.js v5 |
| Frontend | HTML/CSS/JS thuần (1 file 9.694 dòng) |
| AI Chat | Google Gemini 2.5 Flash |
| AI Tạo Ảnh | Google Gemini 2.5 Flash Image |
| AI Integration | Replit AI Integrations (không cần API key cá nhân) |
| 3D Universe | Three.js r128 (CDN) |
| 3D Character | @pixiv/three-vrm v2.1.3 (CDN) |
| Auth | Replit OIDC (passport + openid-client) |
| Session | express-session + SESSION_SECRET |
| Xử lý ảnh | Jimp v0.22 (BFS background removal tự viết) |
| Fonts | Orbitron, Rajdhani, Share Tech Mono, Noto Serif SC |
| Storage | localStorage trình duyệt (chưa có DB thật) |
| Port | 5000 (map ra 80) |
| Deploy | Replit Workflows |

---

## 3. Danh sách 100 AI Agent

| ID | Emoji | Tên Agent | Loại | Doanh thu/ngày |
|----|-------|-----------|------|---------------|
| 0 | 📰 | NewsFlash AI | Content Intelligence | $2,400 |
| 1 | 🎬 | TubeGenius AI | YouTube Automation | $8,200 |
| 2 | 📱 | TikFlow AI | Short Video Empire | $5,600 |
| 3 | 💻 | CodeForge AI | Software Development | $12,000 |
| 4 | 📈 | TradeMind AI | Quantitative Trading | $45,000 |
| 5 | ⚙️ | AutoFlow AI | Business Automation | $9,800 |
| 6 | 🔍 | SEOMaster AI | Search Engine Domination | $7,300 |
| 7 | 💰 | AffiliPro AI | Affiliate Marketing | $6,700 |
| 8 | 📣 | AdGenius AI | Performance Marketing | $18,500 |
| 9 | 🎥 | VideoMind AI | Video Production AI | $11,200 |
| 10 | 📧 | EmailKing AI | Email Marketing | $4,200 |
| 11 | 🛒 | DropBot AI | E-Commerce Dropship | $15,800 |
| 12 | 🌟 | InfluenceAI | Social Media Growth | $3,900 |
| 13 | 🎙️ | PodcastAI | Audio Content Empire | $2,800 |
| 14 | ⛏️ | DataMiner AI | Intelligence Gathering | $8,700 |
| 15 | ✍️ | CopyKing AI | Copywriting Engine | $5,500 |
| 16 | 🤖 | ChatbotPro AI | Conversational AI | $6,300 |
| 17 | 🎨 | ImageForge AI | Visual Content Creator | $4,800 |
| 18 | 🎯 | LeadHunter AI | Sales Intelligence | $14,200 |
| 19 | ⭐ | ReputeAI | Review Management | $3,200 |
| 20 | 🗣️ | VoiceClone AI | Voice Synthesis Engine | $7,800 |
| 21 | 🐋 | CryptoWhale AI | Crypto Market Intelligence | $32,000 |
| 22 | 🌐 | WebBuilder AI | Website Generation | $9,400 |
| 23 | 🔮 | FunnelMaster AI | Sales Funnel Builder | $11,600 |
| 24 | 📚 | KindleBot AI | Book Publishing Empire | $4,600 |
| 25 | 🏢 | AgencyAI | Digital Agency Operator | $28,000 |
| 26 | 👕 | PrintAI | Print on Demand | $3,800 |
| 27 | 🎓 | CourseBot AI | Online Course Creator | $19,200 |
| 28 | 🎞️ | ReelMaker AI | Instagram Reels Factory | $3,400 |
| 29 | 🏆 | GrantBot AI | Grant Writing Intelligence | $22,000 |
| 30 | 💬 | SMSBomb AI | SMS Marketing | $5,900 |
| 31 | 🖼️ | NFTForge AI | NFT Collection Creator | $8,900 |
| 32 | 📍 | LocalSEO AI | Local Business Dominator | $6,100 |
| 33 | 🌍 | TranslateAI | Multilingual Content | $4,400 |
| 34 | 👥 | HRBot AI | Human Resources AI | $7,600 |
| 35 | 🛡️ | InsuranceAI | Insurance Automation | $13,400 |
| 36 | 🏠 | RealEstateAI | Property Intelligence | $31,000 |
| 37 | 💪 | FitBot AI | Fitness & Health AI | $3,600 |
| 38 | ⚖️ | LegalEagle AI | Legal Document AI | $16,800 |
| 39 | 🎵 | MusicMaker AI | Music Production | $5,200 |
| 40 | 📊 | BImaster AI | Business Intelligence | $12,800 |
| 41 | 🌤️ | WeatherSage AI | Weather Intelligence | $3,100 |
| 42 | ✈️ | TravelBot AI | Travel Planning AI | $4,900 |
| 43 | 🍽️ | RestaurantAI | Food Business AI | $7,200 |
| 44 | 🔒 | CyberGuard AI | Cybersecurity AI | $21,000 |
| 45 | 📦 | SupplyChain AI | Logistics Intelligence | $18,300 |
| 46 | 🚨 | FraudStop AI | Fraud Detection AI | $29,400 |
| 47 | 💁 | SupportMind AI | Customer Support AI | $6,800 |
| 48 | 💹 | PortfolioAI | Investment Intelligence | $38,000 |
| 49 | 🌿 | CarbonAI | Climate & ESG AI | $4,300 |
| 50 | 🏥 | MediCode AI | Healthcare Records AI | $14,600 |
| 51 | 🏟️ | SportsBet AI | Sports Analytics AI | $11,400 |
| 52 | 📡 | PRBlast AI | Public Relations AI | $5,700 |
| 53 | 🧾 | TaxBot AI | Tax Filing AI | $9,200 |
| 54 | 👁️ | BrandWatch AI | Brand Monitoring AI | $7,100 |
| 55 | 📝 | ContentFarm AI | SEO Content Factory | $6,400 |
| 56 | 🔬 | TalentScreen AI | AI Recruitment | $8,500 |
| 57 | 🛋️ | InteriorAI | Interior Design AI | $9,700 |
| 58 | 🎤 | TranscribeAI | Speech-to-Text AI | $5,300 |
| 59 | 🎭 | BrandForge AI | Brand Identity AI | $11,900 |
| 60 | 🗺️ | LocalizeAI | Content Localization | $6,600 |
| 61 | 🎮 | GameDev AI | Game Development AI | $13,700 |
| 62 | 📮 | NewsletterAI | Newsletter Builder | $4,100 |
| 63 | 📷 | PhotoPro AI | Bulk Photo Processing | $3,500 |
| 64 | 🔭 | MarketResearch AI | Market Research AI | $7,900 |
| 65 | 🏚️ | FlipBot AI | Real Estate Flipping AI | $24,000 |
| 66 | 🧬 | WellnessAI | Personal Health AI | $5,100 |
| 67 | 📐 | EduPath AI | Adaptive Learning AI | $8,300 |
| 68 | 🌾 | AgriBot AI | Smart Agriculture AI | $6,200 |
| 69 | 🚛 | FleetMind AI | Fleet & Logistics AI | $15,600 |
| 70 | ☀️ | SolarAI | Solar Energy AI | $12,100 |
| 71 | 🐾 | PetCare AI | Pet Health AI | $2,900 |
| 72 | 👔 | ExecutiveAI | C-Suite Assistant AI | $33,000 |
| 73 | 💳 | FinancePersonal AI | Personal Finance AI | $4,700 |
| 74 | 🎬 | DubMaster AI | Video Dubbing AI | $9,600 |
| 75 | 💊 | DrugDiscovery AI | Pharmaceutical AI | $67,000 |
| 76 | 🔭 | AstroAnalyze AI | Astronomy & Space AI | $18,200 |
| 77 | ⚛️ | QuantumComp AI | Quantum Computing AI | $45,000 |
| 78 | 🧠 | DeepResearch AI | AI Architecture Lab | $29,000 |
| 79 | 👤 | SyntheticMedia AI | Deepfake & Synthetic AI | $16,400 |
| 80 | 🧬 | GenomeAI | Genomics & Gene AI | $52,000 |
| 81 | 🤖 | RPAbot AI | Robotic Process Automation | $22,500 |
| 82 | 🛍️ | RetailAI | Smart Retail AI | $17,800 |
| 83 | 🎓 | EdTech AI | Adaptive EdTech AI | $10,400 |
| 84 | 💆 | EmotionAI | Emotional Intelligence AI | $8,600 |
| 85 | 🛰️ | GeoSpatial AI | Satellite & GIS AI | $31,500 |
| 86 | 🎯 | HyperPersonal AI | Hyper-Personalization AI | $14,300 |
| 87 | 📋 | ClaimsBot AI | Insurance Claims AI | $19,700 |
| 88 | 🎩 | ExecutiveSearch AI | C-Level Recruiter AI | $41,000 |
| 89 | 💱 | MarketMaker AI | DeFi Market Making AI | $58,000 |
| 90 | 🌡️ | ClimateRisk AI | Climate Risk & ESG AI | $23,400 |
| 91 | 📲 | InfluencerMatch AI | Influencer Marketing AI | $11,700 |
| 92 | 📜 | ContractAI | Contract Intelligence AI | $20,100 |
| 93 | 🏦 | FintechDev AI | Fintech Development AI | $44,000 |
| 94 | 🗃️ | KnowledgeBase AI | Enterprise Knowledge AI | $16,900 |
| 95 | 🔐 | PrivacyGuard AI | Data Privacy AI | $13,200 |
| 96 | 🧭 | EthicsMonitor AI | AI Ethics & Alignment AI | $9,800 |
| 97 | 🎛️ | OrchestratorAI | Multi-Agent Orchestrator | $72,000 |
| 98 | 👁️ | OmniscientAI | System Overseer AI | $∞ |
| 99 | ♾️ | UniversalAI | Universal Intelligence AI | $∞ |

---

## 4. Chi tiết chức năng AI Agent

Mỗi agent trong hệ thống có đầy đủ các thuộc tính sau:

### Thuộc tính cơ bản (data trong code)
- **id** — mã định danh 0–99
- **name** — tên kỹ thuật tiếng Anh
- **xname** — tên tiên hiệp (ví dụ: "Thiên Cơ Các", "Hỏa Long Thần")
- **emoji** — biểu tượng
- **type** — loại (tiếng Anh) / **xnote** — mô tả (tiếng tiên hiệp)
- **color / glow** — màu sắc hành tinh trong 3D
- **revenue** — doanh thu ước tính/ngày (số giả, hardcode)
- **auto / neural / iq / efficiency** — 4 chỉ số hiệu suất (0–100)
- **apis[]** — danh sách API liên quan (trang trí)
- **workflow[]** — các bước pipeline (tên bước, trang trí)
- **logs[]** — log giả lập đang chạy (trang trí)

### Chức năng AI thật (gọi Gemini API thực sự)

| Chức năng | API Endpoint | Model | Mô tả |
|-----------|-------------|-------|-------|
| **Chat tổng quát** | `POST /api/chat` | gemini-2.5-flash | Chat với persona "THIÊN CƠ CÁC", văn phong tiên hiệp |
| **Chat theo agent** | `POST /api/chat` | gemini-2.5-flash | Chat với persona riêng của từng agent (name, type, xname, xnote, topic) |
| **Tạo nhân vật** | `POST /api/generate-character` | gemini-2.5-flash-image | Sinh ảnh nhân vật xianxia theo thông số chọn |

### Chức năng AI giả (UI animation, không gọi API thật)
- **Mission Control** — kích hoạt cụm agent theo nhiệm vụ (chỉ animation)
- **Kích Hoạt Tất Cả** — chạy 100 agent song song (chỉ animation countdown)
- **Workflow Builder** — kéo thả xây pipeline (chỉ lưu config, không chạy thật)
- **Alerts** — cảnh báo ngưỡng doanh thu (dựa trên số giả)
- **Agent logs** trong HUD — logs giả lập đang chạy

### Nhân vật Tiên Hiệp mỗi agent có
- **Tên tiên hiệu** (xname): ví dụ Agent 4 = "Thiên Cơ Chiến Thần", Agent 97 = "Đại Đạo Chi Chủ"
- **Mô tả quyền năng** (xnote): mô tả theo văn phong tiên hiệp
- **Topic chuyên biệt**: người dùng có thể đặt chủ đề riêng cho chat từng agent
- **Lịch sử chat riêng biệt**: mỗi agent lưu history độc lập (localStorage)

### Phân loại Agent theo danh mục
| Danh mục | Màu | Keywords |
|---------|-----|---------|
| Content | #ff44ff | content, video, tiktok, youtube, podcast, news, image, copy |
| Finance | #ffaa00 | trading, finance, crypto, market, invest |
| Tech | #00ff88 | code, software, cloud, cyber, quantum, robotic |
| Marketing | #00aaff | seo, affiliate, email, social, ad, funnel |
| Khác | #8844ff | phần còn lại |

---

## 5. Tính năng đã có — hoạt động

### Giao diện & UX
- [x] **Boot screen** — matrix chữ Hán vàng rơi, popup xác nhận đăng nhập
- [x] **Auth box** — tabs Tiến Nhập / Kết Ấn, 3 chủ đề ngôn ngữ, nút Gmail (giả)
- [x] **Vũ trụ 3D** (Three.js) — 100 hành tinh màu sắc quay quanh orbit nhiều lớp
- [x] **Topbar** — đồng hồ thời gian thực, đếm agent, trạng thái ONLINE
- [x] **Metrics bar** — 5 chỉ số giả lập (tốc độ xử lý, băng thông, độ trễ, độ chính xác, nhiệt GPU)
- [x] **Sidebar trái** — 4 panel thống kê (agents, doanh thu, nhiệm vụ, compute)
- [x] **Sidebar phải** — 13 nút panel-btn mở các tính năng
- [x] **Filter tabs** — lọc theo All / Nội dung / Tài chính / Công nghệ / Marketing / Top 10
- [x] **Tìm kiếm agent** — search realtime theo tên
- [x] **Statusbar cuộn** — log chạy liên tục ở đáy màn hình
- [x] **Toast notifications** — thông báo pop-up góc màn hình
- [x] **Shortcut hints** — hướng dẫn phím tắt [L][C][N][M][A][Z][F][H][I][G]
- [x] **Keyboard shortcuts** — Z=Analytics, F=Favorites, H=History, I=Advisor, G=Game
- [x] **Theme toggle** — ☯️ đổi Tiên Hiệp ↔ Tiếng Việt ↔ English realtime

### HUD Agent Detail
- [x] **Click planet** → mở HUD fullscreen
- [x] **4 cột thông tin**: Agent identity, Topic selector, APIs & metrics, Mission + logs
- [x] **Workflow nodes** — các node hiển thị trong không gian HUD trên cùng
- [x] **Node edit panel** — click node để xem chi tiết/cấu hình
- [x] **Nút Truyền Âm** — mở chat riêng với agent
- [x] **Topic chips** — chọn chủ đề nhanh từ preset
- [x] **Topic custom** — nhập chủ đề thủ công, lưu vào localStorage
- [x] **Quick questions** — câu hỏi nhanh theo topic đã đặt

### AI Chat (dùng Gemini API thật)
- [x] **Vạn Giới Truyền Tin** — chatbox nổi góc phải, resize được (kéo góc)
- [x] **Chat tổng quát** với AI persona THIÊN CƠ CÁC
- [x] **Chat riêng từng agent** — modal riêng, personality khác nhau
- [x] **Lưu lịch sử chat** theo từng agent (localStorage, tối đa 20 tin)
- [x] **Xóa lịch sử** chat
- [x] **Voice input** (Web Speech API) — nhận giọng nói → gửi chat
- [x] **Voice output** (Web Speech Synthesis) — AI đọc phản hồi
- [x] **Nút lưu vào Vault** từ chat agent

### Tạo nhân vật (dùng Gemini Image API thật)
- [x] Trang `/create-character` riêng biệt
- [x] Chọn: giới tính, tông phái (Thủy/Hỏa/Kim/Mộc/Thổ), kiểu tóc (9 loại)
- [x] Chọn: màu tóc, màu mắt, tông da, kiểu mắt, vóc dáng, tên nhân vật
- [x] **Sinh ảnh AI** với prompt xianxia MMORPG style
- [x] **Xóa nền tự động** bằng thuật toán BFS flood-fill (Jimp) — xóa nền đen solid
- [x] **Avatar lưu localStorage** — hiển thị trong giao diện chính

### Các Panel & Công cụ
- [x] **Bảng Xếp Hạng** — sort theo Revenue / Automation / Intelligence / Efficiency
- [x] **So Sánh Agent** — chọn 2 agent, hiển thị radar chart comparison
- [x] **Trận Pháp Builder** — kéo thả nodes từ thư viện vào canvas, vẽ connection
- [x] **Mạng Thần Kinh** — animation neural network 3D canvas
- [x] **Nhiệm Vụ (Mission Control)** — 6 nhiệm vụ kích hoạt cụm agent có animation
- [x] **Analytics Dashboard** — biểu đồ line 30 ngày, pie chart phân loại, top 5 bar
- [x] **Yêu Thích** — bookmark agent, xem danh sách, click để chat
- [x] **Lịch Sử** — nhật ký kích hoạt có timestamp, nút xóa
- [x] **AI Advisor** — hỏi AI gợi ý agent phù hợp theo yêu cầu văn bản
- [x] **Mini Game (Agent Hunt)** — đoán agent từ hint, lưu high score localStorage
- [x] **Alerts** — đặt ngưỡng doanh thu, lưu/xóa/xem danh sách
- [x] **Workflow Manager (WFM)** — xem/sửa/thêm/xóa bước workflow từng agent (6 agent/trang)
- [x] **Kho Tàng (Vault)** — lưu kết quả chat, filter theo loại, sort, search, xem chi tiết, xóa
- [x] **9 Realms** — màn hình vũ trụ 9 cõi fullscreen
- [x] **Lâm Thiên Giới** — widget 3D mini góc màn hình, click mở 9 Realms
- [x] **Kích Hoạt Tất Cả** — animation đếm ngược kích hoạt 100 agent
- [x] **Bí Kíp Vũ Trụ** — hướng dẫn 3 chương cho tân thủ
- [x] **Persistent Avatar** — avatar nhân vật hiển thị cố định, đổi theo theme

### Mobile & Accessibility
- [x] Responsive CSS cho ≤768px và ≤420px
- [x] Orbit buttons chuyển thành dock ngang vuốt trên mobile
- [x] Chatbox Vạn Giới Truyền Tin resize bằng cảm ứng (touch)

### Trang phụ
- [x] `user.html` — trang profile có: starfield bg, topbar, grid agent, chat panel, tạo nhân vật button (nhưng dữ liệu agent hardcode, chat không kết nối backend)
- [x] `create-character.html` — giao diện đầy đủ tạo nhân vật với 3D preview

---

## 6. Còn thiếu — vấn đề cần xử lý

### A. Bảo mật & Auth (NGHIÊM TRỌNG)
| Vấn đề | Chi tiết | Mức độ |
|--------|---------|--------|
| **Đăng nhập là GIẢ** | `mockLogin()` không xác thực — nhập gì cũng vào được | 🔴 Cao |
| **Không có session thật** | Replit Auth đã cài sẵn (`/api/login`, `/api/callback`) nhưng frontend không gọi, dùng login giả | 🔴 Cao |
| **Không phân biệt user** | Tất cả dữ liệu lưu chung localStorage, không có userId | 🔴 Cao |
| **Trang /admin không bảo vệ** | Serve cùng file `tienhiepv3.html`, ai cũng vào được | 🟡 Trung |
| **Trang /user không bảo vệ** | Không check đăng nhập trước khi serve | 🟡 Trung |

### B. Dữ liệu (NGHIÊM TRỌNG)
| Vấn đề | Chi tiết | Mức độ |
|--------|---------|--------|
| **Toàn bộ lưu localStorage** | Chat history, vault, favorites, alerts, workflow edits — xóa cache là mất hết | 🔴 Cao |
| **Không có Database** | Không PostgreSQL, không MongoDB, không gì cả | 🔴 Cao |
| **100 agent là hardcode** | Không thêm/sửa/xóa agent từ UI được | 🟡 Trung |
| **Doanh thu là số giả** | Tất cả revenue trong AI_AGENTS là hardcode, không thật | 🟡 Trung |
| **Analytics là dữ liệu giả** | Biểu đồ 30 ngày dùng số random seed, không từ DB thật | 🟡 Trung |

### C. Tính năng chưa hoạt động thật
| Tính năng | Trạng thái thật | Mức độ |
|-----------|----------------|--------|
| **Workflow Builder** | Chỉ lưu node config vào localStorage, không chạy automation thật | 🟡 Trung |
| **Mission Control** | Chỉ animation countdown giả, không gọi AI thật | 🟡 Trung |
| **Alerts / Cảnh báo** | Dựa trên số giả, không trigger thật | 🟡 Thấp |
| **Kích Hoạt Tất Cả** | Chỉ animation, không gọi 100 API thật | 🟡 Thấp |
| **Nút Gmail đăng nhập** | Hiển thị nhưng redirect về `/api/login` — chưa wired đúng với frontend flow | 🟡 Trung |
| **Voice Chat** | Chỉ hoạt động tốt trên Chrome — Safari/Firefox không hỗ trợ Web Speech API | 🟡 Trung |

### D. Trang & Files chưa dùng
| File | Vấn đề |
|------|--------|
| `user.html` | Có giao diện nhưng chat panel không kết nối `/api/chat` thật |
| `tienhiepai-ui.html` | File 708KB không được route serve — có vẻ là phiên bản cũ |
| `inject.js`, `inject2-6.js` | 6 script inject từ thời dev, không dùng trong production |
| `test_dom.js` | File test không cần trong production |
| `models/` | 4 model 3D (character1.vrm, character2.vrm, michelle.glb, xbot.glb ~27MB) — chưa tích hợp vào giao diện chính |

### E. Kỹ thuật & Code quality
| Vấn đề | Chi tiết |
|--------|---------|
| **1 file HTML 9.694 dòng** | Cực khó bảo trì, dễ conflict khi nhiều người sửa |
| **Không có error handling** | Mất kết nối internet → không báo lỗi thân thiện |
| **Không có loading state** | Tạo nhân vật mất 10–30 giây, không có progress bar đẹp |
| **Không có retry logic** | Nếu Gemini API lỗi → chỉ báo text thô |
| **Snapshot Watcher** | `generate-snapshot.js` chạy background theo dõi file, tốn tài nguyên khi dev |
| **SESSION_SECRET fallback** | Code có `|| 'vdai-fallback-secret'` — dùng fallback nếu không có secret (đã fix trong Replit) |

---

## 7. Cần thêm — đề xuất chi tiết theo ưu tiên

### 🔴 ƯU TIÊN 1 — Cần làm ngay (ảnh hưởng trực tiếp người dùng thật)

#### 1.1 Kết nối Auth thật vào Frontend
**Hiện tại:** Frontend dùng `mockLogin()` giả  
**Cần làm:** Thay button "Tiến Nhập" gọi `/api/login` (Replit OIDC đã có sẵn)  
**Backend đã có:** `/api/login`, `/api/callback`, `/api/logout`, `/api/auth/user`  
**Việc cần làm:** Chỉ cần sửa frontend HTML để redirect đúng

#### 1.2 Database PostgreSQL
**Hiện tại:** Tất cả lưu localStorage  
**Cần làm:** Tạo bảng lưu:
- `users` — thông tin người dùng từ Replit Auth
- `vault_items` — kết quả chat lưu vào Kho Tàng
- `chat_history` — lịch sử chat theo userId + agentId
- `favorites` — agent yêu thích của user
- `agent_topics` — chủ đề đặt cho từng agent
- `workflow_configs` — cấu hình workflow từng agent
**Replit PostgreSQL đã được cấp** (DATABASE_URL, PGHOST... đã có trong secrets)

#### 1.3 Loading & Error UX khi tạo nhân vật
**Hiện tại:** Chờ 10–30s không có phản hồi gì  
**Cần làm:** Progress bar animation, text trạng thái ("Đang luyện khí...", "Triệu hồi linh hồn...", "Tẩy trắng nền..."), nút retry khi lỗi

#### 1.4 Kết nối chat trong user.html với backend
**Hiện tại:** `user.html` có giao diện chat nhưng không gọi API  
**Cần làm:** Thêm fetch `/api/chat` vào JavaScript của `user.html`

---

### 🟡 ƯU TIÊN 2 — Tăng giá trị sản phẩm đáng kể

#### 2.1 Thêm/Sửa/Xóa Agent từ trang Admin
**Hiện tại:** 100 agent hardcode trong JS  
**Cần làm:** Trang `/admin` riêng với CRUD agent, lưu vào PostgreSQL, serve JSON cho frontend

#### 2.2 Export Kho Tàng
**Hiện tại:** Chỉ xem trong UI  
**Cần làm:** Nút tải xuống PDF / Word / CSV từ vault items

#### 2.3 Chia sẻ kết quả agent
**Hiện tại:** Kết quả chỉ xem cá nhân  
**Cần làm:** Tạo share link `/share/:id` — ai có link đều xem được

#### 2.4 Thông báo realtime (WebSocket)
**Hiện tại:** Không có  
**Cần làm:** WebSocket server-sent events khi tạo nhân vật xong, khi Agent hoàn thành task dài

#### 2.5 Agent Hunt Game — thêm câu hỏi & level
**Hiện tại:** Game cơ bản  
**Cần làm:** Nhiều level khó, leaderboard online (lưu DB), phần thưởng điểm số

---

### 🟢 ƯU TIÊN 3 — Polish & mở rộng

#### 3.1 Trang User Profile thật
**Cần làm:** Avatar nhân vật, thống kê cá nhân (tổng chat, vault items, agents yêu thích nhất), lịch sử online

#### 3.2 Tích hợp Model 3D VRM/GLB
**Có sẵn:** `models/character1.vrm`, `character2.vrm`, `michelle.glb`, `xbot.glb`  
**Cần làm:** Dùng `@pixiv/three-vrm` (đã có import trong create-character.html) để animate avatar nhân vật trong giao diện chính

#### 3.3 PWA (Progressive Web App)
**Cần làm:** `manifest.json`, service worker, icon — cho phép cài App lên điện thoại

#### 3.4 Tách tienhiepv3.html thành nhiều file
**Hiện tại:** 9.694 dòng 1 file  
**Cần làm:** Tách CSS ra `style.css`, tách JS ra `app.js`, `agents.js`, `chat.js`, `ui.js`...

#### 3.5 Thanh toán
**Cần làm:** Tích hợp Stripe (Replit có integration) — gói Free/Pro/Enterprise, giới hạn lượt chat/tạo ảnh theo gói

#### 3.6 Doanh thu thật
**Cần làm:** Theo dõi lượt chat thật theo từng agent, hiển thị analytics từ DB thay vì số giả

---

## 8. Bảng tổng quan nhanh

| Hạng mục | Trạng thái | Chi tiết |
|----------|-----------|---------|
| Giao diện / UI | ✅ Xuất sắc | Đầu tư rất kỹ, hiệu ứng đẹp, 3D mượt |
| AI Chat (Gemini) | ✅ Hoạt động | Gemini 2.5 Flash, có personality agent |
| AI Tạo Ảnh | ✅ Hoạt động | Gemini Flash Image + xóa nền BFS |
| Voice Chat | ⚠️ Hạn chế | Chỉ Chrome, cần fallback cho browser khác |
| Mobile Responsive | ✅ Đã có | CSS 768px + 420px breakpoints |
| Replit Auth (backend) | ✅ Đã có | OIDC setup hoàn chỉnh trong server.js |
| Đăng nhập thật (frontend) | ❌ Chưa | Frontend vẫn dùng mockLogin() giả |
| Database | ❌ Chưa | Replit PostgreSQL đã cấp nhưng chưa dùng |
| Dữ liệu user server-side | ❌ Chưa | Tất cả localStorage |
| 100 Agent thật | ❌ Chưa | Chỉ UI trang trí, AI chỉ qua /api/chat |
| Workflow automation thật | ❌ Chưa | Builder chỉ lưu config |
| Thanh toán | ❌ Chưa | Chưa có |
| Admin panel thật | ❌ Chưa | /admin serve cùng trang chính |
| Sẵn sàng kinh doanh | ⚠️ Cần thêm | Phải có auth + DB trước |

---

## 9. Cấu trúc file dự án

```
/
├── server.js              (~16KB)  Backend Express — 3 API endpoint thật
├── tienhiepv3.html        (~1MB)   Frontend chính — TOÀN BỘ UI (9.694 dòng)
├── create-character.html  (~100KB) Trang tạo nhân vật xianxia
├── user.html              (~25KB)  Trang user profile (giao diện có, logic thiếu)
├── tienhiepai-ui.html     (~692KB) Phiên bản UI cũ — KHÔNG DÙNG, có thể xóa
├── package.json                    Node.js dependencies
├── replit.nix                      Nix packages (pkgs.unzip)
├── .replit                         Workflows, ports, integrations config
│
├── models/                         Models 3D CHƯA tích hợp
│   ├── character1.vrm
│   ├── character2.vrm
│   ├── michelle.glb
│   └── xbot.glb
│
├── attached_assets/                Ảnh được tạo/upload
│   └── *.png, *.txt
│
├── inject.js               Script inject cũ — có thể xóa
├── inject2-6.js            Script inject cũ — có thể xóa
├── test_dom.js             File test — có thể xóa
├── generate-snapshot.js    Watcher tạo TONG_HOP_CODE.md
├── TONG_HOP_APP.md         Tổng hợp app cũ
├── TONG_HOP_CODE.md        Snapshot toàn bộ code (~1.2MB)
├── TONG_HOP_FULL.md        File này
│
└── .replit_integration_files/     Mẫu code tích hợp Replit (tham khảo)
    ├── server/replit_integrations/
    │   ├── auth/           Auth OIDC pattern
    │   ├── chat/           Gemini chat pattern
    │   └── image/          Gemini image pattern
    └── client/src/
        └── hooks/use-auth.ts
```

### API Endpoints hiện có

| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| GET | `/` | Serve tienhiepv3.html | Không |
| GET | `/user` | Serve tienhiepv3.html | Không |
| GET | `/admin` | Serve tienhiepv3.html | Không |
| GET | `/create-character` | Serve create-character.html | Không |
| POST | `/api/chat` | Chat Gemini AI | Không |
| POST | `/api/generate-character` | Tạo ảnh nhân vật | Không |
| GET | `/api/auth/user` | Lấy thông tin user | Cần login |
| GET | `/api/login` | Bắt đầu OIDC flow | Không |
| GET | `/api/callback` | OIDC callback | Không |
| GET | `/api/logout` | Đăng xuất | Không |
| GET | `/api/status` | Health check | Không |

---

*File được tạo bởi Replit Agent — 09/05/2026*
