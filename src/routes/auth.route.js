const express = require('express');
const AuthController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const { protect } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rate-limiter.middleware');
const { signupSchema, loginSchema, quorumThresholdSchema, forgotPasswordSchema,
  resetPasswordSchema, } = require('../schemas/auth.schema');


const router = express.Router();

router.post('/signup', authLimiter , validate(signupSchema), AuthController.signup);
router.post('/login', authLimiter, validate(loginSchema), AuthController.login);

router.post('/logout', protect, AuthController.logout);
router.put('/quorum-threshold', protect, validate(quorumThresholdSchema), AuthController.updateQuorumThreshold);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), AuthController.resetPassword);

module.exports = router;
