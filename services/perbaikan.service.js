// File: perbaikan.service.js (Versi Final Sesuai Delphi)

const { pool } = require('../config/db.config');

const getFormData = async (cabang, userKode) => {
  try {
    const validationSql = `
      SELECT jb_nomor, DATE_FORMAT(jb_tanggal, '%d-%m-%Y %T') as tgl 
      FROM job_butuh_hdr 
      WHERE jb_user = ? AND jb_selesai = 1 AND jb_tgl_close IS NULL 
      ORDER BY jb_tanggal 
      LIMIT 1
    `;
    const [pendingRows] = await pool.query(validationSql, [userKode]);

    if (pendingRows.length > 0) {
      const pending = pendingRows[0];
      return {
        success: true,
        can_create_new: false,
        message: `Pengajuan dgn no: ${pending.jb_nomor} Tgl: ${pending.tgl} Sudah selesai tapi blm diclose. Silahkan diclose dulu.`,
        divisi_options: [], jenis_options: [], default_bagian: '',
        pending_nomor: pending.jb_nomor
      };
    }

    let divisiOptions = ['UMUM'];
    if (cabang && cabang.toUpperCase() === 'P04') {
      divisiOptions = ['UMUM', 'JAHIT'];
    }

    // 3. Ambil Opsi Jenis dari database (sesuai prosedur bersih)
    const jenisSql = 'SELECT Jenis FROM job_jenis_pekerjaan ORDER BY Jenis';
    const [jenisRows] = await pool.query(jenisSql);
    const jenisOptions = jenisRows.map(row => row.Jenis);
    
    // 4. Ambil data bagian default dari profil user (sesuai 'zbagian' di prosedur bersih)
    let defaultBagian = '';
    if (userKode) {
        const userSql = 'SELECT user_divisi FROM job_user WHERE user_kode = ?';
        const [userRows] = await pool.query(userSql, [userKode]);
        if (userRows.length > 0) {
            defaultBagian = userRows[0].user_divisi || '';
        }
    }

    // 5. Gabungkan semua data dan kirim
    return {
      success: true,
      can_create_new: true,
      message: 'OK',
      divisi_options: divisiOptions,
      jenis_options: jenisOptions,
      default_bagian: defaultBagian, // Ini akan digunakan untuk mengisi 'edtbagian'
    };

  } catch (error) {
    console.error('❌ Error di getFormData:', error);
    return { success: false, message: error.message };
  }
};

