require('dotenv').config(); 
const mysql = require('mysql2/promise');
const { dbConfig } = require('../config/db.config');

// Pool tunggal
const pool = mysql.createPool(dbConfig);

/**
 * [PERBAIKAN] Menggunakan LEFT JOIN agar query cepat dan efisien.
 * Mengambil 1 asset by nomor.
 */
const getDetAssetByNomor = async (znomor) => {
  // Query ini sekarang menggunakan LEFT JOIN, bukan subquery
  const query = `
    SELECT 
      jb.jb_nomor,
      DATE_FORMAT(jb.jb_tanggal, '%d-%m-%Y %T') AS jb_tanggal,
      CONCAT(jb.jb_cabang, ' ', IFNULL(u_peminta.user_nama, '-')) AS jb_cabang,
      jb.jb_divisi,
      jb.jb_bagian,
      jb.jb_lokasi,
      jb.jb_jenis,
      jb.jb_ket,
      IF(jb.jb_urgent=0,'Urgent','Top Urgent') AS jb_kepentingan,
      CONCAT(
        IF(jb.jb_konfirga=0,'Belum ','Sudah '),
        IFNULL(DATE_FORMAT(jb.jb_tgl_konfirga, '%d-%m-%Y %T'),' '), ' ',
        IFNULL(u_konfirga.user_nama, '')
      ) AS jb_konfir_ga,
      CONCAT(
        IFNULL(DATE_FORMAT(jb.jb_jadwal1,'%d-%m-%Y'),' - '),
        ' s.d ',
        IFNULL(DATE_FORMAT(jb.jb_jadwal2,'%d-%m-%Y'),' - ')
      ) AS jb_jadwal_pengerjaan,
      IFNULL(u_teknisi1.user_nama, '-') AS jb_teknisi,
      IFNULL(u_teknisi2.user_nama, '-') AS jb_teknisi_bantu,
      CONCAT(
        IF(jb.jb_konfirteknisi=0,'Belum ','Sudah '),
        IFNULL(DATE_FORMAT(jb.jb_tgl_konfirteknisi, '%d-%m-%Y %T'),' '), ' ',
        IFNULL(u_konfirtek.user_nama, '')
      ) AS jb_konfir_teknisi,
      IF(jb.jb_pengajuan=0,'Tidak','Ya') AS jb_pengajuan_barang,
      IFNULL(spp.spp_nomor, '-') AS jb_sparepart_gudang,
      jb.jb_ket_teknisi AS jb_ket_proses,
      CONCAT(
        IF(jb.jb_selesai=0,'Belum ',
           IF(jb.jb_selesai=2,'Proses ','Sudah ')),
        IFNULL(DATE_FORMAT(jb.jb_tgl_selesai,'%d-%m-%Y %T'),' ')
      ) AS jb_selesai,
      IF(jb.jb_tgl_close IS NULL,'Belum',
        CONCAT('Sudah ', DATE_FORMAT(jb.jb_tgl_close,'%d-%m-%Y %T'))
      ) AS jb_close,
      jb.jb_user
    FROM bsmcabang.job_butuh_hdr AS jb
    
    /* [PERBAIKAN] Mengganti semua subquery dengan LEFT JOIN */
    LEFT JOIN bsmcabang.job_user AS u_peminta ON jb.jb_user = u_peminta.user_kode
    LEFT JOIN bsmcabang.job_user AS u_konfirga ON jb.jb_konfirga_nama = u_konfirga.user_kode
    LEFT JOIN bsmcabang.job_user AS u_teknisi1 ON jb.jb_teknisi = u_teknisi1.user_kode
    LEFT JOIN bsmcabang.job_user AS u_teknisi2 ON jb.jb_teknisi2 = u_teknisi2.user_kode
    LEFT JOIN bsmcabang.job_user AS u_konfirtek ON jb.jb_konfirteknisi_nama = u_konfirtek.user_kode
    LEFT JOIN kencanaprint.tsparepart_pengajuan_hdr AS spp ON jb.jb_nomor = spp.spp_job

    WHERE jb.jb_nomor = ?;
  `;
  const [rows] = await pool.query(query, [znomor]);
  return rows.length > 0 ? rows[0] : null;
};

/**
 * [PERBAIKAN] Fungsi getAllAssets diubah total untuk menerima semua filter
 * dan menggunakan LEFT JOIN untuk performa.
 */
