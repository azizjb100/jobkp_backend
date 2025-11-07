// File: services/it_job.service.js

const { pool } = require('../config/db.config'); // Asumsi pool dari file config Anda

const getNewJobNumber = async (cabang) => {
  const tahun = new Date().getFullYear().toString();
  const sql = `
    SELECT IFNULL(MAX(RIGHT(jb_nomor, 5)), 0) AS jumlah 
    FROM bsmcabang.job_it
    WHERE YEAR(jb_tanggal) = ?
  `;
  
  const [rows] = await pool.query(sql, [tahun]);
  let njumlah = 1;
  if (rows.length > 0) {
    njumlah = parseInt(rows[0].jumlah) + 1;
  }
  
  const cjumlah = String(njumlah).padStart(5, '0');
  return `${cabang}-${tahun}-${cjumlah}`; 
};

/**
 * 1. Mengambil data untuk Form (Daftar IT)
 * (Replikasi dari 'FormCreate')
 */
const getFormData = async () => {
  const sql = `
    SELECT user_nama 
    FROM bsmcabang.job_user 
    WHERE user_aktif = 0 AND user_it = 1 
    ORDER BY user_nama
  `;
  const [rows] = await pool.query(sql);
  return rows.map(row => row.user_nama);
};

/**
 * 2. Mengambil Daftar Tiket (dengan filter)
 * (Replikasi dari 'imgrefreshClick')
 * [PERBAIKAN: Menggunakan LEFT JOIN untuk performa]
 */
