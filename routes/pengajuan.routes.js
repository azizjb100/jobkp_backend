// File: routes/pengajuan.routes.js

const express = require('express');
const router = express.Router();
const controller = require('../controllers/pengajuan.controller.js');

// Impor middleware otentikasi Anda (ini adalah FUNGSI, bukan objek)
const authMiddleware = require('../middleware/auth.middleware');


router.get(
  '/',
  [authMiddleware], // <-- [PERBAIKAN] Hapus .verifyToken
  controller.getAll
);

// GET /pengajuan/:id (Get one by ID)
router.get(
  '/:id',
  [authMiddleware], // <-- [PERBAIKAN] Hapus .verifyToken
  controller.getById
);

// POST /pengajuan (Save New)
router.post(
  '/',
  [authMiddleware], // <-- [PERBAIKAN] Hapus .verifyToken
  controller.save // Ini memanggil 'save' di controller
);

// PUT /pengajuan/:id (Update Existing)
router.put(
  '/:id', 
  [authMiddleware], // <-- [PERBAIKAN] Hapus .verifyToken
  controller.save // Memakai controller yang sama dengan 'POST'
);

// POST /pengajuan/delete (Delete)
router.post(
  '/delete',
  [authMiddleware], // <-- [PERBAIKAN] Hapus .verifyToken
  controller.delete
);


// === Lookup Routes ===

// GET /pengajuan/lookup/available-jobs
router.get(
  '/lookup/available-jobs',
  [authMiddleware], // <-- [PERBAIKAN] Hapus .verifyToken
  controller.getJobs
);

// GET /pengajuan/lookup/available-spareparts
router.get(
  '/lookup/available-spareparts',
  [authMiddleware], // <-- [PERBAIKAN] Hapus .verifyToken
  controller.getSpareparts
);

// GET /pengajuan/lookup/job-details/:jobNomor
router.get(
  '/lookup/job-details/:jobNomor',
  [authMiddleware], // <-- [PERBAIKAN] Hapus .verifyToken
  controller.getJobDetails
);

module.exports = router;