const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const productController = require('../controllers/productController');
const { auth, authorize } = require('../middleware/auth');

router.post('/', auth, [
  body('name').notEmpty().withMessage('Product name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('categoryId').notEmpty().withMessage('Category is required'),
  body('pricing.b2b.price').optional().isNumeric(),
  body('pricing.b2c.price').optional().isNumeric()
], productController.createProduct);

router.get('/', productController.getProducts);
router.get('/:id', productController.getProduct);

router.put('/:id', auth, productController.updateProduct);
router.delete('/:id', auth, productController.deleteProduct);

module.exports = router;
