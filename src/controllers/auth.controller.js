const AuthService = require('../services/auth.service');
const asyncHandler = require('../middleware/asyncHandler');

class AuthController {
  static signup = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

const result = await AuthService.registerUser(
  username,
  email,
  password
);

    const HTTP_STATUSES = require('../enums/httpStatuses');
    return res.status(HTTP_STATUSES.CREATED).json({
      status: 'success',
      data: result,
    });
  });

  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.loginUser(email, password);

    const HTTP_STATUSES = require('../enums/httpStatuses');
    return res.status(HTTP_STATUSES.OK).json({
      status: 'success',
      data: result,
    });
  });

  static updateQuorumThreshold = asyncHandler(async (req, res) => {
    const { quorum_threshold } = req.body;
    const result = await AuthService.updateQuorumThreshold(req.user.user_id, quorum_threshold);

    const HTTP_STATUSES = require('../enums/httpStatuses');
    return res.status(HTTP_STATUSES.OK).json({
      status: 'success',
      data: result,
    });
  });

  static logout = asyncHandler(async (req, res) => {
    const HTTP_STATUSES = require('../enums/httpStatuses');
    return res.status(HTTP_STATUSES.OK).json({
      status: 'success',
      message: 'Logged out successfully.',
    });
  });

  static forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const result =
    await AuthService.forgotPassword(email);

  const HTTP_STATUSES =
    require("../enums/httpStatuses");

  return res.status(HTTP_STATUSES.OK).json({
    status: "success",
    data: result,
  });
});

static resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const result =
    await AuthService.resetPassword(
      token,
      password
    );

  const HTTP_STATUSES =
    require("../enums/httpStatuses");

  return res.status(HTTP_STATUSES.OK).json({
    status: "success",
    data: result,
  });
});
}

module.exports = AuthController;
