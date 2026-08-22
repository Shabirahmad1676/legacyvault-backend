const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const AppError = require('../errors/AppError');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

class AuthService {
  static async registerUser(email, password) {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('Email is already registered.', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      email,
      password_hash,
    });

    const token = generateToken(newUser.user_id);

    return {
      user: {
        user_id: newUser.user_id,
        email: newUser.email,
        quorum_threshold: newUser.quorum_threshold,
      },
      token,
    };
  }

  static async loginUser(email, password) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    const token = generateToken(user.user_id);

    return {
      user: {
        user_id: user.user_id,
        email: user.email,
        quorum_threshold: user.quorum_threshold,
      },
      token,
    };
  }

  static async updateQuorumThreshold(userId, quorum_threshold) {
    if (!Number.isInteger(quorum_threshold) || quorum_threshold < 1) {
      throw new AppError('Threshold must be at least 1', 400);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    await user.update({ quorum_threshold });

    return {
      quorum_threshold: user.quorum_threshold,
    };
  }
}

module.exports = AuthService;