const getAllJobs = async (filters) => {
  const { startDate, endDate, cabang, it_staff, status, user_kode, search
   } = filters;

  let params = [startDate, endDate];
  let sql = `
    SELECT 
      jb.jb_nomor AS Nomor,
      CONCAT(
        'Nomor: ', jb.jb_nomor, '\\r\\n',
        'Tanggal: ', DATE_FORMAT(jb.jb_tanggal, '%d-%m-%Y %T'), '\\r\\n',
        'User: ', jb.jb_cabang, ' ', IFNULL(u.user_nama, '-'), '\\r\\n',
        'Lokasi: ', jb.jb_lokasi, '\\r\\n',
        'Jenis: ', jb.jb_jenis, '\\r\\n',
        'Nama IT: ', jb.jb_it, '\\r\\n',
        'Keterangan: ', jb.jb_ket, '\\r\\n',
        'Dikonfirmasi: ', IF(jb.jb_konfirit=0, 'Belum ', 'Sudah '), IFNULL(DATE_FORMAT(jb.jb_tgl_konfirit, '%d-%m-%Y %T'), ' '), '\\r\\n',
        'Selesai dikerjakan: ', IF(jb.jb_selesai=0, 'Belum ', IF(jb.jb_selesai=2, 'Proses ', 'Sudah ')), IFNULL(DATE_FORMAT(jb.jb_tgl_selesai, '%d-%m-%Y %T'), ' '), '\\r\\n',
        'Note IT: ', jb.jb_note, '\\r\\n',
        'Close: ', IF(jb.jb_tgl_close IS NULL, 'Belum ', 'Sudah '), IFNULL(DATE_FORMAT(jb.jb_tgl_close, '%d-%m-%Y %T'), ' ')
      ) AS Detail
    FROM bsmcabang.job_it jb -- Tambah alias 'jb'
    LEFT JOIN bsmcabang.job_user u ON jb.jb_user = u.user_kode -- [PERBAIKAN]
    WHERE DATE(jb.jb_tanggal) BETWEEN ? AND ?
  `;

  if (cabang && cabang !== 'ALL') {
    sql += ' AND jb.jb_cabang = ?';
    params.push(cabang);
  }
  
  if (it_staff && it_staff !== 'ALL') {
    sql += ' AND jb.jb_it = ?';
    params.push(it_staff);
  }

  if (status && status !== 'ALL') {
    sql += ' AND jb.jb_selesai = ?';
    params.push(status);
  }

  if (user_kode) {
    sql += ' AND jb.jb_user = ?';
    params.push(user_kode);
  }
  
  if (search && search.trim() !== '') {
          sql += ` AND (
            jb.jb_nomor LIKE ? OR 
            jb.jb_lokasi LIKE ? OR
            jb.jb_divisi LIKE ? OR
            jb.jb_ket LIKE ?
          )`;
          params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

  sql += ' ORDER BY jb.jb_tanggal DESC';
  
  const [rows] = await pool.query(sql, params);
  return rows;
};

/**
 * 3. Mengambil Detail Satu Tiket
 * (Replikasi dari 'edtNomorChange')
 */
const getJobByNomor = async (nomor) => {
  const sql = `
    SELECT 
      h.*, 
      IFNULL(u.user_nama, '') AS user_nama,
      DATE(h.jb_tanggal) AS tanggalOnly
    FROM bsmcabang.job_it h
    LEFT JOIN bsmcabang.job_user u ON u.user_kode = h.jb_user 
    WHERE h.jb_nomor = ?
  `;
  const [rows] = await pool.query(sql, [nomor]);
  if (rows.length === 0) {
    return null;
  }
  // Amankan dari 'null'
  const data = rows[0];
  Object.keys(data).forEach(key => {
    if (data[key] === null) {
      data[key] = '';
    }
  });
  return data;
};

/**
 * 4. Membuat Tiket Baru
 * (Replikasi dari 'imgtsaveClick' - INSERT)
 */
const createJob = async (data) => {
  const newNomor = await getNewJobNumber(data.jb_cabang);
  
  const sql = `
    INSERT INTO bsmcabang.job_it (
      jb_nomor, jb_tanggal, jb_cabang, jb_user, jb_lokasi, jb_jenis, jb_it, jb_ket,
      jb_konfirit, jb_tgl_konfirit, jb_selesai, jb_tgl_selesai, jb_note, jb_tgl_close
    ) VALUES (
      ?, NOW(), ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `;
  
  const selesaiTgl = data.jb_selesai === 1 ? new Date() : null;

  const params = [
    newNomor,
    data.jb_cabang,
    data.jb_user,
    data.jb_lokasi,
    data.jb_jenis, // 'HARDWARE' or 'SOFTWARE'
    data.jb_it,     // Nama IT
    data.jb_ket,
    data.jb_konfirit ? '1' : '0',
    data.jb_konfirit ? new Date() : null,
    data.jb_selesai, // 0, 1, atau 2
    selesaiTgl,      // Hanya set tgl jika status = 1 (Selesai)
    data.jb_note,
    data.jb_tgl_close ? new Date() : null
  ];
  
  await pool.execute(sql, params);
  return { newNomor };
};

/**
 * 5. Mengupdate Tiket
 * (Replikasi dari 'imgtsaveClick' - UPDATE)
 * [PERBAIKAN: Menggunakan CASE..WHEN untuk keterbacaan]
 */
const updateJob = async (nomor, data) => {
  
  const konfirBit = data.jb_konfirit ? 1 : 0;
  const selesaiStatus = data.jb_selesai; // 0, 1, or 2
  const closeBit = data.jb_tgl_close ? 1 : 0;

  const sql = `
    UPDATE bsmcabang.job_it SET
      jb_lokasi = ?,
      jb_jenis = ?,
      jb_it = ?,
      jb_ket = ?,
      jb_konfirit = ?,
      jb_tgl_konfirit = CASE ? 
                          WHEN 1 THEN IF(jb_tgl_konfirit IS NULL, NOW(), jb_tgl_konfirit) 
                          ELSE NULL 
                        END,
      jb_selesai = ?,
      jb_tgl_selesai = CASE ? 
                         WHEN 1 THEN IF(jb_tgl_selesai IS NULL, NOW(), jb_tgl_selesai) 
                         ELSE NULL 
                       END,
      jb_note = ?,
      jb_tgl_close = CASE ? 
                       WHEN 1 THEN IF(jb_tgl_close IS NULL, NOW(), jb_tgl_close) 
                       ELSE NULL 
                     END
    WHERE jb_nomor = ?
  `;
  
  const params = [
    data.jb_lokasi,
    data.jb_jenis,
    data.jb_it,
    data.jb_ket,
    konfirBit,       // (Untuk jb_konfirit)
    konfirBit,       // (Untuk CASE jb_tgl_konfirit)
    selesaiStatus,   // (Untuk jb_selesai)
    selesaiStatus,   // (Untuk CASE jb_tgl_selesai)
    data.jb_note,
    closeBit,        // (Untuk CASE jb_tgl_close)
    nomor
  ];
  
  const [result] = await pool.execute(sql, params);
  return result;
};

/**
 * 6. Menghapus Tiket
 * (Replikasi dari 'imgdeleteClick' - dengan perbaikan logika Delphi)
 */
const deleteJob = async (nomor) => {
  // Validasi dulu
  const [rows] = await pool.query(
    'SELECT jb_tgl_close, jb_konfirit FROM bsmcabang.job_it WHERE jb_nomor = ?', 
    [nomor]
  );
  
  if (rows.length === 0) {
    throw new Error('Nomor tidak ditemukan.');
  }
  
  // Ini adalah logika Delphi yang sudah diperbaiki
  if (rows[0].jb_tgl_close !== null) {
    throw new Error('Sudah diclose. Tidak bisa dihapus.');
  }
  
  if (rows[0].jb_konfirit === 1) { // Delphi mengecek <> 0
    throw new Error('Sudah dikonfirmasi IT. Tidak bisa dihapus.');
  }
  
  // Lolos validasi, hapus
  const [result] = await pool.execute(
    'DELETE FROM bsmcabang.job_it WHERE jb_nomor = ?',
    [nomor]
  );
  return result;
};


module.exports = {
  getFormData,
  getAllJobs,
  getJobByNomor,
  createJob,
  updateJob,
  deleteJob
};