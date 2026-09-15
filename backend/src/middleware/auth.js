const { verifyAccessToken } = require('../utils/token');
const { pool } = require('../config/db');

// JWT verify karke req.user set karta hai
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication token missing' });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // DB se fresh user (deactivate hone par turant block)
    const { rows } = await pool.query(
      'SELECT id, name, email, username, role, team_id, is_active FROM users WHERE id = $1',
      [decoded.id]
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ success: false, message: 'User inactive or not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate };
