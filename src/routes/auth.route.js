const express = require('express');
const AuthController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { signupSchema, loginSchema, quorumThresholdSchema } = require('../schemas/auth.schema');

const router = express.Router();

router.post('/signup', validate(signupSchema), AuthController.signup);
router.post('/login', validate(loginSchema), AuthController.login);
router.post('/logout', protect, AuthController.logout);
router.put('/quorum-threshold', protect, validate(quorumThresholdSchema), AuthController.updateQuorumThreshold);

module.exports = router;
