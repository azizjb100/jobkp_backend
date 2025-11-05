// File: services/laporan.service.js

const { pool } = require('../config/db.config');

class LaporanService {

    /**
     * Mengambil daftar laporan perbaikan berdasarkan filter.
     * Ini adalah replikasi dari logika `imgrefreshClick` di Delphi.
     * @param {object} filters - Obyek filter dari query URL.
     */
    async getPerbaikanReport(filters) {
        const { startDate, endDate, status, branch, userId } = filters;

        // Query ini meniru CONCAT panjang dari Delphi untuk membuat kolom "Detail"
        let sql = `
            SELECT 
                jb_nomor AS Nomor,
                CONCAT(
                    'Tanggal: ', DATE_FORMAT(jb_tanggal, '%d-%m-%Y %T'), '\\r\\n',
                    'User: ', jb_Cabang, ' ', IFNULL((SELECT user_nama FROM bsmcabang.job_user WHERE user_kode=jb_user), '-'), '\\r\\n',
                    'Divisi: ', IFNULL(jb_divisi, ''), '\\r\\n',
                    'Bagian: ', IFNULL(jb_bagian, ''), '\\r\\n',
                    'Kerusakan: ', IFNULL(jb_lokasi, ''), '\\r\\n',
                    'Jenis: ', IFNULL(jb_jenis, ''), '\\r\\n',
                    'Keterangan: ', IFNULL(jb_ket, ''), '\\r\\n',
                    'Kepentingan: ', IF(jb_urgent=0,'Urgent','Top Urgent'), '\\r\\n',
                    'Dikonfirmasi GA: ', IF(jb_konfirga=0,'Belum ','Sudah '), IFNULL(DATE_FORMAT(jb_tgl_konfirga, '%d-%m-%Y %T'),' '), ' ', IFNULL((SELECT user_nama FROM bsmcabang.job_user WHERE user_kode=jb_konfirga_nama), ''), '\\r\\n',
                    'Jadwal Pengerjaan: ', IFNULL(DATE_FORMAT(jb_jadwal1,'%d-%m-%Y'),' - '), ' s.d ', IFNULL(DATE_FORMAT(jb_jadwal2,'%d-%m-%Y'),' - '), '\\r\\n',
                    'Teknisi: ', IFNULL((SELECT user_nama FROM bsmcabang.job_user WHERE user_kode=jb_teknisi), '-'), '\\r\\n',
                    'Selesai dikerjakan: ', IF(jb_Selesai=0,'Belum ',IF(jb_Selesai=2,'Proses ','Sudah ')), IFNULL(DATE_FORMAT(jb_tgl_selesai,'%d-%m-%Y %T'),' '), '\\r\\n',
                    'Close: ', IF(jb_tgl_close IS NULL,'Belum ', CONCAT('Sudah ', DATE_FORMAT(jb_tgl_close,'%d-%m-%Y %T')))
                ) AS Detail
            FROM bsmcabang.job_butuh_hdr
            WHERE DATE(jb_tanggal) BETWEEN ? AND ?
        `;
        const params = [startDate, endDate];

        // Menerapkan filter status, meniru logika RadioButton
        if (status) {
            switch (status.toUpperCase()) {
                case 'BELUM':
                    sql += ' AND jb_selesai = 0';
                    break;
                case 'SELESAI':
                    sql += ' AND jb_selesai = 1';
                    break;
                case 'PROSES':
                    sql += ' AND jb_selesai = 2';
                    break;
                case 'BELUM_SELESAI':
                    sql += ' AND (jb_selesai = 0 OR jb_selesai = 2)';
                    break;
                // 'ALL' tidak melakukan apa-apa
            }
        }
        
        // Filter cabang
        if (branch && branch.toUpperCase() !== 'ALL') {
            sql += ' AND jb_cabang = ?';
            params.push(branch);
        }

        // Filter user peminta
        if (userId && userId.toUpperCase() !== 'ALL') {
            sql += ' AND jb_user = ?';
            params.push(userId);
        }

        sql += ' ORDER BY jb_tanggal DESC';

        const [rows] = await pool.query(sql, params);
        return rows;
    }

    /**
     * Mengambil daftar user untuk dropdown filter.
     * Ini meniru logika `FormCreate` di Delphi.
     * @param {object} loggedInUser - Informasi user yang sedang login (dari token).
     */
    async getUsersForFilter(loggedInUser) {
        let sql = 'SELECT user_kode, user_nama FROM bsmcabang.job_user WHERE user_aktif=0';
        const params = [];

        // Jika user biasa (bukan admin/manager), hanya tampilkan namanya sendiri
        if (loggedInUser && loggedInUser.user_bag === 0 && loggedInUser.manager === 0) {
            sql += ' AND user_kode = ?';
            params.push(loggedInUser.user_kode);
        }

        sql += ' ORDER BY user_nama';

        const [rows] = await pool.query(sql, params);
        return rows;
    }

    /**
     * Mengambil daftar cabang untuk dropdown filter.
     */
    async getBranches() {
        // Sama seperti Delphi, daftar ini bisa di-hardcode jika tidak sering berubah
        return [
            { kode_cabang: 'P01', nama_cabang: 'P01' },
            { kode_cabang: 'P02', nama_cabang: 'P02' },
            { kode_cabang: 'P03', nama_cabang: 'P03' },
            { kode_cabang: 'P04', nama_cabang: 'P04' },
            { kode_cabang: 'P05', nama_cabang: 'P05' },
        ];
    }
}

module.exports = new LaporanService();