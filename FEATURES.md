# Features — SEO Report Management System

## Roles & Report Flow
- Hierarchy: **Employee → Team Lead → Admin → Super Admin**
- Employee ki report sirf uske Team Lead ko jaati hai → TL admin ko forward karta hai → Super Admin sab dekhta hai.

## Report banane me (Employee)
- **Basic:** Title, Date, Priority (High/Medium/Low), Hours, Work Status
- **Kya kaam kiya (Work Done)** — detail me likho
- **Problem / Blocker** — koi dikkat aayi to yahan likho
- **Kal ka plan (Next Day Plan)**
- **SEO metrics:** Keywords, Backlinks, On-page, Off-page, Ranking change
- **Client/Project:** Client, Project, Website URL
- **Attachments:** Screenshots / PDF / Excel (max 5)
- Draft save ya direct submit

## 💬 Direct Chat (NEW)
- Real-time-jaisa 1-on-1 chat (WhatsApp style), sidebar me **Chat** menu (unread count badge ke saath).
- **Rules (kaun kis se baat kare):**
  - **Employee** → apne Team Lead se **aur** Admin se
  - **Team Lead** → Admin se **aur** apni team ke employees se
  - **Admin / Super Admin** → **sabse** (saare team leads + saare employees)
- Admin ke liye chat me **All / Team Leads / Employees** filter + search.
- Message bubbles, unread badges, auto-scroll, har 3 second me naye message aa jate hain.

## 📝 Notes / Notepad (NEW)
- Employee aur Team Lead ke liye ek **notepad** — jahan free text likh sakte ho ki kya kaam kiya, koi problem.
- **Screenshot / image Ctrl+V se paste** kar sakte ho (ya "Image add karo" button se) — image compress hoke note me lag jati hai.
- **Send** dabao → Employee ka note uske **Team Lead** ko jata hai.
- Team Lead pura note (text + images) padhta hai, phir apna message add karke **Admin ko forward** karta hai.
- Team Lead khud bhi note bana ke seedha Admin ko bhej sakta hai.
- Har note ka status aur history (kisne kab bheja/forward kiya) dikhta hai.

## 💬 Report Discussion
- Har report pe **employee, team lead, aur admin sab comment kar sakte hain** — chat jaisa.
- Jab koi comment kare, baaki logo ko notification milta hai.
- Poori baat-cheet report ke andar dikhti hai.

## 🔔 Notifications (NEW)
- Top pe bell icon, unread count ke saath.
- Report submit/forward/approve/reject/comment — sab ka notification.
- Click karke seedha report pe jao, "Mark all read" bhi.

## 📊 Dashboard (NEW)
- Role-wise summary cards.
- **Reports by Status** chart aur **Last 7 Days Activity** chart.

## 📥 Export (NEW)
- Admin / Super Admin reports ko **CSV (Excel me khulta hai)** download kar sakte hain.
- Status/date filter ke saath export.

## Approval Actions
- **Team Lead:** Forward to Admin / Return to Employee (comment ke saath)
- **Admin:** Approve / Return to Team Lead (comment ke saath)
- Har action ka poora **history timeline** report me dikhta hai.

## Super Admin
- Sab users, teams, reports, poori chain.
- **Audit Logs** — har action ka record (kaun, kab, IP).

## Security (SECURITY.md me detail)
- bcrypt passwords, JWT, account lockout (5 galat try → 15 min), strong password policy.
- RBAC + team data isolation, input validation, SQL-injection safe, audit logs.
