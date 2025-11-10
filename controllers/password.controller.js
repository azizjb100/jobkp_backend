const passwordService = require('../services/password.service.js');

class PasswordController {
  
  async changePassword(req, res) {
    try {
      // Ambil user_kode dari token JWT (via authMiddleware)
      const userKode = req.user.userId; // Sesuaikan ini dengan payload token Anda
      
      const { oldPassword, newPassword } = req.body;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({ 
          success: false, 
          message: "Password lama dan baru wajib diisi." 
        });
      }

      // Serahkan logika ke service
      const result = await passwordService.updatePassword(
        userKode,
        oldPassword,
        newPassword
      );

      res.status(200).json(result);

    } catch (error) {
      console.error("Error di PasswordController.changePassword:", error);
      res.status(500).json({ success: false, message: error.message || "Terjadi kesalahan server" });
    }
  }
}

module.exports = new PasswordController();