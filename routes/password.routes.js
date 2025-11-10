const express = require('express');
const router = express.Router();
const controller = require('../controllers/password.controller.js');
const authMiddleware = require('../middleware/auth.middleware.js'); // Asumsi Anda punya ini

/**
 * @route   PUT /api/password/change
 * @desc    Mengubah password user yang sedang login
 * @access  Private
 */
router.put(
  '/change',
  authMiddleware, // Lindungi rute ini, hanya user yang login yang bisa ganti password
  controller.changePassword
);

module.exports = router;