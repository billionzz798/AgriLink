const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const brandController = require('../controllers/brandController');
const { auth, authorize } = require('../middleware/auth');

router.post('/', auth, authorize('admin'), [
  body('name').notEmpty().withMessage('Brand name is required')
], brandController.createBrand);

router.get('/', brandController.getBrands);
router.get('/:id', brandController.getBrand);

router.put('/:id', auth, authorize('admin'), brandController.updateBrand);
router.delete('/:id', auth, authorize('admin'), brandController.deleteBrand);

module.exports = router;
