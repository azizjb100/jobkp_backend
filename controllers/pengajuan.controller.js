

// pengajuanService adalah 'new PengajuanService()' dari file service Anda
const pengajuanService = require('../services/pengajuan.service');

class PengajuanController {
    
    async getAll(req, res) {
        try {
            const result = await pengajuanService.getPengajuanList(req.query);
            // Ini sudah benar, sesuai format yang diharapkan Flutter
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getById(req, res) {
        try {
            // [PERBAIKAN] Pastikan route Anda menggunakan '/:id'
            const result = await pengajuanService.getPengajuanById(req.params.id);
            res.json({ success: true, data: result });
        } catch (error) {
            // [PERBAIKAN] Cek error spesifik.
            // Hanya kirim 404 (Not Found) jika memang tidak ditemukan.
            if (error.message.includes('tidak ditemukan')) {
                res.status(404).json({ success: false, message: error.message });
            } else {
                // Kirim 500 (Server Error) untuk error lainnya
                res.status(500).json({ success: false, message: error.message });
            }
        }
    }

    async save(req, res) {
        try {

            const userKode = req.user?.userId;

            if (!userKode) {
                return res.status(401).json({ success: false, message: 'Akses ditolak. User tidak terotentikasi.' });
            }

            const result = await pengajuanService.savePengajuan(req.body, userKode);
            
            // [PERBAIKAN] Kirim status code yang tepat.
            // 201 (Created) jika ini data baru, 200 (OK) jika ini update.
            const isNew = !req.body.header.spp_nomor;
            const statusCode = isNew ? 201 : 200;
            
            res.status(statusCode).json(result); // 'result' sudah { success: true, ... }
            
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            // Ini sudah benar, Flutter mengirim 'nomor' di body
            const { nomor } = req.body;
            if (!nomor) {
                return res.status(400).json({ success: false, message: 'Nomor pengajuan diperlukan.' });
            }
            const result = await pengajuanService.deletePengajuan(nomor);
            res.json(result); // result adalah { success: true, ... }
        } catch (error) {
            // [PERBAIKAN] Tangani error validasi dari service (cth: "status sudah CLOSE")
            if (error.message.includes('Tidak bisa dihapus')) {
                // Ini 400 (Bad Request), bukan 500 (Server Error)
                res.status(400).json({ success: false, message: error.message });
            } else {
                res.status(500).json({ success: false, message: error.message });
            }
        }
    }

    // --- Lookup Controllers ---
    // (Semua fungsi lookup Anda di bawah ini sudah benar)

    async getJobs(req, res) {
        try {
            const result = await pengajuanService.getAvailableJobs();
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getJobDetails(req, res) {
        try {
            const { jobNomor } = req.params; // Ambil dari parameter URL
            const result = await pengajuanService.getJobDetailsForPengajuan(jobNomor);
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getSpareparts(req, res) {
        try {
            const result = await pengajuanService.getAvailableSpareparts();
            res.json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new PengajuanController();