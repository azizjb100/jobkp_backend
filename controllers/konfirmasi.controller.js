// controllers/konfirmasi.controller.js
const jobService = require('../services/konfirmasi.service.js');

/**
 * @description Memperbarui data pekerjaan. Logika akan berbeda berdasarkan role user.
 * @route PUT /api/konfirmasi/jobs/:id
 */
exports.updateJob = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body; // Data dari form frontend
        
        // Asumsi middleware auth sudah menyisipkan req.user
        const { role, userId } = req.user; 

        if (role === 9) { // Role untuk GA
            await jobService.updateJobByGa(id, data, userId);
        } else if (role === 2) { // Role untuk Teknisi
            await jobService.updateJobByTechnician(id, data, userId);
        } else {
            // Jika role tidak sesuai, kirim error 'Forbidden'
            return res.status(403).json({ message: "Akses ditolak: Anda tidak memiliki hak untuk melakukan aksi ini." });
        }

        res.status(200).json({ message: "Pekerjaan berhasil diperbarui." });
    } catch (error) {
        // [PENTING] Baris ini penting untuk debugging di server
        console.error("ERROR di updateJob Controller:", error); 
        res.status(500).json({ message: "Gagal memperbarui pekerjaan", error: error.message });
    }
};

/**
 * @description Mengambil daftar semua pekerjaan berdasarkan filter.
 * @route GET /api/konfirmasi/jobs
 */
exports.getJobs = async (req, res) => {
    try {
        // req.query akan berisi semua parameter filter dari URL
        // contoh: ?startDate=2025-10-01&status=PROSES
        const jobs = await jobService.getJobs(req.query);
        res.status(200).json(jobs);
    } catch (error) {
        res.status(500).json({ message: "Error saat mengambil daftar pekerjaan", error: error.message });
    }
};

/**
 * @description Mengambil detail satu pekerjaan berdasarkan ID.
 * @route GET /api/konfirmasi/jobs/:id
 */
exports.getJobById = async (req, res) => {
    try {
        const { id } = req.params; // Mengambil ID dari URL, contoh: /jobs/JB-001
        const jobData = await jobService.getJobById(id);
        res.status(200).json(jobData);
    } catch (error) {
        // Jika service melempar error 404, gunakan itu. Jika tidak, anggap 500.
        res.status(error.statusCode || 500).json({ message: error.message });
    }
};

/**
 * @description Mengambil daftar semua teknisi.
 * @route GET /api/konfirmasi/technicians
 */
exports.getTechnicians = async (req, res) => {
    try {
        const technicians = await jobService.getTechnicians();
        res.status(200).json(technicians);
    } catch (error) {
        res.status(500).json({ message: "Error saat mengambil daftar teknisi", error: error.message });
    }
};
