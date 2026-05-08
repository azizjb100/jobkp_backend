

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
        // [SYNC] Ambil nama dari req.user.nama sesuai middleware auth
        const userNama = req.user?.nama; 
        const userKode = req.user?.userId;

        // Validasi Otentikasi
        if (!userKode || !userNama) {
            return res.status(401).json({ 
                success: false, 
                message: 'Akses ditolak. Sesi user tidak ditemukan.' 
            });
        }

        // Panggil Service (Kirim data dan userNama)
        const result = await pengajuanService.savePengajuan(req.body, userNama);
        
        // Cek status code (201 untuk baru, 200 untuk update)
        // Sesuaikan pengecekan dengan field 'min_nomor' dari Flutter
        const header = req.body.header || {};
        const isNew = !header.min_nomor || header.min_nomor === '[BARU]';
        const statusCode = isNew ? 201 : 200;
        
        return res.status(statusCode).json(result);
        
    } catch (error) {
        console.error(`[PengajuanController] Error:`, error.message);
        return res.status(500).json({ 
            success: false, 
            message: error.message 
        });
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