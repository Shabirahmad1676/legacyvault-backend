const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { RefreshToken, User } = require('../models');
const { UnauthorizedError } = require('../errors/AppError');

const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_TOKEN_DAYS = 7;

class TokenService {
  /**
   * Generates a short-lived access token (JWT).
   * @param {Object} user 
   * @returns {string} Signed JWT
   */
  static generateAccessToken(user) {
    return jwt.sign(
      {
        id: user.user_id,
        user_id: user.user_id,
        email: user.email,
        username: user.username,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: ACCESS_TOKEN_EXPIRY,
      }
    );
  }

  /**
   * Generates a cryptographically secure random refresh token string and persists its hash.
   * @param {string} userId 
   * @param {string} [ipAddress] 
   * @param {string} [userAgent] 
   * @param {string} [existingFamilyId] 
   * @returns {Promise<{ rawToken: string, expires_at: Date }>}
   */
  static async createRefreshToken(userId, ipAddress = null, userAgent = null, existingFamilyId = null) {
    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const familyId = existingFamilyId || crypto.randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

    const record = await RefreshToken.create({
      user_id: userId,
      token_hash: tokenHash,
      family_id: familyId,
      expires_at: expiresAt,
      ip_address: ipAddress ? String(ipAddress).slice(0, 45) : null,
      user_agent: userAgent ? String(userAgent).slice(0, 255) : null,
    });

    return {
      tokenId: record.token_id,
      rawToken,
      expires_at: expiresAt,
      family_id: familyId,
    };
  }

  /**
   * Rotates a refresh token implementing Refresh Token Rotation (RTR) with reuse detection.
   * If a revoked or replaced token is reused, the entire token family is revoked (token theft mitigation).
   *
   * @param {string} rawToken 
   * @param {string} [ipAddress] 
   * @param {string} [userAgent] 
   * @returns {Promise<{ user: Object, accessToken: string, newRefreshToken: string }>}
   */
  static async rotateRefreshToken(rawToken, ipAddress = null, userAgent = null) {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new UnauthorizedError('Refresh token is required.');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const tokenRecord = await RefreshToken.findOne({
      where: { token_hash: tokenHash },
      include: [{ model: User, as: 'user' }],
    });

    if (!tokenRecord) {
      throw new UnauthorizedError('Invalid session. Please log in again.');
    }

    // Reuse Detection: If token was already replaced or revoked, revoke entire family!
    if (tokenRecord.revoked_at || tokenRecord.replaced_by_token_id) {
      await RefreshToken.update(
        { revoked_at: new Date() },
        { where: { family_id: tokenRecord.family_id } }
      );
      throw new UnauthorizedError('Security alert: Refresh token reuse detected. All sessions in this family have been terminated.');
    }

    // Check expiration
    if (new Date(tokenRecord.expires_at) < new Date()) {
      await tokenRecord.update({ revoked_at: new Date() });
      throw new UnauthorizedError('Session has expired. Please log in again.');
    }

    const user = tokenRecord.user;
    if (!user) {
      throw new UnauthorizedError('User account not found.');
    }

    // Generate new refresh token in the same family
    const nextToken = await this.createRefreshToken(
      user.user_id,
      ipAddress,
      userAgent,
      tokenRecord.family_id
    );

    // Invalidate old token by marking replacement and revocation
    await tokenRecord.update({
      revoked_at: new Date(),
      replaced_by_token_id: nextToken.tokenId,
    });

    // Generate fresh short-lived access token
    const accessToken = this.generateAccessToken(user);

    return {
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        quorum_threshold: user.quorum_threshold,
      },
      accessToken,
      newRefreshToken: nextToken.rawToken,
    };
  }

  /**
   * Revokes an individual refresh token (e.g. on logout).
   * @param {string} rawToken 
   */
  static async revokeRefreshToken(rawToken) {
    if (!rawToken || typeof rawToken !== 'string') return;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await RefreshToken.update(
      { revoked_at: new Date() },
      { where: { token_hash: tokenHash } }
    );
  }

  /**
   * Revokes all active refresh tokens for a user (e.g. on password change/reset).
   * @param {string} userId 
   */
  static async revokeAllUserTokens(userId) {
    await RefreshToken.update(
      { revoked_at: new Date() },
      { where: { user_id: userId, revoked_at: null } }
    );
  }

  /**
   * Cookie configuration for refresh tokens.
   */
  static getCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/api/auth',
      maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    };
  }
}

module.exports = TokenService;

