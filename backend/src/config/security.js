// Central security settings (ek jagah se tune karo)
module.exports = {
  // Login brute-force lockout
  MAX_FAILED_ATTEMPTS: 5,      // itni galat koshish ke baad
  LOCK_MINUTES: 15,            // itne minute account lock

  // bcrypt cost
  BCRYPT_ROUNDS: 12,
};
