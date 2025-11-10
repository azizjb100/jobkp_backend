const express = require('express');
const router = express.Router();
const controller = require('../controllers/konfirmasi.controller.js');
const authMiddleware = require('../middleware/auth.middleware.js'); 

// GET /jobs (Daftar list)
router.get(
  '/jobs',
  [authMiddleware],
  controller.getJobs
);

// GET /jobs/:id (Detail satu)
router.get(
  '/jobs/:id',
  [authMiddleware], 
  controller.getJobById
);

// GET /technicians (Daftar teknisi)
router.get(
  '/technicians',
  [authMiddleware],
  controller.getTechnicians
);

// PUT /jobs/:id (Update)
router.put(
  '/jobs/:id',
  [authMiddleware], 
  controller.updateJob
);

module.exports = router;