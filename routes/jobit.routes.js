const express = require('express');
const router = express.Router();
const controller = require('../controllers/jobit.controller.js');
const authMiddleware = require('../middleware/auth.middleware.js');

/**
 * @route   GET /api/job-it/jobs
 * @desc    Mengambil daftar job IT (dengan filter role)
 * @access  Private
 */
router.get(
  '/jobs',
  [authMiddleware],
  controller.handleGetAllItJobs
);

/**
 * @route   GET /api/job-it/it-staff
 * @desc    Mengambil daftar nama staf IT (untuk dropdown)
 * @access  Private
 */
router.get(
  '/it-staff',
  [authMiddleware],
  controller.handleGetItStaffList
);

/**
 * @route   POST /api/job-it/jobs
 * @desc    Membuat job IT baru
 * @access  Private
 */
router.post(
  '/jobs',
  [authMiddleware],
  controller.handleCreateJob
);

/**
 * @route   GET /api/job-it/jobs/:nomor
 * @desc    Mengambil detail satu job
 * @access  Private
 */
router.get(
  '/jobs/:nomor',
  [authMiddleware],
  controller.handleGetJobByNomor
);

/**
 * @route   PUT /api/job-it/jobs/:nomor
 * @desc    Mengupdate job IT
 * @access  Private
 */
router.put(
  '/jobs/:nomor',
  [authMiddleware],
  controller.handleUpdateJob
);

/**
 * @route   DELETE /api/job-it/jobs/:nomor
 * @desc    Menghapus job IT
 * @access  Private
 */
router.delete(
  '/jobs/:nomor',
  [authMiddleware],
  controller.handleDeleteItJob
);

module.exports = router;