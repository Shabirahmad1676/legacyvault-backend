const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || (String(statusCode).startsWith('4') ? 'fail' : 'error');

  console.error('❌ [ERROR]:', err);

  res.status(statusCode).json({
    status,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;
