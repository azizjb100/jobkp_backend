// File: controllers/realisasi.controller.js

const realisasiService = require('../services/realisasi_pengajuan.service.js');

/**
 * Handle request untuk GET /realisasi
 */
exports.handleGetList = async (req, res) => {
  try {
    // Filters diambil dari query URL: ?startDate=...&endDate=...&status=...
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      status: req.query.status, // Cth: 'PENDING' or 'APPROVED'
    };
    
    const data = await realisasiService.getRealisasiList(filters);
    res.status(200).json(data);
  } catch (error) {
    console.error("Error di handleGetList:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Handle request untuk GET /realisasi/:nomor
 */
exports.handleGetDetails = async (req, res) => {
  try {
    const { nomor } = req.params; // Ambil nomor dari URL
    const data = await realisasiService.getRealisasiDetails(nomor);
    res.status(200).json(data);
  } catch (error) {
    console.error("Error di handleGetDetails:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Handle request untuk POST /realisasi/:nomor/approve
 */
exports.handleApprove = async (req, res) => {
  try {
    const { nomor } = req.params; // Ambil nomor dari URL
    
    // [PENTING] Ambil nama user dari middleware otentikasi
    // Ini adalah pengganti 'zusernama' di Delphi
    const approverName = req.user.nama; // Sesuaikan jika path-nya beda (cth: req.user.user_nama)

    const result = await realisasiService.approveRealisasi(nomor, approverName);
    res.status(200).json(result);
    
  } catch (error) {
    console.error("Error di handleApprove:", error);
    // Jika nomor tidak ditemukan
    if (error.message.includes("tidak ditemukan")) {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
};