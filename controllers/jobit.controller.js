// File: controllers/it_job.controller.js

const itJobService = require('../services/jobit.service');

// 1. GET /form-data
exports.getFormData = async (req, res) => {
  try {
    const data = await itJobService.getFormData();
    res.status(200).send(data);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

// 2. GET /
exports.getAllJobs = async (req, res) => {
  try {
    // Ambil semua filter dari query string
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      cabang: req.query.cabang,
      it_staff: req.query.it_staff,
      status: req.query.status, // 0, 1, 2, atau 'ALL'
      user_kode: req.query.user_kode // Kirim user_kode jika login BUKAN IT
    };
    const data = await itJobService.getAllJobs(filters);
    res.status(200).send(data);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

// 3. GET /:nomor
exports.getJobByNomor = async (req, res) => {
  try {
    const { nomor } = req.params;
    const data = await itJobService.getJobByNomor(nomor);
    if (!data) {
      return res.status(404).send({ message: 'Nomor tidak ditemukan.' });
    }
    res.status(200).send(data);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

// 4. POST /
exports.createJob = async (req, res) => {
  try {
    const data = req.body;
    // Validasi dasar
    if (!data.jb_lokasi || !data.jb_user) {
      return res.status(400).send({ message: 'Lokasi dan User wajib diisi.' });
    }
    const result = await itJobService.createJob(data);
    res.status(201).send({ 
      message: `Tiket berhasil dibuat dengan No: ${result.newNomor}`, 
      nomor: result.newNomor 
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

// 5. PUT /:nomor
exports.updateJob = async (req, res) => {
  try {
    const { nomor } = req.params;
    const data = req.body;
    
    const result = await itJobService.updateJob(nomor, data);
    
    if (result.affectedRows === 0) {
      return res.status(404).send({ message: 'Nomor tidak ditemukan.' });
    }
    
    res.status(200).send({ message: 'Tiket berhasil diupdate.' });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
};

// 6. DELETE /:nomor
exports.deleteJob = async (req, res) => {
  try {
    const { nomor } = req.params;
    await itJobService.deleteJob(nomor);
    res.status(200).send({ message: 'Tiket berhasil dihapus.' });
  } catch (error) {
    // Tangkap error validasi dari service
    res.status(400).send({ message: error.message });
  }
};