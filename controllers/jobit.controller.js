// [PERBAIKAN] Ganti nama import service agar sesuai
const itJobService = require('../services/jobit.service.js');

/**
 * @desc    Mengambil daftar job IT (dengan filter role)
 * @route   GET /api/job-it/jobs
 */
exports.handleGetAllItJobs = async (req, res) => {
  try {
    // req.query akan berisi semua filter (termasuk 'user_kode' jika dikirim)
    const data = await itJobService.getAllItJobs(req.query);
    res.status(200).json(data); 
  } catch (error) {
    console.error("Error di handleGetAllItJobs:", error);
    res.status(500).json([]); // Kirim array kosong jika error
  }
};

/**
 * @desc    Mengambil daftar nama staf IT (untuk dropdown)
 * @route   GET /api/job-it/it-staff
 */
exports.handleGetItStaffList = async (req, res) => {
  try {
    // [FIX] Panggil nama fungsi yang benar dari service
    const data = await itJobService.getItStaffList(); 
    res.status(200).json(data);
  } catch (error) {
    console.error("Error di handleGetItStaffList:", error);
    res.status(500).json([]);
  }
};

/**
 * @desc    Mengambil detail satu job
 * @route   GET /api/job-it/jobs/:nomor
 */
exports.handleGetJobByNomor = async (req, res) => {
  try {
    const { nomor } = req.params;
    const data = await itJobService.getJobByNomor(nomor);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Job tidak ditemukan' });
    }
    // Kirim data di dalam { success: true, data: ... }
    res.status(200).json({ success: true, data: data });
  } catch (error) {
    console.error("Error di handleGetJobByNomor:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Membuat job IT baru
 * @route   POST /api/job-it/jobs
 */
exports.handleCreateJob = async (req, res) => {
  try {
    const data = req.body;
    const result = await itJobService.createJob(data);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Error di handleCreateJob:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Mengupdate job IT
 * @route   PUT /api/job-it/jobs/:nomor
 */
exports.handleUpdateJob = async (req, res) => {
  try {
    const { nomor } = req.params;
    const data = req.body;
    await itJobService.updateJob(nomor, data);
    res.status(200).json({ success: true, message: 'Job berhasil diperbarui' });
  } catch (error) {
    console.error("Error di handleUpdateJob:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Menghapus job IT
 * @route   DELETE /api/job-it/jobs/:nomor
 */
exports.handleDeleteItJob = async (req, res) => {
  try {
    const { nomor } = req.params;
    const result = await itJobService.deleteItJob(nomor);
    res.status(200).json(result);
  } catch (error) {
    console.error("Error di handleDeleteItJob:", error);
    if (error.message.includes('Tidak bisa dihapus')) {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};