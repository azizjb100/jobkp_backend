const { pool } = require('../config/db.config');

class NotificationService {

  /**
   * Mengambil notifikasi baru untuk user,
   * dan langsung menandainya sebagai "sudah terkirim" (mengisi date_notif)
   */
  async getAndMarkNotifications(userKode) {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 1. SELECT: Ambil semua notifikasi yang belum dibaca (date_notif IS NULL)
      //    Query ini sudah benar dan aman.
      const selectSql = `
        SELECT nomor, notif, id 
        FROM bsmcabang.job_notif 
        WHERE user = ? AND date_notif IS NULL
      `;
      const [notifications] = await connection.query(selectSql, [userKode]);

      // Jika tidak ada notif baru, kita tidak perlu update apa-apa
      if (notifications.length === 0) {
        await connection.commit(); // Tetap commit (transaksi kosong)
        return [];
      }

      const updateSql = `
        UPDATE bsmcabang.job_notif 
        SET date_notif = NOW() 
        WHERE user = ? AND date_notif IS NULL 
      `;
      
      // Gunakan parameter 'userKode' yang aman (prepared statement)
      await connection.query(updateSql, [userKode]);

      // 3. Commit transaksi
      await connection.commit();

      // 4. Kembalikan notifikasi yang kita temukan di langkah 1
      return notifications;

    } catch (error) {
      await connection.rollback();
      console.error("Error di getAndMarkNotifications:", error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new NotificationService();