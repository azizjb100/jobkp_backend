const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Impor Rute Anda
const authRoutes = require('./routes/auth.routes');
const detAssetRoutes = require('./routes/detAsset.routes');
const perbaikanRoutes = require('./routes/perbaikan.routes');
const konfirmasiRoutes = require('./routes/konfirmasi.routes');
const pengajuanRoutes = require('./routes/pengajuan.routes');
const laporanPerbaikanRoutes = require('./routes/laporan_perbaikan.routes');
const laporanAbsenRoutes = require('./routes/laporanAbsen.routes');
const realisasiPengajuanRoutes = require('./routes/realisasi_pengajuan.routes');
const jobitRoutes = require('./routes/jobit.routes');

const app = express();

// --- Konfigurasi CORS yang lebih aman ---
// Tentukan domain yang diizinkan. Ambil dari .env untuk fleksibilitas.
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',') : '*';

const corsOptions = {
  // Untuk development, '*' mungkin tidak masalah. 
  // Untuk production, ganti dengan domain frontend Anda, misal: ['http://app.perusahaananda.com']
  origin: allowedOrigins, 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true // Penting jika Anda menggunakan cookies atau session
};
app.use(cors(corsOptions));


// --- SARAN 1: Menggunakan middleware bawaan Express ---
// Hapus `require('body-parser')` dan gunakan ini:
app.use(express.json()); // Untuk parsing application/json
app.use(express.urlencoded({ extended: true })); // Untuk parsing application/x-www-form-urlencoded


// Health check endpoint (sudah bagus)
app.get('/', (req, res) => {
  res.send('✅ Server JobKP Backend Berjalan');
});

// Daftarkan route
app.use('/api/auth', authRoutes);
app.use('/api/detasset', detAssetRoutes);
app.use('/api/perbaikan', perbaikanRoutes);
app.use('/api/konfirmasi', konfirmasiRoutes);
app.use('/api/pengajuan', pengajuanRoutes);
app.use('/api/laporan', laporanPerbaikanRoutes);
app.use('/api/absensi', laporanAbsenRoutes);
app.use('/api/realisasi', realisasiPengajuanRoutes);
app.use('/api/jobit', jobitRoutes);


// Port
const PORT = process.env.PORT || 5000;

// Test koneksi database saat startup (sudah bagus)
const { testConnection } = require('./config/db.config');

app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
  console.log(`🔌 CORS diizinkan untuk origin: ${allowedOrigins}`);
  testConnection();
});