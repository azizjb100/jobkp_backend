// services/auth.service.js

// [PERBAIKAN] Impor 'pool' yang sudah kita buat, bukan 'dbConfig'
const { pool } = require('../config/db.config');

/**
 * Mencari data user di database HANYA berdasarkan username (user_kode).
 * @param {string} username - Kode user yang akan dicari.
 * @returns {Promise<object|null>} Objek user jika ditemukan, atau null jika tidak.
 */
const findUserByUsername = async (username) => {
  try {
    // [PERBAIKAN] Query hanya mencari berdasarkan USER_KODE. Ini lebih aman.
    const sql = `
      SELECT USER_KODE, USER_NAMA, USER_PASSWORD, USER_DIVISI, USER_CABANG,
             USER_BAG, USER_MANAGER, USER_IT, USER_BRG
      FROM job_user
      WHERE USER_KODE = ?
    `;
    
    const [rows] = await pool.execute(sql, [username]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error di auth.service:", error);
    // Lemparkan error agar bisa ditangkap oleh controller
    throw error;
  }
};

// Ganti nama fungsi `loginUser` menjadi `findUserByUsername` agar lebih deskriptif
module.exports = { findUserByUsername };