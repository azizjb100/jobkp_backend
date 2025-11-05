// File: routes/laporan.routes.js

const express = require('express');
const router = express.Router();
const laporanController = require('../controllers/laporan_perbaikan.controller');
// const authMiddleware = require('../middleware/auth.middleware'); // Opsional: Aktifkan jika Anda punya middleware otentikasi
// Contoh: GET /api/reports/perbaikan?startDate=...&endDate=...&status=...
router.get('/perbaikan', laporanController.getReport);

// Rute untuk mendapatkan data opsi filter
// Contoh: GET /api/reports/filter-options/users
router.get('/filter-options/users', laporanController.getUsers); 
router.get('/filter-options/branches', laporanController.getBranches);

module.exports = router;