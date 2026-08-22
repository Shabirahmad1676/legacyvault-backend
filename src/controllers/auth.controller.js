const AuthService = require('../services/auth.service');
const asyncHandler = require('../middleware/asyncHandler');

class AuthController {
  static signup = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.registerUser(email, password);

    return res.status(201).json({
      status: 'success',
      data: result,
    });
  });

  static login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.loginUser(email, password);

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  static updateQuorumThreshold = asyncHandler(async (req, res) => {
    const { quorum_threshold } = req.body;
    const result = await AuthService.updateQuorumThreshold(req.user.user_id, quorum_threshold);

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  static logout = asyncHandler(async (req, res) => {
    return res.status(200).json({
      status: 'success',
      message: 'Logged out successfully.',
    });
  });
}

module.exports = AuthController;
