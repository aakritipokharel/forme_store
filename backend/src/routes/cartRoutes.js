const express = require('express');
const { getCart, updateCart } = require('../controllers/cartController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/', getCart);
router.put('/', updateCart);

module.exports = router;
