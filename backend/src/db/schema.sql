-- ================================================================
-- SEO Report Management System - Database Schema (PostgreSQL)
-- Hierarchy: Employee -> Team Lead -> Admin -> Super Admin
-- ================================================================

-- ---------- ENUM types ----------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'team_lead', 'employee');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM (
    'draft',              -- employee ne save kiya, submit nahi kiya
    'submitted',         -- employee -> team lead
    'tl_rejected',       -- team lead ne wapas bheja (revise)
    'forwarded',         -- team lead -> admin
    'admin_rejected',    -- admin ne wapas team lead ko
    'admin_approved'     -- final approved
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE report_level AS ENUM ('employee', 'team_lead', 'admin', 'super_admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ---------- USERS ----------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) UNIQUE NOT NULL,
  username      VARCHAR(60)  UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role    NOT NULL DEFAULT 'employee',
  team_id       INTEGER,                       -- employee/team_lead kis team me hai
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---------- TEAMS ----------
CREATE TABLE IF NOT EXISTS teams (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  description   TEXT,
  team_lead_id  INTEGER REFERENCES users(id) ON DELETE SET NULL, -- team ka lead
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- users.team_id -> teams.id (circular, isliye baad me add)
DO $$ BEGIN
  ALTER TABLE users
    ADD CONSTRAINT fk_users_team
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Security: brute-force lockout columns (idempotent for existing installs)
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- ---------- REPORTS ----------
CREATE TABLE IF NOT EXISTS reports (
  id              SERIAL PRIMARY KEY,
  employee_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id         INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  team_lead_id    INTEGER REFERENCES users(id) ON DELETE SET NULL, -- snapshot: kis TL ko gayi
  title           VARCHAR(180) NOT NULL,
  report_date     DATE NOT NULL DEFAULT CURRENT_DATE,

  -- ---- Basic work ----
  task_done       TEXT,
  hours_worked    NUMERIC(5,2),
  work_status     VARCHAR(40),          -- e.g. completed / in-progress / pending
  remarks         TEXT,

  -- ---- SEO metrics ----
  keywords        TEXT,
  backlinks_created INTEGER DEFAULT 0,
  onpage_work     TEXT,
  offpage_work    TEXT,
  ranking_change  TEXT,

  -- ---- Client / Project ----
  client_name     VARCHAR(160),
  project_name    VARCHAR(160),
  website_url     VARCHAR(300),

  status          report_status NOT NULL DEFAULT 'draft',
  current_level   report_level  NOT NULL DEFAULT 'employee', -- abhi kaha padi hai chain me
  submitted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- reports: extra company-grade fields (idempotent for existing installs)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS challenges TEXT;        -- problems / blockers
ALTER TABLE reports ADD COLUMN IF NOT EXISTS next_day_plan TEXT;     -- kal ka plan
ALTER TABLE reports ADD COLUMN IF NOT EXISTS priority VARCHAR(10) NOT NULL DEFAULT 'medium'; -- low/medium/high

-- Website work + backlink type breakdown (for SEO teams)
ALTER TABLE reports ADD COLUMN IF NOT EXISTS service_pages TEXT;    -- service pages worked on
ALTER TABLE reports ADD COLUMN IF NOT EXISTS blog_pages TEXT;       -- blog pages worked on
ALTER TABLE reports ADD COLUMN IF NOT EXISTS backlinks_classified   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS backlinks_guest_post   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS backlinks_blog_post    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS backlinks_article_post INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS backlink_urls          TEXT;

-- ---------- REPORT COMMENTS (discussion thread — sab log likh sakte) ----------
CREATE TABLE IF NOT EXISTS report_comments (
  id         SERIAL PRIMARY KEY,
  report_id  INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_role  user_role,
  message    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- REPORT ATTACHMENTS ----------
CREATE TABLE IF NOT EXISTS report_attachments (
  id          SERIAL PRIMARY KEY,
  report_id   INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  file_name   VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path   VARCHAR(400) NOT NULL,
  file_size   INTEGER,
  mime_type   VARCHAR(120),
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- REPORT FLOW (poori chain ka trace) ----------
CREATE TABLE IF NOT EXISTS report_actions (
  id            SERIAL PRIMARY KEY,
  report_id     INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  action_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action_by_role user_role,
  action        VARCHAR(30) NOT NULL,   -- submitted / approved / rejected / forwarded / revised
  from_level    report_level,
  to_level      report_level,
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- NOTIFICATIONS ----------
CREATE TABLE IF NOT EXISTS notifications (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(180) NOT NULL,
  message          TEXT,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  related_report_id INTEGER REFERENCES reports(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- NOTES (free-form notepad: text + pasted images) ----------
-- Employee -> Team Lead -> Admin. content: JSON { text, images:[dataURI...] }
CREATE TABLE IF NOT EXISTS notes (
  id            SERIAL PRIMARY KEY,
  author_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author_role   user_role,
  team_id       INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  team_lead_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- kis TL ko bheja
  title         VARCHAR(200),
  content       JSONB NOT NULL,          -- { text: "...", images: ["data:..."] }
  status        VARCHAR(30) NOT NULL DEFAULT 'sent_to_tl', -- draft / sent_to_tl / forwarded_to_admin
  current_level report_level NOT NULL DEFAULT 'team_lead',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- note ka trace (kisne bheja/forward kiya + optional message)
CREATE TABLE IF NOT EXISTS note_events (
  id         SERIAL PRIMARY KEY,
  note_id    INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  actor_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_role user_role,
  action     VARCHAR(30) NOT NULL,   -- created / sent / forwarded
  message    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- note deletion/dismissal per user (so deleting from SuperAdmin/Admin does NOT delete for Employee or TL)
CREATE TABLE IF NOT EXISTS note_deletions (
  id         SERIAL PRIMARY KEY,
  note_id    INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_note_user_deletion UNIQUE (note_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_note_deletions_user ON note_deletions(user_id);
CREATE INDEX IF NOT EXISTS idx_note_deletions_note ON note_deletions(note_id);


-- ---------- CHAT MESSAGES (direct 1-on-1) ----------
CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- AUDIT LOGS (security) ----------
CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(80) NOT NULL,
  entity_type VARCHAR(60),
  entity_id   INTEGER,
  details     JSONB,
  ip_address  VARCHAR(60),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- REFRESH TOKENS (secure session) ----------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- DEVELOPER ROLE + DEV REQUESTS ----------
-- add 'developer' to the user_role enum (safe / idempotent; PG 12+)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'developer';

-- Site-issue tickets raised by employees: Employee -> Team Lead -> Developer -> resolved
CREATE TABLE IF NOT EXISTS dev_requests (
  id            SERIAL PRIMARY KEY,
  employee_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id       INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  team_lead_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  developer_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- assigned developer
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  sites         JSONB NOT NULL DEFAULT '[]',   -- [{ name, urls: [] }]  multiple sites, each multiple URLs
  priority      VARCHAR(10) NOT NULL DEFAULT 'medium',
  status        VARCHAR(30) NOT NULL DEFAULT 'submitted', -- submitted / tl_rejected / forwarded / in_progress / under_qa / resolved / reopened
  current_level VARCHAR(20) NOT NULL DEFAULT 'team_lead',  -- employee / team_lead / developer
  category      VARCHAR(60) NOT NULL DEFAULT 'other',
  client_name   VARCHAR(160),
  due_date      DATE,
  credentials_note TEXT,
  attachments   JSONB NOT NULL DEFAULT '[]',   -- [{ name, url, type, size }]
  hours_spent   NUMERIC(5,2) NOT NULL DEFAULT 0,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent column additions for existing tables
ALTER TABLE dev_requests ADD COLUMN IF NOT EXISTS category VARCHAR(60) NOT NULL DEFAULT 'other';
ALTER TABLE dev_requests ADD COLUMN IF NOT EXISTS client_name VARCHAR(160);
ALTER TABLE dev_requests ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE dev_requests ADD COLUMN IF NOT EXISTS credentials_note TEXT;
ALTER TABLE dev_requests ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]';
ALTER TABLE dev_requests ADD COLUMN IF NOT EXISTS hours_spent NUMERIC(5,2) NOT NULL DEFAULT 0;

-- trace + comments for a dev request (admin can read all)
CREATE TABLE IF NOT EXISTS dev_request_events (
  id         SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES dev_requests(id) ON DELETE CASCADE,
  actor_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_role user_role,
  action     VARCHAR(30) NOT NULL,   -- submitted / forwarded / in_progress / under_qa / resolved / rejected / reopened / commented
  message    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Indexes ----------
CREATE INDEX IF NOT EXISTS idx_devreq_emp   ON dev_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_devreq_tl    ON dev_requests(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_devreq_dev   ON dev_requests(developer_id);
CREATE INDEX IF NOT EXISTS idx_devreq_status ON dev_requests(status);
CREATE INDEX IF NOT EXISTS idx_devreq_cat    ON dev_requests(category);
CREATE INDEX IF NOT EXISTS idx_devreq_due    ON dev_requests(due_date);
CREATE INDEX IF NOT EXISTS idx_devreq_client ON dev_requests(client_name);
CREATE INDEX IF NOT EXISTS idx_devreq_events ON dev_request_events(request_id);
CREATE INDEX IF NOT EXISTS idx_users_role      ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_team      ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_lead      ON teams(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_reports_emp     ON reports(employee_id);
CREATE INDEX IF NOT EXISTS idx_reports_team    ON reports(team_id);
CREATE INDEX IF NOT EXISTS idx_reports_tl      ON reports(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_reports_status  ON reports(status);
CREATE INDEX IF NOT EXISTS idx_actions_report  ON report_actions(report_id);
CREATE INDEX IF NOT EXISTS idx_comments_report  ON report_comments(report_id);
CREATE INDEX IF NOT EXISTS idx_notes_author     ON notes(author_id);
CREATE INDEX IF NOT EXISTS idx_notes_tl         ON notes(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_notes_status     ON notes(status);
CREATE INDEX IF NOT EXISTS idx_note_events_note ON note_events(note_id);
CREATE INDEX IF NOT EXISTS idx_msg_pair    ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_msg_inbox   ON messages(receiver_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_user      ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_user      ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_user    ON refresh_tokens(user_id);
