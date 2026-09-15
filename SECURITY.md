# Security — Employee "khurapti" se bachav

Ye system employees (aur baaki users) ke liye ye protections deta hai:

## 1. Login / Account security
- **Password encryption** — sab passwords bcrypt se hash hote hain (cost 12). Plain password kahin store nahi hota, Super Admin bhi nahi dekh sakta.
- **Account lockout** — 5 baar galat password → account **15 minute** ke liye auto-lock. Brute-force (baar-baar try karke password todna) rok deta hai. Har galat try par batata hai kitni koshish baaki.
- **Strong password policy** — min 8 characters + kam se kam 1 letter aur 1 number. Common passwords (password, 12345678, etc.) block.
- **must_change_password** — Admin jo temp password deta hai, employee ko pehle login par change karna padta hai.
- **JWT tokens** — short-lived access token + refresh token. Refresh token DB me **hashed** store hota hai, plain nahi.
- **Deactivate = turant block** — Admin kisi employee ko deactivate kare to uske saare active sessions (refresh tokens) turant revoke, wo dobara login nahi kar sakta.

## 2. Role-Based Access Control (RBAC) — har role apni hi cheez
- Employee sirf **apni** reports dekh/edit kar sakta hai — kisi aur ki nahi.
- Employee user/team management ke pages/API ko **touch bhi nahi kar sakta** (server block karta hai, sirf UI hide nahi).
- Team Lead sirf **apni team** ki reports dekhta hai — dusri team ka data 0.
- Admin sirf forwarded reports dekhta hai.
- Super Admin sab dekhta hai (read-only chain + audit).

## 3. Data tampering se bachav
- Employee report banate/edit karte waqt **status, team, employee-id, hierarchy** jaise fields set nahi kar sakta — ye server khud req.user se leta hai. Chahe koi API me extra field bheje, ignore hoga.
- Report **submit hone ke baad edit nahi** ho sakti (sirf draft ya "returned" state me edit).
- Ek employee dusre ki report **submit/edit/attach** nahi kar sakta (server ownership check karta hai).
- Attachment download bhi access-controlled — sirf wahi log jinke pass report ka access hai.
- **Admin bhi Super Admin ya dusre Admin ko modify/deactivate/reset nahi kar sakta.** Koi khud ko deactivate nahi kar sakta.

## 4. Input validation
- Har API request server-side validate hoti hai (express-validator): title length, hours 0-24, backlinks number, valid URL, text length caps.
- **SQL injection** se bachav — saari queries parameterized ($1, $2...) hain, kabhi string-concat nahi.
- Request body size cap (1MB), file upload cap (10MB, sirf allowed types: images/PDF/Excel/Word).

## 5. Audit trail
- Har important action (login success/fail, account lock, user create, report submit/forward/approve/reject, password change/reset) **audit_logs** me record hota hai — user, IP, time ke saath. Super Admin dekh sakta hai.

## 6. HTTP security
- **helmet** — secure HTTP headers.
- **CORS** — sirf tumhare frontend domain se requests (CLIENT_URL .env me set karo).
- **Rate limiting** — global (500/15min) + login pe strict (10/15min per IP).

## Production me ye zaroor karo
1. `.env` me `JWT_SECRET` / `JWT_REFRESH_SECRET` → lambi random strings (min 32 chars).
2. Default `SUPERADMIN_PASSWORD` change karo.
3. **HTTPS** (SSL) laga ke chalao.
4. Database strong password, public internet pe expose mat karo.
5. Regular backup lo.

## Tune karna ho to
`backend/src/config/security.js` me lockout attempts/minutes aur bcrypt rounds change kar sakte ho.