const createPerbaikan = async (data, userKode) => {
  // [A] Try...Catch Utama untuk membuat perbaikan
  try {
    // 1. Ambil data. 'jb_cabang' akan menentukan PREfix dari nomor baru.
    const { 
      jb_tanggal, jb_divisi, jb_bagian, jb_lokasi, 
      jb_jenis, jb_ket, jb_urgent, jb_cabang 
    } = data || {};
    
    // 2. Dapatkan tahun saat ini
    const tahun = new Date().getFullYear();
    
    // 3. [PERUBAHAN KUNCI]
    const searchPattern = `%-${tahun}-%`; 

    // 4. Query SQL ini sekarang mencari 'last_sequence' tertinggi di SEMUA CABANG
    const nomorSql = `
      SELECT MAX(CAST(SUBSTRING_INDEX(jb_nomor, '-', -1) AS UNSIGNED)) AS last_sequence
      FROM job_butuh_hdr WHERE jb_nomor LIKE ?
    `;
    
    // 5. Eksekusi query dengan searchPattern tahun
    const [nomorRows] = await pool.query(nomorSql, [searchPattern]);
    
    // 6. Logika increment (penambahan nomor) tetap sama
    let nextSequence = 1;
    if (nomorRows[0] && nomorRows[0].last_sequence) {
      nextSequence = nomorRows[0].last_sequence + 1;
    }
    
    // 7. Buat nomor baru
    const formattedSequence = String(nextSequence).padStart(5, '0');
    // Prefix-nya tetap menggunakan 'jb_cabang' dari user yang input
    const newPrefix = `${jb_cabang}-${tahun}`;
    const newNomor = `${newPrefix}-${formattedSequence}`; // Cth: P04-2025-00177

    // 8. Sisa query INSERT Anda tetap sama
    const values = [
      newNomor, jb_tanggal, userKode ?? null, jb_divisi ?? null, jb_bagian ?? null,
      jb_lokasi ?? null, jb_jenis ?? null, jb_ket ?? null, jb_urgent ?? '0', jb_cabang ?? null,
    ];
    const insertSql = `
      INSERT INTO job_butuh_hdr (
        jb_nomor, jb_tanggal, jb_user, jb_divisi, jb_bagian,
        jb_lokasi, jb_jenis, jb_ket, jb_urgent, jb_cabang
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await pool.execute(insertSql, values);
    
    // --- [START] LOGIKA NOTIFIKASI BARU (SESUAI DELPHI) ---
    // Logika ini berjalan *setelah* data utama berhasil disimpan.
    // Dibuat dalam try...catch terpisah agar jika notif gagal,
    // data utama tetap dianggap berhasil disimpan.
    try {
      // 1. Dapatkan nama user pembuat (dibutuhkan untuk pesan notif)
      let creatorName = 'User'; // Default
      if (userKode) {
        const userSql = 'SELECT user_nama FROM job_user WHERE user_kode = ?';
        const [userRows] = await pool.query(userSql, [userKode]);
        if (userRows.length > 0) {
          creatorName = userRows[0].user_nama || 'User';
        }
      }

      // 2. Cari user GA (user_bag = 9, sesuai Delphi)
      const gaSql = 'SELECT user_kode FROM job_user WHERE user_bag = 9 AND user_kode <> ? LIMIT 1';
      const [gaRows] = await pool.query(gaSql, ['999']);

      if (gaRows.length > 0) {
        const gaUserKode = gaRows[0].user_kode;

        const notifMessage = `${creatorName}, Nomor:${newNomor}. ${jb_lokasi || ''}. ${jb_ket || ''}`;

        const notifSql = `
          INSERT INTO job_notif 
            (nomor, notif, date_create, date_notif_exp, user, id)
          VALUES 
            (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), ?, 1)
          ON DUPLICATE KEY UPDATE
            date_create = NOW(),
            notif = VALUES(notif),
            date_notif = NULL,
            date_notif_exp = VALUES(date_notif_exp)
        `;
        
        const notifValues = [newNomor, notifMessage, gaUserKode];
        
        // 5. Eksekusi query notifikasi
        await pool.execute(notifSql, notifValues);
        
        const [notifResult] = await pool.execute(notifSql, notifValues);
        console.log('✅ Hasil eksekusi notif:', notifResult);
        // [AKHIR TAMBAHAN]

        console.log(`✅ Notifikasi untuk ${newNomor} berhasil dikirim ke user ${gaUserKode}`);
      
      } else {

        console.warn(`⚠️ Tidak ditemukan user GA (user_bag=9) untuk dikirimi notifikasi ${newNomor}`);
      }

    } catch (notifError) {
      console.error(`❌ Gagal mengirim notifikasi untuk ${newNomor}:`, notifError.message);
    }
    return {
      success: true, insertId: result.insertId,
      new_nomor: newNomor, message: 'Data berhasil disimpan',
    };

  // [B] Try...Catch Utama
  } catch (error) {
    console.error('❌ Error di createPerbaikan:', error);
    return { success: false, message: error.message };
  }
};

const updatePerbaikan = async (nomor, data) => {
  // 1. Ambil data dari payload (sesuai kiriman Flutter)
  const {
    jb_divisi,
    jb_bagian,
    jb_lokasi,
    jb_jenis,
    jb_ket,
    jb_urgent
  } = data;

  // 2. Siapkan query UPDATE
  // (Pastikan nama tabel 'job_butuh_hdr' sudah benar)
  const updateSql = `
    UPDATE job_butuh_hdr
    SET
      jb_divisi = ?,
      jb_bagian = ?,
      jb_lokasi = ?,
      jb_jenis = ?,
      jb_ket = ?,
      jb_urgent = ?
    WHERE
      jb_nomor = ?
  `;

  // 3. Siapkan values (pastikan urutan SAMA DENGAN query)
  const values = [
    jb_divisi,
    jb_bagian,
    jb_lokasi,
    jb_jenis,
    jb_ket,
    jb_urgent,
    nomor // <-- 'nomor' untuk WHERE clause
  ];

  // 4. Eksekusi query. Jika gagal, ini akan otomatis 'throw'
  const [result] = await pool.execute(updateSql, values);

  // 5. Kirim balasan (jika sukses)
  return result;
};

const getPerbaikanByNomor = async (nomor) => {
  try {
    // [FIX] Query ini sekarang menggunakan ALIAS yang SAMA PERSIS
    // dengan detasset.service.js
    const sql = `
      SELECT 
        jb.jb_nomor AS jb_nomor,
        DATE_FORMAT(jb.jb_tanggal, '%d-%m-%Y %T') AS jb_tanggal,
        CONCAT(jb.jb_cabang, ' ', IFNULL(u_peminta.user_nama, '-')) AS jb_cabang,
        
        -- [FIX] Dibungkus IFNULL DAN alias disamakan
        IFNULL(jb.jb_divisi, '') AS jb_divisi,
        IFNULL(jb.jb_bagian, '') AS jb_bagian,
        IFNULL(jb.jb_lokasi, '') AS jb_lokasi,
        IFNULL(jb.jb_jenis, '') AS jb_jenis,
        IFNULL(jb.jb_ket, '') AS jb_ket,
        IFNULL(jb.jb_ket_teknisi, '') AS jb_ket_proses,
        IFNULL(u_teknisi1.user_nama, '-') AS jb_teknisi,
        -- [AKHIR FIX]

        IF(jb.jb_urgent=0,'Urgent','Top Urgent') AS jb_kepentingan,
        
        CONCAT(
          IF(jb.jb_konfirga=0,'Belum ','Sudah '),
          IFNULL(DATE_FORMAT(jb.jb_tgl_konfirga, '%d-%m-%Y %T'),' '), ' ',
          IFNULL(u_konfirga.user_nama, '')
        ) AS jb_konfir_ga,
        
        CONCAT(
          IFNULL(DATE_FORMAT(jb.jb_jadwal1,'%d-%m-%Y'),' - '),
          ' s.d ',
          IFNULL(DATE_FORMAT(jb.jb_jadwal2,'%d-%m-%Y'),' - ')
        ) AS jb_jadwal_pengerjaan,
        
        IFNULL(u_teknisi2.user_nama, '-') AS jb_teknisi_bantu,
        
        CONCAT(
          IF(jb.jb_konfirteknisi=0,'Belum ','Sudah '),
          IFNULL(DATE_FORMAT(jb.jb_tgl_konfirteknisi, '%d-%m-%Y %T'),' '), ' ',
          IFNULL(u_konfirtek.user_nama, '')
        ) AS jb_konfir_teknisi,
        
        IF(jb.jb_pengajuan=0,'Tidak','Ya') AS jb_pengajuan_barang,
        IFNULL(spp.spp_nomor, '-') AS jb_sparepart_gudang,
        
        CONCAT(
          IF(jb.jb_selesai=0,'Belum ',
             IF(jb.jb_selesai=2,'Proses ','Sudah ')),
          IFNULL(DATE_FORMAT(jb.jb_tgl_selesai,'%d-%m-%Y %T'),' ')
        ) AS jb_selesai,
        
        IF(jb.jb_tgl_close IS NULL,'Belum',
          CONCAT('Sudah ', DATE_FORMAT(jb.jb_tgl_close,'%d-%m-%Y %T'))
        ) AS jb_close,
        
        jb.jb_user
        
      FROM bsmcabang.job_butuh_hdr AS jb
      
      LEFT JOIN bsmcabang.job_user AS u_peminta ON jb.jb_user = u_peminta.user_kode
      LEFT JOIN bsmcabang.job_user AS u_konfirga ON jb.jb_konfirga_nama = u_konfirga.user_kode
      LEFT JOIN bsmcabang.job_user AS u_teknisi1 ON jb.jb_teknisi = u_teknisi1.user_kode
      LEFT JOIN bsmcabang.job_user AS u_teknisi2 ON jb.jb_teknisi2 = u_teknisi2.user_kode
      LEFT JOIN bsmcabang.job_user AS u_konfirtek ON jb.jb_konfirteknisi_nama = u_konfirtek.user_kode
      LEFT JOIN kencanaprint.tsparepart_pengajuan_hdr AS spp ON jb.jb_nomor = spp.spp_job

      WHERE jb.jb_nomor = ?
    `;
    
    const [rows] = await pool.query(sql, [nomor]);
    
    if (rows.length === 0) {
      return { success: false, message: 'Data tidak ditemukan' };
    }
    
    // Kirim data baris pertama
    return { success: true, data: rows[0] };
    
  } catch (error) {
    console.error('❌ Error di getPerbaikanByNomor:', error);
    return { success: false, message: error.message };
  }
};

const closePerbaikan = async (nomor) => {
  try {
    const sql = `
      UPDATE job_butuh_hdr 
      SET jb_tgl_close = NOW() 
      WHERE jb_nomor = ?
    `;
    const [result] = await pool.execute(sql, [nomor]);

    if (result.affectedRows === 0) {
      return { success: false, message: 'Nomor tidak ditemukan' };
    }
    
    return { success: true, message: 'Pekerjaan berhasil di-close' };
  
  } catch (error) {
    console.error('❌ Error di closePerbaikan:', error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  getFormData,
  createPerbaikan,
  updatePerbaikan,
  getPerbaikanByNomor,
  closePerbaikan
};