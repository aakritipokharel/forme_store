const express = require('express');
const {
  getProfile,
  login,
  register,
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, getProfile);

module.exports = router;
