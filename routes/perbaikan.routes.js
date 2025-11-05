const express = require('express');
const router = express.Router();
const perbaikanController = require('../controllers/perbaikan.controller');

// Rute untuk mendapatkan data awal form
router.get('/form-data', perbaikanController.getFormData);

// Rute untuk menyimpan data dari Flutter
// DIUBAH: Dari '/' menjadi '/save' agar cocok dengan panggilan dari Flutter
router.post('/save', perbaikanController.savePerbaikan);

router.put(
  '/:nomor', 
  // [ authJwt.verifyToken ],
  perbaikanController.updatePerbaikan // <-- Panggil controller baru
);

module.exports = router;