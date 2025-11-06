// File: routes/it_job.routes.js

const express = require('express');
const router = express.Router();
const itJobController = require('../controllers/jobit.controller');
// (Tambahkan middleware auth jika perlu)
// const authJwt = require("../middleware/authJwt");

router.get('/form-data', itJobController.getFormData);

// GET /api/it-jobs
router.get('/', itJobController.getAllJobs);

// GET /api/it-jobs/:nomor
router.get('/:nomor', itJobController.getJobByNomor);

// POST /api/it-jobs
router.post('/', itJobController.createJob);

// PUT /api/it-jobs/:nomor
router.put('/:nomor', itJobController.updateJob);

// DELETE /api/it-jobs/:nomor
router.delete('/:nomor', itJobController.deleteJob);


module.exports = router;