const crypto = require('crypto');
const { User, TrustedContact } = require('../models');
const { ConflictError, UnauthorizedError, BadRequestError, NotFoundError } = require('../errors/AppError');
const { hashPassword, verifyPassword, needsRehash } = require('../utils/password.util');
const TokenService = require('./token.service');
const { sendPasswordResetEmail } = require('../utils/password-reset-email.util');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

class AuthService {
  static async registerUser(username, email, password, clientMeta = {}) {
    const existingUserByEmail = await User.findOne({ where: { email } });
    if (existingUserByEmail) {
      throw new ConflictError('Email is already registered.');
    }

    if (username) {
      const existingUserByUsername = await User.findOne({ where: { username } });
      if (existingUserByUsername) {
        throw new ConflictError('Username is already taken.');
      }
    }

    const password_hash = await hashPassword(password);

    const newUser = await User.create({
      username,
      email,
      password_hash,
      password_changed_at: new Date(),
    });

    const accessToken = TokenService.generateAccessToken(newUser);
    const refreshData = await TokenService.createRefreshToken(
      newUser.user_id,
      clientMeta.ip,
      clientMeta.userAgent
    );

    return {
      user: {
        user_id: newUser.user_id,
        username: newUser.username,
        email: newUser.email,
        quorum_threshold: newUser.quorum_threshold,
      },
      token: accessToken,
      accessToken,
      refreshToken: refreshData.rawToken,
    };
  }

  static async loginUser(email, password, clientMeta = {}) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // Check account lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(user.locked_until).getTime() - Date.now()) / (60 * 1000)
      );
      throw new UnauthorizedError(
        `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`
      );
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const updateData = { failed_login_attempts: failedAttempts };

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        updateData.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      }

      await user.update(updateData);

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        throw new UnauthorizedError(
          `Account is temporarily locked due to multiple failed login attempts. Please try again in ${LOCKOUT_DURATION_MINUTES} minutes.`
        );
      }

      throw new UnauthorizedError('Invalid email or password.');
    }

    // Reset failed login counter and unlock if previously locked
    const resetData = {};
    if (user.failed_login_attempts > 0 || user.locked_until) {
      resetData.failed_login_attempts = 0;
      resetData.locked_until = null;
    }

    // Transparently upgrade legacy bcrypt hash to Argon2id upon successful login
    if (needsRehash(user.password_hash)) {
      resetData.password_hash = await hashPassword(password);
    }

    if (Object.keys(resetData).length > 0) {
      await user.update(resetData);
    }

    const accessToken = TokenService.generateAccessToken(user);
    const refreshData = await TokenService.createRefreshToken(
      user.user_id,
      clientMeta.ip,
      clientMeta.userAgent
    );

    return {
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        quorum_threshold: user.quorum_threshold,
      },
      token: accessToken,
      accessToken,
      refreshToken: refreshData.rawToken,
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

    const contactCount = await TrustedContact.count({ where: { owner_id: userId } });
    if (contactCount > 0 && quorum_threshold > contactCount) {
      throw new BadRequestError(
        `Threshold cannot exceed the number of configured trusted contacts (${contactCount}).`
      );
    }

    await user.update({ quorum_threshold });

    return {
      quorum_threshold: user.quorum_threshold,
    };
  }

  static async forgotPassword(email) {
    const user = await User.findOne({ where: { email } });

    // Always return the same result to prevent account enumeration
    if (!user) {
      return {
        message: 'If an account exists for this email, a password reset link has been sent.',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await user.update({
      reset_password_token_hash: tokenHash,
      reset_password_expires_at: expiresAt,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    return {
      message: 'If an account exists for this email, a password reset link has been sent.',
    };
  }

  static async resetPassword(token, newPassword) {
    if (!token) {
      throw new BadRequestError('Password reset token is required.');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: { reset_password_token_hash: tokenHash },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired password reset link.');
    }

    if (!user.reset_password_expires_at || new Date(user.reset_password_expires_at) < new Date()) {
      await user.update({
        reset_password_token_hash: null,
        reset_password_expires_at: null,
      });
      throw new BadRequestError('Invalid or expired password reset link.');
    }

    const password_hash = await hashPassword(newPassword);

    await user.update({
      password_hash,
      password_changed_at: new Date(),
      reset_password_token_hash: null,
      reset_password_expires_at: null,
      failed_login_attempts: 0,
      locked_until: null,
    });

    // Revoke all active refresh tokens for this user on password change
    await TokenService.revokeAllUserTokens(user.user_id);

    return {
      message: 'Password has been reset successfully.',
    };
  }
}

module.exports = AuthService;
