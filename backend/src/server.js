const app = require('./app');
const { initDb } = require('./db/init');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await initDb();
  } catch (err) {
    console.warn('⚠️ Auto DB schema init error:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 SEO Report API running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });
})();
