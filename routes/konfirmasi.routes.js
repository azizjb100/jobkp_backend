// routes/konfirmasi.routes.js

const express = require('express');
const router = express.Router();
const jobController = require('../controllers/konfirmasi.controller.js');

// 1. Impor "penjaga pintu" (middleware) Anda
const authMiddleware = require('../middleware/auth.middleware');

// --- Rute yang tidak perlu login (Publik) ---
// Siapa pun bisa melihat daftar pekerjaan, detail, dan daftar teknisi.
router.get('/jobs', jobController.getJobs);
router.get('/jobs/:id', jobController.getJobById);
router.get('/technicians', jobController.getTechnicians);

// --- Rute yang WAJIB login (Dilindungi) ---
// [PERBAIKAN] Tempatkan `authMiddleware` di sini untuk menjaga rute PUT.
// Hanya pengguna dengan token yang valid yang bisa memperbarui pekerjaan.
router.put('/jobs/:id', authMiddleware, jobController.updateJob);

module.exports = router;