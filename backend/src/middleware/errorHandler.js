'use strict';

function notFound(req, res, _next) {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('[error]', err);
  }
  res.status(status).json({
    error: err.expose ? err.message : status >= 500 ? 'Internal Server Error' : err.message,
  });
}

module.exports = { notFound, errorHandler };
