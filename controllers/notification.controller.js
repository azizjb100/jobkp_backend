const notificationService = require('../services/notification.service.js');

/**
 * Handle request GET /notifications/check
 * Dipanggil oleh Flutter setiap 1 menit
 */
exports.handleGetNew = async (req, res) => {
  try {
    const userKode = req.user?.userId; // Ambil dari auth.middleware
    if (!userKode) {
      return res.status(401).json({ message: "User tidak terotentikasi." });
    }

    const notifications = await notificationService.getAndMarkNotifications(userKode);
    
    // Kirim kembali notifikasi (bisa jadi array kosong)
    res.status(200).json({ success: true, data: notifications });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};