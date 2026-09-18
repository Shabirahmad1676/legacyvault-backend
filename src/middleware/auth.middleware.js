const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { UnauthorizedError } = require('../errors/AppError');

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new UnauthorizedError('You are not logged in. Please log in to get access.'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.user_id || decoded.id;

    const currentUser = await User.findByPk(userId);
    if (!currentUser) {
      return next(new UnauthorizedError('The user belonging to this token no longer exists.'));
    }

    if (currentUser.password_changed_at) {
      const changedTimestamp = Math.floor(currentUser.password_changed_at.getTime() / 1000);
      if (decoded.iat && decoded.iat < changedTimestamp) {
        return next(new UnauthorizedError('User recently changed password. Please log in again.'));
      }
    }

    req.user = currentUser;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new UnauthorizedError('Invalid token. Please log in again.'));
    }

    if (error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Your token has expired. Please log in again.'));
    }

    next(error);
  }
};

module.exports = { protect };
