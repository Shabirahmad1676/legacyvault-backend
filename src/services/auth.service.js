const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { ConflictError, UnauthorizedError, BadRequestError, NotFoundError } = require('../errors/AppError');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

class AuthService {
  static async registerUser(email, username, password) {
    const existingUserByEmail = await User.findOne({ where: { email } });
    if (existingUserByEmail) {
      throw new ConflictError('Email is already registered.');
    }

    const existingUserByUsername = await User.findOne({ where: { username } });
    if (existingUserByUsername) {
      throw new ConflictError('Username is already taken.');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      username,
      email,
      password_hash,
    });

    const token = generateToken(newUser.user_id);

    return {
      user: {
        user_id: newUser.user_id,
        username: newUser.username,
        email: newUser.email,
        quorum_threshold: newUser.quorum_threshold,
      },
      token,
    };
  }

  static async loginUser(email, password) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const token = generateToken(user.user_id);

    return {
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        quorum_threshold: user.quorum_threshold,
      },
      token,
    };
  }

  static async updateQuorumThreshold(userId, quorum_threshold) {

    if (!Number.isInteger(quorum_threshold) || quorum_threshold < 1) {
      throw new BadRequestError('Threshold must be at least 1');
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    await user.update({ quorum_threshold });

    return {
      quorum_threshold: user.quorum_threshold,
    };
  }
}

module.exports = AuthService;
