// controllers/auth.controller.js

const jwt = require('jsonwebtoken');
// [PERBAIKAN] Impor service yang sudah kita buat
const authService = require('../services/auth.service');

exports.login = async (req, res) => {
    try {
        const { user_kode, password } = req.body;

        if (!user_kode || !password) {
            return res.status(400).json({ message: 'Username dan Password harus diisi' });
        }

        // 1. Panggil service untuk mencari user berdasarkan username
        const user = await authService.findUserByUsername(user_kode);

        // Jika user tidak ditemukan
        if (!user) {
            return res.status(401).json({ message: 'Username atau Password salah' });
        }

        // 2. Bandingkan password di dalam kode aplikasi (bukan di SQL)
        // Ganti ini dengan `bcrypt.compareSync` jika password Anda di-hash
        const isPasswordValid = (password === user.USER_PASSWORD);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Username atau Password salah' });
        }
        
        // 3. Jika berhasil, buat token dan kirim response
        const payload = {
            userId: user.USER_KODE,
            nama: user.USER_NAMA,
            role: user.USER_BAG
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({
            message: "Login berhasil",
            token: token,
            user: {
                user_kode: user.USER_KODE,
                user_nama: user.USER_NAMA,
                user_divisi: user.USER_DIVISI,
                user_cabang: user.USER_CABANG,
                user_bag: user.USER_BAG,
                user_manager: user.USER_MANAGER,
                user_it: user.USER_IT,
                user_brg: user.USER_BRG,
            }
        });

    } catch (error) {
        console.error("Login Controller Error:", error);
        res.status(500).json({ message: "Terjadi kesalahan pada server" });
    }
};