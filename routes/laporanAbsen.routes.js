// File: routes/laporanAbsen.routes.js
// [BENAR] Ini adalah tempat untuk router.get

const express = require('express');
const router = express.Router();
const controller = require('../controllers/laporanAbsen.controller.js');

// Rute untuk data dropdown 'Bagian'
router.get(
  '/bagian', 
  controller.handleGetBagian // <-- Ini adalah FUNGSI HANDLER
);

// Rute untuk data Laporan Absensi
router.get(
  '/report',
  controller.handleGetReport // <-- Ini adalah FUNGSI HANDLER
);

module.exports = router;