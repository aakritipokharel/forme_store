const express = require('express');
const safeUser = require('../utils/safeUser');
const {
  createProduct,
  deleteProduct,
  getAdminActivity,
  getAdminCustomer,
  getAdminCustomers,
  getAdminProduct,
  getAdminProducts,
  getCustomerOrders,
  getDashboard,
  updateProduct,
} = require('../controllers/adminController');
const {
  createCategory,
  deleteCategory,
  getAdminCategories,
  updateCategory,
} = require('../controllers/categoryController');
const { uploadImage } = require('../controllers/uploadController');
const { requireAdmin, requireAuth } = require('../middleware/authMiddleware');
const { imageUpload } = require('../middleware/imageUpload');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/me', (request, response) => {
  response.status(200).json({
    success: true,
    data: {
      user: safeUser(request.user),
    },
  });
});
router.get('/dashboard', getDashboard);
router.get('/products', getAdminProducts);
router.post('/products', createProduct);
router.get('/products/:id', getAdminProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);
router.post('/uploads/image', imageUpload.single('image'), uploadImage);
router.get('/categories', getAdminCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);
router.get('/users', getAdminCustomers);
router.get('/users/:id/orders', getCustomerOrders);
router.get('/users/:id', getAdminCustomer);
router.get('/activity', getAdminActivity);

module.exports = router;
