// File: controllers/laporanAbsen.controller.js

const laporanService = require('../services/laporanAbsen.service.js');

/**
 * Menangani request untuk mengambil opsi Bagian (dropdown)
 * (Dipanggil oleh FormCreate)
 */
const handleGetBagian = async (req, res) => {
  try {
    const data = await laporanService.getBagianOptions();
    res.status(200).json(data);
  } catch (error) {
    console.error("Error di controller handleGetBagian:", error);
    res.status(500).json({ 
      message: "Gagal mengambil data bagian", 
      error: error.message 
    });
  }
};

/**
 * Menangani request untuk mengambil data Laporan Absensi
 * (Dipanggil oleh imgrefreshClick)
 */
const handleGetReport = async (req, res) => {
  try {
    // Filter diambil dari query parameter URL
    // contoh: /api/laporan-absen/report?bagian=UMUM&startDate=2025-11-01&endDate=2025-11-04
    const filters = {
      bagian: req.query.bagian,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const data = await laporanService.getReportData(filters);
    res.status(200).json(data);
    
  } catch (error) {
    console.error("Error di controller handleGetReport:", error);
    // Jika error karena validasi service, kirim 400 Bad Request
    if (error.message.includes("wajib diisi")) {
        res.status(400).json({ message: error.message });
    } else {
        res.status(500).json({ 
          message: "Gagal mengambil data laporan", 
          error: error.message 
        });
    }
  }
};
        
module.exports = {
  handleGetBagian,
  handleGetReport
};