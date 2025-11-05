// controllers/detAsset.controller.js

const detAssetService = require('../services/detAsset.service');

// Fungsi untuk mengambil SEMUA aset (dengan filter)
exports.getAllAssets = async (req, res) => {
  try {
    // [PERBAIKAN] Ambil SEMUA filter dari req.query
    // Ini akan berisi { startDate, endDate, user_kode, ... }
    const filters = req.query; 

    // Tulis log untuk debugging
    console.log('Controller received filters:', filters);

    // Kirimkan SEMUA filter tersebut ke service Anda
    const assets = await detAssetService.getAllAssets(filters);
    
    // Kirim hasilnya (sekarang sudah terfilter) kembali ke Flutter
    res.status(200).json(assets); 
  } catch (error) {
    console.error('Error in detAsset.controller.getAllAssets:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// Fungsi untuk mengambil SATU aset berdasarkan nomor
exports.getDetAssetByNomor = async (req, res) => {
  try {
    // Ambil 'jb_nomor' dari parameter URL
    const { jb_nomor } = req.params; 
    
    const asset = await detAssetService.getDetAssetByNomor(jb_nomor);
    
    if (asset) {
      res.status(200).json(asset);
    } else {
      res.status(404).json({ message: 'Aset tidak ditemukan' });
    }
  } catch (error) {
    console.error('Error in detAsset.controller.getDetAssetByNomor:', error.message);
    res.status(500).json({ message: error.message });
  }
};