const { BadRequestError, ForbiddenError } = require('../errors/AppError');

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Middleware generator to validate that specified URL parameters match UUIDv4 format.
 * Prevents path traversal, SQL/NoSQL injection, and malformed entity lookups.
 *
 * @param  {...string} paramNames URL parameter keys (e.g. 'id', 'owner_id')
 * @returns {Function} Express middleware
 */
function validateUuidParams(...paramNames) {
  return (req, res, next) => {
    for (const name of paramNames) {
      const val = req.params[name];
      if (val !== undefined && !UUID_V4_REGEX.test(val)) {
        return next(
          new BadRequestError(
            `Invalid format for parameter "${name}". Must be a valid UUIDv4 string.`
          )
        );
      }
    }
    next();
  };
}

/**
 * Middleware ensuring that a target owner or contact ID does not match the authenticated user.
 * Prevents self-targeting vectors (e.g. requesting access to own vault, voting on self).
 *
 * @param {string} paramName URL parameter key representing the other user
 * @returns {Function} Express middleware
 */
function ensureNotSelf(paramName) {
  return (req, res, next) => {
    const targetId = req.params[paramName] || req.body[paramName];
    if (targetId && req.user && targetId === req.user.user_id) {
      return next(new ForbiddenError('You cannot perform this action on your own account.'));
    }
    next();
  };
}

module.exports = {
  validateUuidParams,
  ensureNotSelf,
  UUID_V4_REGEX,
};

