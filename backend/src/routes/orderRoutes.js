const express = require('express');
const {
  cancelMyOrder,
  getCheckoutInfo,
  getMyOrder,
  getOrder,
  listAllOrders,
  listMyOrders,
  placeOrder,
  updateOrderStatus,
} = require('../controllers/orderController');
const { requireAdmin, requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth);
router.get('/checkout-info', getCheckoutInfo);
router.post('/', placeOrder);
router.get('/my', listMyOrders);
router.get('/my/:id', getMyOrder);
router.post('/my/:id/cancel', cancelMyOrder);
router.get('/', requireAdmin, listAllOrders);
router.get('/:id', requireAdmin, getOrder);
router.patch('/:id/status', requireAdmin, updateOrderStatus);

module.exports = router;
