const express = require('express');
const router = express.Router();
const controller = require('../controllers/auth.controller.js');
const authMiddleware = require('../middleware/auth.middleware.js'); 

/**
 * @route   POST /api/auth/login
 * @desc    Endpoint publik untuk login
 * @access  Public
 */
router.post(
  '/login',
  controller.login // Tidak perlu token untuk login
);

/**
 * @route   GET /api/auth/login-list
 * @desc    [DEBUG ONLY] Endpoint untuk mengambil daftar user
 * @access  (Dibuat) Public untuk debug
 */
router.get(
  '/login-list',
  // [PERBAIKAN] Hapus middleware ini agar tidak perlu token
  // [authMiddleware], 
  controller.getLoginList
);

module.exports = router;