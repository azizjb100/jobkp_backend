const { pool } = require('../config/db.config');
// const bcrypt = require('bcryptjs'); // Anda HARUSNYA menggunakan ini

class PasswordService {

  /**
   * Mengupdate password user
   * @param {string} userKode Kode user dari token
   * @param {string} oldPassword Password lama dari form
   * @param {string} newPassword Password baru dari form
   */
  async updatePassword(userKode, oldPassword, newPassword) {
    
    // PENTING: Logika ini mengasumsikan Anda masih menyimpan password sebagai
    // plain text, mengikuti kode Anda sebelumnya.
    // Ini SANGAT TIDAK AMAN. Anda harus beralih ke bcrypt.
    
    const connection = await pool.getConnection();

    try {
      // 1. Dapatkan user dan password lama-nya dari DB
      const selectSql = "SELECT USER_PASSWORD FROM job_user WHERE USER_KODE = ?";
      const [rows] = await connection.execute(selectSql, [userKode]);

      if (rows.length === 0) {
        throw new Error("User tidak ditemukan.");
      }

      const user = rows[0];

      // 2. Validasi password lama (CARA AMAN: di server)
      //    (Logika plain text, SANGAT TIDAK AMAN)
      if (user.USER_PASSWORD !== oldPassword) {
        throw new Error("Password lama salah.");
      }
      
      // (CARA YANG BENAR dengan BCRYPT)
      // const isPasswordValid = await bcrypt.compare(oldPassword, user.USER_PASSWORD);
      // if (!isPasswordValid) {
      //   throw new Error("Password lama salah.");
      // }

      // 3. Update ke password baru (Gunakan parameterized query!)
      // const hashedNewPassword = await bcrypt.hash(newPassword, 10); // (Harusnya di-hash)
      const updateSql = "UPDATE job_user SET USER_PASSWORD = ? WHERE USER_KODE = ?";
      await connection.execute(updateSql, [newPassword, userKode]); // Ganti newPassword dgn hashedNewPassword

      return { success: true, message: "Password berhasil diubah." };

    } catch (error) {
      console.error("Error di PasswordService:", error);
      throw error; // Biarkan controller yang menangani error
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = new PasswordService();