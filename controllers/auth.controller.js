const authService = require('../services/auth.service.js');
const jwt = require('jsonwebtoken');
// [PERBAIKAN 1] Hapus 'bcrypt' karena kita tidak menggunakannya
// const bcrypt = require('bcryptjs'); 

const JWT_SECRET = process.env.JWT_SECRET || 's+qG0PB3JQB/jHABdHfVejMBUm9zJtE4Mb1GHMAYXsw=';

class AuthController {

  async login(req, res) {
    try {
      const { user_kode, password } = req.body;

      if (!user_kode || !password) {
        return res.status(400).json({ success: false, message: "Username dan password wajib diisi." });
      }

      const user = await authService.findUserByUsername(user_kode);
      if (!user) {
        return res.status(404).json({ success: false, message: "Username tidak ditemukan." });
      }

      // [PERBAIKAN 2] Ganti logika perbandingan password
      
      // HAPUS INI: (Hanya untuk password ter-enkripsi)
      // const isPasswordValid = bcrypt.compareSync(password, user.USER_PASSWORD);
      
      // GANTI DENGAN INI: (Untuk password plain text)
      const isPasswordValid = (password === user.USER_PASSWORD);

      
      if (!isPasswordValid) {
        // Error Anda berasal dari sini
        return res.status(401).json({ success: false, message: "Password salah." });
      }

      // 3. Buat JWT Token
      const token = jwt.sign(
        { 
          userId: user.USER_KODE, 
          role: user.USER_BAG 
        }, 
        JWT_SECRET, 
        { expiresIn: '24h' } 
      );

      // 4. Siapkan data user
      const userData = {
        user_kode: user.USER_KODE,
        nama: user.USER_NAMA,
        divisi: user.USER_DIVISI,
        cabang: user.USER_CABANG,
        user_bag: user.USER_BAG,
        manager: user.USER_MANAGER,
        it: user.USER_IT,
        brg: user.USER_BRG,
        role: user.USER_BAG 
      };
      
      // 5. Kirim balasan
      res.status(200).json({
        success: true,
        message: "Login berhasil",
        token: token,
        user: userData 
      });

    } catch (error) {
      console.error("Error di AuthController.login:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Menangani: GET /api/auth/login-list
   * (Hanya untuk DEBUG)
   */
  async getLoginList(req, res) {
    try {
      const users = await authService.getLoginList();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new AuthController();