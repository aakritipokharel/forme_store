const express = require('express');
const safeUser = require('../utils/safeUser');
const { requireAdmin, requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/me', requireAuth, requireAdmin, (request, response) => {
  response.status(200).json({
    success: true,
    data: {
      user: safeUser(request.user),
    },
  });
});

module.exports = router;
