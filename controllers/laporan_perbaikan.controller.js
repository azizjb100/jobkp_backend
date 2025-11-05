// File: controllers/laporan.controller.js

const laporanService = require('../services/laporan_perbaikan.service');

class LaporanController {
    
    /**
     * Handler untuk mengambil data laporan perbaikan.
     */
    async getReport(req, res) {
        try {
            const { startDate, endDate } = req.query;
            if (!startDate || !endDate) {
                return res.status(400).json({ success: false, message: 'Parameter startDate dan endDate diperlukan.' });
            }

            const result = await laporanService.getPerbaikanReport(req.query);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error("Error di getReport controller:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Handler untuk mengambil daftar user untuk filter.
     */
    async getUsers(req, res) {
        try {
            // Asumsi data user yang login ada di req.user dari middleware otentikasi
            const loggedInUser = req.user; 
            const result = await laporanService.getUsersForFilter(loggedInUser);
            res.json({ success: true, data: result });
        } catch (error) {
            console.error("Error di getUsers controller:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Handler untuk mengambil daftar cabang.
     */
    async getBranches(req, res) {
        try {
            const result = await laporanService.getBranches();
            res.json({ success: true, data: result });
        } catch (error) {
            console.error("Error di getBranches controller:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new LaporanController();