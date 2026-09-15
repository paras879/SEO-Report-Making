const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}_${safe}${ext}`);
  },
});

// allowed types (screenshots + docs)
const ALLOWED = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function fileFilter(req, file, cb) {
  if (ALLOWED.includes(file.mimetype)) cb(null, true);
  else cb(Object.assign(new Error('File type not allowed'), { status: 415, publicMessage: 'File type not allowed' }), false);
}

const maxMb = Number(process.env.MAX_FILE_SIZE_MB) || 10;
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxMb * 1024 * 1024, files: 5 },
});

module.exports = { upload };