const getAllAssets = async (filters) => {
  const { startDate, endDate, status, search, user_kode, close_status } = filters;

  let query = `
    SELECT 
      jb.jb_nomor,
      DATE_FORMAT(jb.jb_tanggal, '%d-%m-%Y %T') AS jb_tanggal,
      CONCAT(jb.jb_cabang, ' ', IFNULL(u_peminta.user_nama, '-')) AS jb_cabang,
      jb.jb_divisi,
      jb.jb_bagian,
      jb.jb_lokasi,
      jb.jb_jenis,
      jb.jb_ket,
      IF(jb.jb_urgent = 0, 'Urgent', 'Top Urgent') AS jb_kepentingan,
      
      CONCAT(
        IF(jb.jb_konfirga = 0, 'Belum ', 'Sudah '),
        IFNULL(DATE_FORMAT(jb.jb_tgl_konfirga, '%d-%m-%Y %T'), ' '), ' ',
        IFNULL(u_konfirga.user_nama, '')
      ) AS jb_konfir_ga,

      CONCAT(
        IFNULL(DATE_FORMAT(jb.jb_jadwal1, '%d-%m-%Y'), ' - '),
        ' s.d ',
        IFNULL(DATE_FORMAT(jb.jb_jadwal2, '%d-%m-%Y'), ' - ')
      ) AS jb_jadwal_pengerjaan,

      IFNULL(u_teknisi1.user_nama, '-') AS jb_teknisi,
      IFNULL(u_teknisi2.user_nama, '-') AS jb_teknisi_bantu,

      CONCAT(
        IF(jb.jb_konfirteknisi = 0, 'Belum ', 'Sudah '),
        IFNULL(DATE_FORMAT(jb.jb_tgl_konfirteknisi, '%d-%m-%Y %T'), ' '), ' ',
        IFNULL(u_konfirtek.user_nama, '')
      ) AS jb_konfir_teknisi,

      IF(jb.jb_pengajuan = 0, 'Tidak', 'Ya') AS jb_pengajuan_barang,
      IFNULL(spp.spp_nomor, '-') AS jb_sparepart_gudang,
      jb.jb_ket_teknisi AS jb_ket_proses,

      CONCAT(
        IF(jb.jb_selesai = 0, 'Belum ',
          IF(jb.jb_selesai = 2, 'Proses ', 'Sudah ')
        ),
        IFNULL(DATE_FORMAT(jb.jb_tgl_selesai, '%d-%m-%Y %T'), ' ')
      ) AS jb_selesai,

      IF(
        jb.jb_tgl_close IS NULL, 'Belum',
        CONCAT('Sudah ', DATE_FORMAT(jb.jb_tgl_close, '%d-%m-%Y %T'))
      ) AS jb_close,

      jb.jb_user
    FROM bsmcabang.job_butuh_hdr AS jb
    LEFT JOIN bsmcabang.job_user AS u_peminta ON jb.jb_user = u_peminta.user_kode
    LEFT JOIN bsmcabang.job_user AS u_konfirga ON jb.jb_konfirga_nama = u_konfirga.user_kode
    LEFT JOIN bsmcabang.job_user AS u_teknisi1 ON jb.jb_teknisi = u_teknisi1.user_kode
    LEFT JOIN bsmcabang.job_user AS u_teknisi2 ON jb.jb_teknisi2 = u_teknisi2.user_kode
    LEFT JOIN bsmcabang.job_user AS u_konfirtek ON jb.jb_konfirteknisi_nama = u_konfirtek.user_kode
    LEFT JOIN kencanaprint.tsparepart_pengajuan_hdr AS spp ON jb.jb_nomor = spp.spp_job
    WHERE 1 = 1
  `;

  const params = [];

  // 🔹 Filter Tanggal
  if (startDate && endDate) {
    query += ` AND DATE(jb.jb_tanggal) BETWEEN ? AND ?`;
    params.push(startDate, endDate);
  }

  // 🔹 Filter Status Pengerjaan (Belum, Proses, Selesai)
  if (status && status.toUpperCase() !== 'ALL') {
    let statusValue = 0; // Default: Belum
    if (status.toUpperCase() === 'PROSES') statusValue = 2;
    if (status.toUpperCase() === 'SELESAI') statusValue = 1;

    query += ' AND jb.jb_selesai = ?';
    params.push(statusValue);
  }

  // 🔹 Filter Status Close
  if (close_status && close_status !== 'ALL') {
    if (close_status === 'NOT CLOSE') {
      query += ' AND jb.jb_tgl_close IS NULL';
    } else if (close_status === 'CLOSE') {
      query += ' AND jb.jb_tgl_close IS NOT NULL';
    }
  }

  // 🔹 Filter Pencarian Umum
  if (search) {
    query += `
      AND (
        jb.jb_nomor LIKE ? OR 
        jb.jb_lokasi LIKE ? OR 
        jb.jb_divisi LIKE ? OR 
        jb.jb_ket LIKE ?
      )
    `;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  // 🔹 Filter Berdasarkan User
  if (user_kode) {
    query += ` AND jb.jb_user = ?`;
    params.push(user_kode);
  }

  // 🔹 Urutkan hasil berdasarkan tanggal terbaru
  query += ` ORDER BY jb.jb_tanggal DESC`;

  // Eksekusi query
  const [rows] = await pool.query(query, params);
  return rows;
};

module.exports = { pool, getDetAssetByNomor, getAllAssets };