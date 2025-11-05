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

  // [PERBAIKAN] Query dasar sekarang juga menggunakan LEFT JOIN
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
    
    WHERE 1=1
  `;

  const params = [];

  // Filter Tanggal
  if (startDate && endDate) {
    query += ` AND DATE(jb.jb_tanggal) BETWEEN ? AND ?`;
    params.push(startDate, endDate);
  }

  // [PERBAIKAN] Filter Status Kepentingan (Urgent/Top Urgent)
  // Lebih baik memfilter berdasarkan angka (0 atau 1) daripada string ('Urgent')
  if (status && status !== 'ALL') {
    let urgentValue;
    if (status === 'Urgent') {
      urgentValue = 0;
    } else if (status === 'Top Urgent') {
      urgentValue = 1;
    }

    // Hanya filter jika nilainya valid (0 atau 1)
    if (urgentValue !== undefined) {
      query += ` AND jb.jb_urgent = ?`;
      params.push(urgentValue);
    }
  }

  // Filter close_status
  if (close_status && close_status !== 'ALL') {
    if (close_status === 'NOT CLOSE') {
      query += ' AND jb.jb_tgl_close IS NULL';
    } else if (close_status === 'CLOSE') {
      query += ' AND jb.jb_tgl_close IS NOT NULL';
    }
  }

  // Filter Pencarian Teks
  if (search) {
    query += ` AND (jb.jb_nomor LIKE ? OR jb.jb_lokasi LIKE ? OR jb.jb_divisi LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  // Filter user_kode
  if (user_kode) {
    query += ` AND jb.jb_user = ?`;
    params.push(user_kode);
  }

  query += ` ORDER BY jb.jb_tanggal DESC`;

  // console.log("Executing Query:", query); // Gunakan ini untuk debugging jika perlu
  // console.log("With Params:", params);
  
  const [rows] = await pool.query(query, params);
  return rows;
};

module.exports = { pool, getDetAssetByNomor, getAllAssets };