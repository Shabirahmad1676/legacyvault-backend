const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { ConflictError, UnauthorizedError, BadRequestError, NotFoundError } = require('../errors/AppError');
const crypto = require("crypto");
const {
  sendPasswordResetEmail,
} = require("../utils/password-reset-email.util");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

class AuthService {
  static async registerUser(username, email, password) {
    const existingUserByEmail = await User.findOne({
  where: { email },
});

if (existingUserByEmail) {
  throw new ConflictError('Email is already registered.');
}

const existingUserByUsername = await User.findOne({
  where: { username },
});

if (existingUserByUsername) {
  throw new ConflictError('Username is already taken.');
}

const salt = await bcrypt.genSalt(10);

const password_hash = await bcrypt.hash(
  password,
  salt
);

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

  static async forgotPassword(email) {
  const user = await User.findOne({
    where: { email },
  });

  // Always return the same result even if email doesn't exist.
  if (!user) {
    return {
      message:
        "If an account exists for this email, a password reset link has been sent.",
    };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  const tokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const expiresAt = new Date(
    Date.now() + 15 * 60 * 1000
  );

  await user.update({
    reset_password_token_hash: tokenHash,
    reset_password_expires_at: expiresAt,
  });

  const frontendUrl =
    process.env.FRONTEND_URL || "http://localhost:3000";

  const resetUrl =
    `${frontendUrl}/reset-password?token=${resetToken}`;

  await sendPasswordResetEmail(
    user.email,
    resetUrl
  );

  return {
    message:
      "If an account exists for this email, a password reset link has been sent.",
  };
}

static async resetPassword(token, newPassword) {
  if (!token) {
    throw new BadRequestError(
      "Password reset token is required."
    );
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    where: {
      reset_password_token_hash: tokenHash,
    },
  });

  if (!user) {
    throw new BadRequestError(
      "Invalid or expired password reset link."
    );
  }

  if (
    !user.reset_password_expires_at ||
    new Date(user.reset_password_expires_at) < new Date()
  ) {
    await user.update({
      reset_password_token_hash: null,
      reset_password_expires_at: null,
    });

    throw new BadRequestError(
      "Invalid or expired password reset link."
    );
  }

  const salt = await bcrypt.genSalt(10);

  const password_hash = await bcrypt.hash(
    newPassword,
    salt
  );

  await user.update({
    password_hash,
    reset_password_token_hash: null,
    reset_password_expires_at: null,
  });

  return {
    message: "Password has been reset successfully.",
  };
}
}

module.exports = AuthService;
