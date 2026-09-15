// 404
function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

// Central error handler
function errorHandler(err, req, res, next) {
  console.error('ERROR:', err.message);
  // Postgres unique violation
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Duplicate value: record already exists' });
  }
  // Multer file size
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File too large' });
  }
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.publicMessage || (status === 500 ? 'Internal server error' : err.message),
  });
}

module.exports = { notFound, errorHandler };
