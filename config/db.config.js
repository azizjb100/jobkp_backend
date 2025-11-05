// // server.js
// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');

// const app = express();
// app.use(cors());
// app.use(express.json());

// const PORT = process.env.PORT || 5000;
// const JWT_SECRET = process.env.JWT_SECRET || 'jobkp_secret_key';

// // === DATA USER DUMMY (password di-hash saat runtime) ===
// const users = [
//   {
//     id: 1,
//     username: 'admin',
//     // password: admin123
//     password: bcrypt.hashSync('admin123', 10),
//     name: 'Admin HRGA',
//     role: 'hrga'
//   },
//   {
//     id: 2,
//     username: 'user1',
//     // password: pass123
//     password: bcrypt.hashSync('pass123', 10),
//     name: 'Karyawan Dept A',
//     role: 'employee'
//   },
//   {
//     id: 3,
//     username: 'user2',
//     // password: welcome
//     password: bcrypt.hashSync('welcome', 10),
//     name: 'Karyawan Dept B',
//     role: 'employee'
//   }
// ];

// // ===== Endpoint: daftar user (tanpa password plaintext) =====
// app.get('/api/users', (req, res) => {
//   const safe = users.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role }));
//   res.json({ success: true, data: safe });
// });

// // ===== Endpoint: login =====
// app.post('/api/auth/login', async (req, res) => {
//   const { username, password } = req.body;
//   if (!username || !password) return res.status(400).json({ message: 'username & password wajib diisi' });

//   const user = users.find(u => u.username === username);
//   if (!user) return res.status(401).json({ message: 'Username tidak ditemukan' });

//   const match = await bcrypt.compare(password, user.password);
//   if (!match) return res.status(401).json({ message: 'Password salah' });

//   const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '2h' });

//   res.json({
//     message: 'Login berhasil',
//     token,
//     user: { id: user.id, username: user.username, name: user.name, role: user.role }
//   });
// });

// // ===== Contoh route terlindung (menggunakan token) =====
// function authMiddleware(req, res, next) {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) return res.status(401).json({ message: 'Token tidak ditemukan' });

//   const parts = authHeader.split(' ');
//   if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ message: 'Format token tidak valid' });

//   const token = parts[1];
//   try {
//     const payload = jwt.verify(token, JWT_SECRET);
//     req.user = payload; // menaruh data user di request
//     next();
//   } catch (err) {
//     return res.status(401).json({ message: 'Token tidak valid / kadaluarsa' });
//   }
// }

// app.get('/api/protected', authMiddleware, (req, res) => {
//   res.json({ message: 'Ini data terlindung', user: req.user });
// });

// // ===== Jalankan server =====
// app.listen(PORT, () => {
//   console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
// });

































require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Buat pool koneksi
const pool = mysql.createPool(dbConfig);

// Fungsi test koneksi
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Koneksi ke database BERHASIL!');
    connection.release();
  } catch (error) {
    console.error('❌ Gagal konek ke database:', error.message);
  }
}

module.exports = { dbConfig, pool, testConnection };
