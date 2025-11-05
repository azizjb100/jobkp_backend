// File: routes/realisasi.routes.js

const express = require('express');
const router = express.Router();
const controller = require('../controllers/realisasi_pengajuan.controller.js');
const authMiddleware = require('../middleware/auth.middleware.js'); // Impor middleware Anda

/**
 * @route   GET /api/realisasi
 * @desc    Mengambil daftar realisasi (dengan filter)
 * @access  Protected
 */
router.get(
  '/',
  [authMiddleware], // <-- Melindungi rute
  controller.handleGetList
);

/**
 * @route   GET /api/realisasi/:nomor
 * @desc    Mengambil detail item dari satu realisasi
 * @access  Protected
 */
router.get(
  '/:nomor',
  [authMiddleware], // <-- Melindungi rute
  controller.handleGetDetails
);

/**
 * @route   POST /api/realisasi/:nomor/approve
 * @desc    Menyetujui (approve) sebuah realisasi
 * @access  Protected
 */
router.post(
  '/:nomor/approve',
  [authMiddleware], // <-- Melindungi rute
  controller.handleApprove
);

module.exports = router;