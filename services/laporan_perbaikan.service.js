// File: services/laporan.service.js

const { pool } = require('../config/db.config');

class LaporanService {

    /**
     * Mengambil daftar laporan perbaikan berdasarkan filter.
     * Ini adalah replikasi dari logika `imgrefreshClick` di Delphi.
     * @param {object} filters - Obyek filter dari query URL.
     */
    // ... (di dalam class LaporanService Anda)

async getPerbaikanReport(filters) {
    // [PERBAIKAN 1] Ambil 'search' dari filters
    const { startDate, endDate, status, branch, userId, search } = filters;
    let sql = `
        SELECT 
            jb.jb_nomor AS Nomor,
            CONCAT(
                'Tanggal: ', DATE_FORMAT(jb.jb_tanggal, '%d-%m-%Y %T'), '\\r\\n',
                
                /* Menggunakan alias join 'u_peminta' (mengganti subquery) */
                'User: ', jb.jb_cabang, ' ', IFNULL(u_peminta.user_nama, '-'), '\\r\\n', 
                
                'Divisi: ', IFNULL(jb.jb_divisi, ''), '\\r\\n',
                'Bagian: ', IFNULL(jb.jb_bagian, ''), '\\r\\n',
                'Kerusakan: ', IFNULL(jb.jb_lokasi, ''), '\\r\\n',
                'Jenis: ', IFNULL(jb.jb_jenis, ''), '\\r\\n',
                'Keterangan: ', IFNULL(jb.jb_ket, ''), '\\r\\n',
                'Kepentingan: ', IF(jb.jb_urgent=0,'Urgent','Top Urgent'), '\\r\\n',
                
                /* Menggunakan alias join 'u_konfirga' (mengganti subquery) */
                'Dikonfirmasi GA: ', IF(jb.jb_konfirga=0,'Belum ','Sudah '), IFNULL(DATE_FORMAT(jb.jb_tgl_konfirga, '%d-%m-%Y %T'),' '), ' ', IFNULL(u_konfirga.user_nama, ''), '\\r\\n',
                
                'Jadwal Pengerjaan: ', IFNULL(DATE_FORMAT(jb.jb_jadwal1,'%d-%m-%Y'),' - '), ' s.d ', IFNULL(DATE_FORMAT(jb.jb_jadwal2,'%d-%m-%Y'),' - '), '\\r\\n',
                
                /* Menggunakan alias join 'u_teknisi' (mengganti subquery) */
                'Teknisi: ', IFNULL(u_teknisi.user_nama, '-'), '\\r\\n',
                
                /* [FIX TYPO] jb_Selesai -> jb.jb_selesai */
                'Selesai dikerjakan: ', IF(jb.jb_selesai=0,'Belum ',IF(jb.jb_selesai=2,'Proses ','Sudah ')), IFNULL(DATE_FORMAT(jb.jb_tgl_selesai,'%d-%m-%Y %T'),' '), '\\r\\n',
                
                'Close: ', IF(jb.jb_tgl_close IS NULL,'Belum ', CONCAT('Sudah ', DATE_FORMAT(jb.jb_tgl_close,'%d-%m-%Y %T')))
            ) AS Detail
        FROM bsmcabang.job_butuh_hdr AS jb /* <-- [FIX] Tambahkan alias 'AS jb' */
        
        /* [FIX] Tambahkan JOINs */
        LEFT JOIN bsmcabang.job_user AS u_peminta ON jb.jb_user = u_peminta.user_kode
        LEFT JOIN bsmcabang.job_user AS u_konfirga ON jb.jb_konfirga_nama = u_konfirga.user_kode
        LEFT JOIN bsmcabang.job_user AS u_teknisi ON jb.jb_teknisi = u_teknisi.user_kode

        WHERE DATE(jb.jb_tanggal) BETWEEN ? AND ?
    `;
    const params = [startDate, endDate];

    // Menerapkan filter status
    if (status) {
        switch (status.toUpperCase()) {
            case 'BELUM':
                sql += ' AND jb.jb_selesai = 0'; // [FIX] Tambahkan 'jb.'
                break;
            case 'SELESAI':
                sql += ' AND jb.jb_selesai = 1'; // [FIX] Tambahkan 'jb.'
                break;
            case 'PROSES':
                sql += ' AND jb.jb_selesai = 2'; // [FIX] Tambahkan 'jb.'
                break;
            case 'BELUM_SELESAI':
                sql += ' AND (jb.jb_selesai = 0 OR jb.jb_selesai = 2)'; // [FIX] Tambahkan 'jb.'
                break;
        }
    }
    
    // Filter cabang
    if (branch && branch.toUpperCase() !== 'ALL') {
        sql += ' AND jb.jb_cabang = ?'; // [FIX] Tambahkan 'jb.'
        params.push(branch);
    }

    // Filter user peminta
    if (userId && userId.toUpperCase() !== 'ALL') {
        sql += ' AND jb.jb_user = ?'; // [FIX] Tambahkan 'jb.'
        params.push(userId);
    }

    // Filter search (Blok ini sekarang akan berfungsi karena 'jb' sudah didefinisikan)
    if (search && search.trim() !== '') {
      sql += ` AND (
        jb.jb_nomor LIKE ? OR 
        jb.jb_lokasi LIKE ? OR
        jb.jb_divisi LIKE ? OR
        jb.jb_ket LIKE ?
      )`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY jb.jb_tanggal DESC'; // [FIX] Tambahkan 'jb.'

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