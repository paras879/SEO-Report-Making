const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} = require('../utils/token');
const { logAudit } = require('../utils/audit');
const { checkPasswordStrength } = require('../utils/password');
const { MAX_FAILED_ATTEMPTS, LOCK_MINUTES, BCRYPT_ROUNDS } = require('../config/security');

const REFRESH_DAYS = 7;

// POST /api/auth/login  { identifier (username or email), password }
async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;
    const idf = String(identifier || '').trim().toLowerCase();

    const { rows } = await pool.query(
      `SELECT * FROM users WHERE lower(username) = $1 OR lower(email) = $1 LIMIT 1`,
      [idf]
    );
    const user = rows[0];

    // same generic message (user enumeration se bachav)
    if (!user) {
      await logAudit({ action: 'login_failed', details: { identifier: idf }, req });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Your account is blocked. Please contact admin to unblock your account.' });
    }

    // ---- Brute-force lockout: agar account locked hai to rok do ----
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      await logAudit({ userId: user.id, action: 'login_blocked_locked', req });
      return res.status(403).json({
        success: false,
        message: 'Your account is blocked. Please contact admin to unblock your account.',
      });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      // failed attempt count badhao; limit cross (>= 5) to block account permanently until admin unblocks
      const attempts = (user.failed_attempts || 0) + 1;
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        await pool.query('UPDATE users SET failed_attempts = $1, is_active = FALSE, locked_until = NULL WHERE id = $2', [attempts, user.id]);
        await logAudit({ userId: user.id, action: 'account_blocked_max_attempts', details: { attempts }, req });
        return res.status(403).json({
          success: false,
          message: 'Your account is blocked. Please contact admin to unblock your account.',
        });
      }
      await pool.query('UPDATE users SET failed_attempts = $1 WHERE id = $2', [attempts, user.id]);
      await logAudit({ userId: user.id, action: 'login_failed', details: { attempts }, req });
      const left = MAX_FAILED_ATTEMPTS - attempts;
      return res.status(401).json({ success: false, message: `Invalid credentials. ${left} attempt(s) left.` });
    }

    // success -> failed counter reset
    if (user.failed_attempts > 0 || user.locked_until) {
      await pool.query('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // refresh token DB me hashed store
    const expires = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`,
      [user.id, hashToken(refreshToken), expires]
    );
    await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
    await logAudit({ userId: user.id, action: 'login_success', req });

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        team_id: user.team_id,
        must_change_password: user.must_change_password,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/refresh  { refreshToken }
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'refreshToken required' });

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const hashed = hashToken(refreshToken);
    const { rows } = await pool.query(
      `SELECT rt.*, u.role, u.username, u.team_id, u.is_active
       FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1 AND rt.revoked = FALSE AND rt.expires_at > now()`,
      [hashed]
    );
    const record = rows[0];
    if (!record || !record.is_active) {
      return res.status(401).json({ success: false, message: 'Refresh token expired or revoked' });
    }

    const accessToken = signAccessToken({
      id: record.user_id,
      role: record.role,
      username: record.username,
      team_id: record.team_id,
    });
    res.json({ success: true, accessToken });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout  { refreshToken }
async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1', [
        hashToken(refreshToken),
      ]);
    }
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
async function me(req, res) {
  res.json({ success: true, user: req.user });
}

// POST /api/auth/change-password  { currentPassword, newPassword }
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!ok) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    const strength = checkPasswordStrength(newPassword);
    if (!strength.ok) return res.status(422).json({ success: false, message: strength.message });

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await pool.query(
      'UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = now() WHERE id = $2',
      [hash, req.user.id]
    );
    // saare purane refresh tokens revoke
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [req.user.id]);
    await logAudit({ userId: req.user.id, action: 'password_changed', req });
    res.json({ success: true, message: 'Password changed successfully. Please log in again.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, refresh, logout, me, changePassword };
