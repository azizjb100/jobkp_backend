// routes/detAsset.routes.js

const express = require('express');
const router = express.Router();
const detAssetController = require('../controllers/detAsset.controller');

// [PERBAIKAN] Panggil nama fungsi yang benar: `getAllAssets`
router.get('/', detAssetController.getAllAssets); 

// [PERBAIKAN] Panggil nama fungsi yang benar: `getDetAssetByNomor`
router.get('/:jb_nomor', detAssetController.getDetAssetByNomor);

module.exports = router;