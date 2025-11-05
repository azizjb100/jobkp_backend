// File: perbaikan.service.js (Versi Final Sesuai Delphi)

const { pool } = require('../config/db.config');

const getFormData = async (cabang, userKode) => {
  try {
    // 1. Validasi: Cek pengajuan yang belum di-close (sesuai imgnewClick)
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
      };
    }

    // 2. Ambil Opsi Divisi berdasarkan cabang (sesuai FormCreate)
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
  try {
    // 1. Ambil data. 'jb_cabang' akan menentukan PREfix dari nomor baru.
    const { 
      jb_tanggal, jb_divisi, jb_bagian, jb_lokasi, 
      jb_jenis, jb_ket, jb_urgent, jb_cabang 
    } = data || {};
    
    // 2. Dapatkan tahun saat ini
    const tahun = new Date().getFullYear();
    
    // 3. [PERUBAHAN KUNCI]
    // Kita tidak lagi mencari berdasarkan prefix cabang (cth: 'P01-2025-%')
    // Kita mencari berdasarkan TAHUN (cth: '%-2025-%')
    // Ini akan menemukan urutan MAX dari SEMUA cabang di tahun 2025.
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
    
    return {
      success: true, insertId: result.insertId,
      new_nomor: newNomor, message: 'Data berhasil disimpan',
    };
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

module.exports = {
  getFormData,
  createPerbaikan,
  updatePerbaikan,
};