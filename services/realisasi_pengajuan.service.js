// File: services/realisasi.service.js

const { pool } = require('../config/db.config');

/**
 * Mengambil daftar realisasi berdasarkan filter
 * (Logika dari imgrefreshClick)
 */
async function getRealisasiList(filters) {
  const { startDate, endDate, status } = filters;

  if (!startDate || !endDate || !status) {
    throw new Error('startDate, endDate, dan status wajib diisi.');
  }

  let sql = `
    SELECT 
        h.re_nomor AS nomor,
        DATE_FORMAT(h.re_tanggal, "%d-%m-%Y") AS tanggal,
        h.re_spk_nomor AS pengajuan,
        h.re_peminta AS peminta,
        h.re_approve AS apv,
        IFNULL(DATE_FORMAT(h.re_dtapprove, "%d-%m-%Y"), "") AS dtapv
    FROM kencanaprint.tgarmenrealisasi_hdr h
    WHERE 
        h.re_spp_nomor <> ""
        AND DATE(h.re_tanggal) BETWEEN ? AND ?
  `;
  
  const params = [startDate, endDate];

  // Logika filter status (lebih bersih daripada di Delphi)
  if (status.toUpperCase() === 'APPROVED') {
    sql += ' AND h.spr_approve <> ""';
  } else if (status.toUpperCase() === 'PENDING') {
    sql += ' AND h.spr_approve = ""';
  }
  // Jika 'ALL', tidak perlu filter tambahan

  sql += ' ORDER BY h.spr_tanggal DESC';
  
  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Mengambil detail item sparepart dari satu realisasi
 * (Logika dari fndetail)
 */
async function getRealisasiDetails(nomor) {
  const sql = `
    SELECT 
        d.sprd_kode AS kode,
        b.sp_nama AS nama,
        b.sp_satuan AS satuan,
        d.red_jumlah AS qty,
        d.red_ket AS ket
    FROM kencanaprint.tgarmenrealisasi_dtl d
    LEFT JOIN kencanaprint.tgarmen_brg b ON b.brg_kode = d.sprd_kode
    WHERE d.sprd_nomor = ?
  `;
  
  const [rows] = await pool.query(sql, [nomor]);
  return rows;
}

/**
 * Menyetujui (approve) satu realisasi
 * (Logika dari fnapprove)
 */
async function approveRealisasi(nomor, approverName) {
  if (!approverName) {
    throw new Error("Nama approver (userNama) tidak boleh kosong.");
  }

  const sql = `
    UPDATE kencanaprint.tgarmenrealisasi_hdr 
    SET 
        spr_approve = ?,
        spr_dtapprove = NOW()
    WHERE 
        spr_nomor = ?
  `;
  
  const [result] = await pool.execute(sql, [approverName, nomor]);
  
  if (result.affectedRows === 0) {
    throw new Error("Nomor realisasi tidak ditemukan.");
  }
  
  return { success: true, message: 'Realisasi berhasil diapprove.' };
}

module.exports = {
  getRealisasiList,
  getRealisasiDetails,
  approveRealisasi,
};