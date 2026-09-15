// Password policy — na too strict, na weak.
// Rule: min 8 chars, kam se kam 1 letter aur 1 number.
function checkPasswordStrength(pw) {
  if (!pw || pw.length < 8) return { ok: false, message: 'Password must be at least 8 characters' };
  if (!/[A-Za-z]/.test(pw)) return { ok: false, message: 'Password must contain at least 1 letter' };
  if (!/[0-9]/.test(pw)) return { ok: false, message: 'Password must contain at least 1 number' };
  const weak = ['password', '12345678', 'qwerty123', 'admin123'];
  if (weak.includes(pw.toLowerCase())) return { ok: false, message: 'This password is too common, choose another' };
  return { ok: true };
}

module.exports = { checkPasswordStrength };
