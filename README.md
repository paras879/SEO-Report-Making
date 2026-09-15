# SEO Report Management System

Employee → Team Lead → Admin → Super Admin — report hierarchy system, high security ke saath.

## Stack
- **Backend:** Node.js + Express + PostgreSQL (JWT auth, bcrypt, RBAC, audit logs)
- **Frontend:** React + Vite + Tailwind CSS (fully responsive — web + mobile)

## Roles & Flow
| Role | Kya kar sakta hai |
|------|-------------------|
| **Super Admin** | Sab kuch dekhta hai — poori chain (employee→TL→admin), audit logs. |
| **Admin** | Users (admin/TL/employee) + teams banata hai; forwarded reports approve/reject. |
| **Team Lead** | Apni team ki submitted reports dekhta hai; forward to admin ya return to employee. |
| **Employee** | Report banata/submit karta hai — sirf apne team lead ko jaati hai. |

Report status flow:
`draft → submitted (TL) → forwarded (Admin) → admin_approved`
(TL ya Admin `return` kar de to wapas neeche revise ke liye jaati hai.)

---

## Setup (pehli baar) — 3 steps

### 0. Requirements
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- PostgreSQL 14+ ([postgresql.org](https://www.postgresql.org/download/))

### 1. Database banao
PostgreSQL me ek database banao:
```sql
CREATE DATABASE seo_report;
```

### 2. Backend
```bash
cd backend
copy .env.example .env      # Windows   (Linux/mac: cp .env.example .env)
# .env kholo aur DB_PASSWORD, JWT_SECRET waghera set karo (neeche note dekho)
npm install
npm run db:init             # tables banayega
npm run db:seed             # pehla Super Admin banayega (.env se)
npm start                   # http://localhost:5000
```

### 3. Frontend (naya terminal)
```bash
cd frontend
copy .env.example .env      # dev me khaali chal jayega
npm install
npm run dev                 # http://localhost:5173
```

Browser me `http://localhost:5173` kholo → Super Admin credentials (jo `.env` me diye the) se login karo → password change karo → users/teams banao.

---

## ⚠️ Production Security Checklist
- `.env` me `JWT_SECRET` aur `JWT_REFRESH_SECRET` ko lambi random strings se badlo (min 32 chars).
- `SUPERADMIN_PASSWORD` default mat rakho — pehle login ke baad change karo.
- HTTPS use karo (SSL certificate).
- `CLIENT_URL` .env me apne asli frontend domain pe set karo (CORS).
- Database ka strong password rakho, aur DB ko public internet pe expose mat karo.

## Folder Structure
```
backend/   -> Express API (src/: config, db, middleware, controllers, routes, utils)
frontend/  -> React app (src/: api, context, components, pages)
```

Detailed docs: `SETUP-GUIDE.md` dekho.
