'use strict';

/**
 * Centralised Express error handler.
 * Must be registered LAST (after all routes).
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  const code = err.code || 'SERVER_ERROR';

  // Log server errors (not client errors)
  if (status >= 500) {
    console.error('[ErrorHandler]', err.message, err.stack);
  }

  res.status(status).json({
    error: true,
    code: code,
    message: err.message || 'An unexpected error occurred',
    retryAfter: err.retryAfter || null,
  });
}

module.exports = errorHandler;
