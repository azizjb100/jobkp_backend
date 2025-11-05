// File: controllers/perbaikan.controller.js

// 1. Impor service yang sudah Anda buat
const perbaikanService = require('../services/perbaikan.service');

/**
 * Controller untuk: GET /form-data
 * Dipanggil oleh router: router.get('/form-data', perbaikanController.getFormData);
 */
exports.getFormData = async (req, res) => {
  try {
    // Ambil 'cabang' dan 'user_kode' dari query string
    const { cabang, user_kode } = req.query;

    if (!user_kode) {
      return res.status(400).send({ 
        success: false, 
        message: 'Query parameter user_kode wajib diisi.' 
      });
    }

    // Panggil service (service ini sudah berisi logika validasi)
    const result = await perbaikanService.getFormData(cabang, user_kode);

    // Kirim balasan
    if (result.success) {
      res.status(200).send(result);
    } else {
      // Ini jika service me-return { success: false, ... }
      res.status(400).send(result);
    }

  } catch (error) {
    // Ini jika terjadi error tak terduga
    console.error('❌ Error di controller getFormData:', error);
    res.status(500).send({
      success: false,
      message: 'Controller error saat mengambil data form.',
      error: error.message,
    });
  }
};

/**
 * Controller untuk: POST /save
 * Dipanggil oleh router: router.post('/save', perbaikanController.savePerbaikan);
 */
exports.savePerbaikan = async (req, res) => {
  try {
    // 1. Ambil payload LENGKAP dari Flutter (dari req.body)
    const payload = req.body;
    
    // [DEBUG WAJIB] Cek apa yang dikirim Flutter
    console.log('Mencoba simpan data, body diterima:', payload);

    // Cek jika req.body kosong (karena lupa express.json())
    if (!payload || Object.keys(payload).length === 0) {
      return res.status(400).send({
        message: "Data kosong! Pastikan express.json() sudah di-setting."
      });
    }

    // 2. [PERBAIKAN DATA]
    // Service 'createPerbaikan' Anda butuh 2 argumen: (data, userKode)
    
    // a. Ambil 'userKode' dari payload (sesuai kiriman Flutter)
    const userKode = payload.jb_user;

    // b. Hapus 'jb_user' dari payload, karena service menerimanya terpisah
    delete payload.jb_user;

    // c. Service 'createPerbaikan' Anda BUTUH 'jb_tanggal' di dalam 'data'
    //    Kita tambahkan di sini.
    payload.jb_tanggal = new Date(); // Set tanggal server

    // 3. Panggil service dengan data yang sudah disiapkan
    const result = await perbaikanService.createPerbaikan(payload, userKode);

    // 4. Kirim balasan
    if (result.success) {
      // 201 = Created (standar untuk POST yang sukses)
      res.status(201).send(result); 
    } else {
      // Ini jika service me-return { success: false, ... }
      // (misalnya error SQL atau error generate nomor)
      res.status(500).send(result);
    }
  } catch (error) {
    // Ini jika terjadi error tak terduga di controller
    console.error('❌ Error di controller savePerbaikan:', error);
    res.status(500).send({
      success: false,
      message: 'Controller error saat menyimpan data.',
      error: error.message,
    });
  }
};


exports.updatePerbaikan = async (req, res) => {
  try {
    // 1. Ambil 'nomor' dari parameter URL (misal: /api/perbaikan/JB-001)
    const { nomor } = req.params;
    
    // 2. Ambil payload data dari body
    const data = req.body;

    // [DEBUG]
    console.log(`Mencoba update data untuk: ${nomor}`);
    console.log('Body diterima:', data);

    // 3. Validasi dasar
    if (!data || Object.keys(data).length === 0) {
      return res.status(400).send({
        success: false,
        message: "Data untuk update tidak boleh kosong."
      });
    }
    
    // 4. Panggil service
    const result = await perbaikanService.updatePerbaikan(nomor, data);

    // 5. Cek apakah ada baris yang benar-benar ter-update
    if (result.affectedRows === 0) {
      // Ini terjadi jika query-nya benar, tapi 'jb_nomor' tidak ditemukan
      return res.status(404).send({
        success: false,
        message: `Data dengan nomor ${nomor} tidak ditemukan.`
      });
    }

    // 6. Kirim balasan sukses
    res.status(200).send({ // 200 = OK (standar untuk PUT/update)
      success: true,
      message: `Data ${nomor} berhasil diperbarui.`,
      data: result
    });

  } catch (error) {
    // 7. Tangkap error dari service atau controller
    console.error('❌ Error di controller updatePerbaikan:', error);
    res.status(500).send({
      success: false,
      message: 'Controller error saat meng-update data.',
      error: error.message,
    });
  }
};