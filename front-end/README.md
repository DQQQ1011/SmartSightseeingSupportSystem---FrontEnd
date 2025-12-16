# Smart Sightseeing - Frontend

Frontend cho hệ thống Smart Sightseeing, xây dựng bằng React + Vite.

## Yêu cầu

- Node.js v18.x+
- npm v9.x+

## Cài đặt & Chạy Local

```bash
# 1. Cài dependencies
npm install

# 2. Copy file môi trường
cp .env.example .env

# 3. Chạy dev server
npm run dev
```

Frontend chạy tại: **http://localhost:5173**

## Cấu hình .env

```env
# Để trống cho local (dùng Vite proxy)
VITE_BEFORE_API_URL=
VITE_DURING_API_URL=
VITE_AFTER_API_URL=
VITE_AUTH_API_URL=

# Google OAuth (tùy chọn)
VITE_GOOGLE_CLIENT_ID=your_client_id
```

## Backend Ports (Local)

| Service | Port | Mô tả |
|---------|------|-------|
| Auth | 8000 | Đăng nhập, OAuth |
| Before | 8001 | Destinations, Search, AI |
| During | 8002 | Visual Search |
| After | 8003 | Albums, Trip Summary |

## Scripts

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview build |
| `npm run lint` | Check lỗi code |

## Cấu trúc

```
src/
├── components/   # UI components
├── context/      # React Context
├── pages/        # Page components
├── services/     # API calls
└── App.jsx       # Main app
```

## Tech Stack

- React 19
- Vite 7
- React Router DOM
- Axios
- Leaflet (Maps)
