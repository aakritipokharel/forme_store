const express = require('express');
const {
  getProductById,
  getProductCategories,
  getProducts,
} = require('../controllers/productController');

const router = express.Router();

router.get('/', getProducts);
router.get('/categories', getProductCategories);
router.get('/:id', getProductById);

module.exports = router;
