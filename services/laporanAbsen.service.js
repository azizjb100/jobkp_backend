// File: services/laporanAbsen.service.js

// [BENAR] Baris ini sekarang akan berfungsi
const { pool } = require('../config/db.config');

/**
 * Mengambil daftar nama bagian untuk dropdown filter.
 */
async function getBagianOptions() {
  const sql = 'SELECT jb_nama FROM bsmcabang.job_bagian ORDER BY jb_nama';
  
  // pool.query() sekarang PASTI berfungsi
  const [rows] = await pool.query(sql); 
  return rows.map(row => row.jb_nama);
}

/**
 * Mengambil data laporan absensi berdasarkan filter.
 */
async function getReportData(filters) {
  const { bagian, startDate, endDate } = filters;

  if (!bagian || !startDate || !endDate) {
    throw new Error('Filter bagian, startDate, dan endDate wajib diisi.');
  }

  const sql = `
    SELECT 
        date_format(x.tanggal,'%d-%m-%Y') AS tanggal,
        x.kar_nama AS nama,
        x.masuk,
        x.scan1,
        IF(x.telat = 0, "-", x.telat) AS telat,
        IFNULL(i.ij_alasan, "") AS alasan
    FROM (
        SELECT 
            k.kar_nik, k.kar_nama, k.kar_bagian, a.tanggal,
            a.masuk, a.scan1,
            IF(a.scan1 > a.masuk, TIMEDIFF(a.scan1, a.masuk), 0) AS telat
        FROM hrd2.tkaryawan k
        LEFT JOIN hrd2.tabsensi a ON a.nik = k.kar_kode_absensi
        WHERE 
            k.kar_status_aktif = 1 
            AND k.kar_bagian = ?
            AND a.masuk <> "00:00:00"
            AND DATE(a.tanggal) >= ?
            AND DATE(a.tanggal) <= ?
    ) x
    LEFT JOIN hrd2.tijin i ON i.ij_nik = x.kar_nik AND i.ij_tanggal = x.tanggal
    ORDER BY x.kar_Nik, x.tanggal
  `;
  
  const params = [bagian, startDate, endDate];
  
  // pool.query() juga akan berfungsi
  const [rows] = await pool.query(sql, params);
  return rows;
}

module.exports = {
  getBagianOptions,
  getReportData,
};