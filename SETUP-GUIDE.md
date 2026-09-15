# Detailed Setup Guide (Hinglish)

Ye guide step-by-step batata hai ki system ko apne computer pe kaise chalana hai.

## Step 1 — Software install karo
1. **Node.js** — https://nodejs.org (LTS version) install karo. Check: terminal me `node -v`.
2. **PostgreSQL** — https://www.postgresql.org/download/windows/ se install karo. Install ke time jo password set karte ho (postgres user ka), wo yaad rakho.

## Step 2 — Database banao
PostgreSQL ke saath aane wale **pgAdmin** ya **SQL Shell (psql)** kholo aur ye chalao:
```sql
CREATE DATABASE seo_report;
```

## Step 3 — Backend chalao
1. `backend` folder me jao.
2. `.env.example` ki copy banao aur naam `.env` rakho.
3. `.env` file kholo aur ye values set karo:
   - `DB_PASSWORD` = tumhara PostgreSQL password
   - `JWT_SECRET` aur `JWT_REFRESH_SECRET` = koi bhi lambi random string (min 32 characters)
   - `SUPERADMIN_PASSWORD` = apna pasand ka strong password (ye pehle Super Admin ka hoga)
4. Terminal me:
   ```bash
   cd backend
   npm install
   npm run db:init
   npm run db:seed
   npm start
   ```
5. `🚀 SEO Report API running on http://localhost:5000` dikhe = backend ready.

## Step 4 — Frontend chalao
1. **Naya** terminal kholo.
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Browser me `http://localhost:5173` kholo.

## Step 5 — Pehla login aur setup
1. Super Admin username/password (jo `.env` me the) se login karo.
2. Password change karo.
3. **Teams** page → team banao (baad me team lead assign kar sakte ho).
4. **Users** page → team leads banao, phir employees banao (employee ko team assign karna zaroori hai).
5. Team lead login karke apni team ki reports dekh sakta hai.
6. Employee login karke report bhar ke submit karega → uske team lead ke paas jayegi.

## Report ka safar (kaise kaam karta hai)
1. **Employee** report banata hai → "Submit to Team Lead".
2. **Team Lead** ke dashboard me "Pending Review" me aati hai → wo **Forward to Admin** ya **Return** kar sakta hai.
3. **Admin** ke paas forwarded reports aati hain → **Approve** ya **Return to Team Lead**.
4. **Super Admin** har report ka poora safar (kisne kya kiya, kab, kya comment) "Report Flow" section me dekh sakta hai, plus **Audit Logs**.

## API Endpoints (reference)
```
POST   /api/auth/login              login (identifier + password)
POST   /api/auth/refresh            naya access token
POST   /api/auth/change-password    password change
GET    /api/dashboard/stats         role-wise summary
POST   /api/users                   user banao (admin/super_admin)
GET    /api/users                   users list
POST   /api/teams                   team banao
GET    /api/teams/:id               team + members
POST   /api/teams/:id/members       employee add
POST   /api/reports                 report banao (employee)
POST   /api/reports/:id/submit      submit to TL
POST   /api/reports/:id/forward     TL -> admin
POST   /api/reports/:id/reject      TL -> employee (return)
POST   /api/reports/:id/approve     admin approve
POST   /api/reports/:id/admin-reject admin -> TL (return)
GET    /api/reports                 role-scoped list
GET    /api/reports/:id             detail + full chain
GET    /api/dashboard/audit         audit logs (super_admin)
```

## Common problems
- **DB connection error** → `.env` me DB_PASSWORD/DB_NAME check karo, PostgreSQL service chal rahi hai ya nahi dekho.
- **CORS error** → backend `.env` me `CLIENT_URL` ko frontend URL pe set karo.
- **Login nahi ho raha** → `npm run db:seed` chalaya tha? Super Admin bana ya nahi console me dekho.
- **npm install fail** → internet connection check karo (ye packages npm registry se aate hain).
