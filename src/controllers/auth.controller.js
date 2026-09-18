const AuthService = require("../services/auth.service");
const TokenService = require("../services/token.service");
const asyncHandler = require("../middleware/async-handler.middleware");
const HTTP_STATUSES = require("../enums/httpStatuses");

class AuthController {
  static signup = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    const clientMeta = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const result = await AuthService.registerUser(username, email, password, clientMeta);

    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, TokenService.getCookieOptions());
    }

    return res.status(HTTP_STATUSES.CREATED).json({
      status: "success",
      data: {
        user: result.user,
        token: result.accessToken,
        accessToken: result.accessToken,
      },
    });
  });

  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const clientMeta = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const result = await AuthService.loginUser(email, password, clientMeta);

    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, TokenService.getCookieOptions());
    }

    return res.status(HTTP_STATUSES.OK).json({
      status: "success",
      data: {
        user: result.user,
        token: result.accessToken,
        accessToken: result.accessToken,
      },
    });
  });

  static refresh = asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await TokenService.rotateRefreshToken(rawRefreshToken, ip, userAgent);

    res.cookie('refreshToken', result.newRefreshToken, TokenService.getCookieOptions());

    return res.status(HTTP_STATUSES.OK).json({
      status: "success",
      data: {
        user: result.user,
        token: result.accessToken,
        accessToken: result.accessToken,
      },
    });
  });

  static logout = asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (rawRefreshToken) {
      await TokenService.revokeRefreshToken(rawRefreshToken);
    }

    res.clearCookie('refreshToken', { path: '/api/auth' });

    return res.status(HTTP_STATUSES.OK).json({
      status: "success",
      message: "Logged out successfully.",
    });
  });

  static updateQuorumThreshold = asyncHandler(async (req, res) => {
    const { quorum_threshold } = req.body;
    const result = await AuthService.updateQuorumThreshold(
      req.user.user_id,
      quorum_threshold
    );

    return res.status(HTTP_STATUSES.OK).json({
      status: "success",
      data: result,
    });
  });

  static forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await AuthService.forgotPassword(email);

    return res.status(HTTP_STATUSES.OK).json({
      status: "success",
      data: result,
    });
  });

  static resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    const result = await AuthService.resetPassword(token, password);

    return res.status(HTTP_STATUSES.OK).json({
      status: "success",
      data: result,
    });
  });
}

module.exports = AuthController;
