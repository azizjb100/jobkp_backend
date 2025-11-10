const express = require('express');
const router = express.Router();
const controller = require('../controllers/notification.controller.js');
const authMiddleware = require('../middleware/auth.middleware.js');

/**
 * @route   GET /api/notifications/check
 * @desc    Mengecek notifikasi baru (Polling)
 */
router.get(
  '/check',
  [authMiddleware], // Wajib pakai token
  controller.handleGetNew
);

module.exports = router;