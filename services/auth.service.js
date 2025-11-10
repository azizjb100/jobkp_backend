// services/auth.service.js

const { pool } = require('../config/db.config');

/**
 * [FUNGSI 1: Untuk Login UTAMA]
 * Mencari data user di database HANYA berdasarkan username (user_kode).
 * (Ini adalah fungsi yang Anda tulis)
 * @param {string} username - Kode user yang akan dicari.
 * @returns {Promise<object|null>} Objek user jika ditemukan, atau null jika tidak.
 */
const findUserByUsername = async (username) => {
  try {
    // Query ini sudah benar
    const sql = `
      SELECT USER_KODE, USER_NAMA, USER_PASSWORD, USER_DIVISI, USER_CABANG,
             USER_BAG, USER_MANAGER, USER_IT, USER_BRG
      FROM job_user
      WHERE USER_KODE = ?
    `;
    
    const [rows] = await pool.execute(sql, [username]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error di auth.service (findUserByUsername):", error);
    throw error;
  }
};

const getLoginList = async () => {
  // Pastikan 'USER_PASS' adalah nama kolom password Anda
  const sql = "SELECT USER_KODE, USER_NAMA, USER_PASSWORD FROM job_user WHERE user_aktif = 0 ORDER BY USER_NAMA";
  
  try {
    const [rows] = await pool.query(sql);
    // Ubah nama kolom agar konsisten (huruf kecil)
    return rows.map(row => ({
      user_kode: row.USER_KODE,
      user_nama: row.USER_NAMA,
      password: row.USER_PASSWORD
    }));
  } catch (error) {
    console.error("Error di auth.service (getLoginList):", error);
    throw error;
  }
};

// [PERBAIKAN] Ekspor KEDUA fungsi
module.exports = { 
  findUserByUsername, // Untuk controller login
  getLoginList      // Untuk controller login-list (debug)
};