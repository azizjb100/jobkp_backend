const { pool } = require('../config/db.config');

/**
 * [HELPER] Fungsi untuk membuat nomor job baru
 * (Diambil dari file lama Anda dan diperbaiki)
 */
async function getNewJobNumber(cabang) {
  const tahun = new Date().getFullYear().toString();
  const sql = `
    SELECT IFNULL(MAX(RIGHT(jb_nomor, 5)), 0) AS jumlah 
    FROM bsmcabang.job_it 
    WHERE YEAR(jb_tanggal) = ?
  `; // [FIX] Nama tabel 'job_it'

  const [rows] = await pool.query(sql, [tahun]);
  let njumlah = 1;
  if (rows.length > 0) {
    njumlah = Number(rows[0].jumlah) + 1;
  }
  
  const cjumlah = String(njumlah).padStart(5, '0');
  return `${cabang}-${tahun}-${cjumlah}`; 
}


class ItJobService {

  /**
   * Mengambil daftar Job IT
   * [PERBAIKAN] Nama tabel dan kolom disesuaikan dengan file lama
   */
  async getAllItJobs(filters) {
    const { 
      startDate, endDate, cabang, it_staff, 
      status, search, user_kode 
    } = filters;

    let sql = `
      SELECT 
        jb.jb_nomor AS Nomor,
        CONCAT(
          'Tgl: ', DATE_FORMAT(jb.jb_tanggal, '%d-%m-%y %T'),
          '\\nCabang: ', jb.jb_cabang,
          '\\nUser: ', IFNULL(u.user_nama, jb.jb_user),
          '\\nLokasi: ', jb.jb_lokasi,
          '\\nKeterangan: ', jb.jb_ket,
          '\\nStatus: ', 
          IF(jb.jb_selesai = 1, 'Selesai', 
              IF(jb.jb_selesai = 2, 'Proses', 'Belum')
          )
        ) AS detail
      FROM bsmcabang.job_it jb
      LEFT JOIN bsmcabang.job_user u ON jb.jb_user = u.user_kode
      WHERE DATE(jb.jb_tanggal) BETWEEN ? AND ?
    `;
    
    const params = [startDate, endDate];

    // Filter Cabang
    if (cabang && cabang !== 'ALL') {
      sql += ' AND jb.jb_cabang = ?';
      params.push(cabang);
    }

    // Filter Status
    if (status && status !== 'ALL') {
      sql += ' AND jb.jb_selesai = ?';
      params.push(status);
    }

    // Filter Search
    if (search && search.trim() !== '') {
      sql += ' AND (jb.jb_nomor LIKE ? OR jb.jb_lokasi LIKE ? OR jb.jb_ket LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // --- [LOGIKA ROLE] ---
    if (user_kode) {
      // 1. JIKA 'user_kode' ADA (dikirim oleh user biasa / non-IT)
      sql += ' AND jb.jb_user = ?';
      params.push(user_kode);
    } else {
      // 2. JIKA 'user_kode' TIDAK ADA (dikirim oleh Admin IT)
      if (it_staff && it_staff !== 'ALL') {
        sql += ' AND jb.jb_it = ?'; 
        params.push(it_staff);
      }
    }
    // --- [AKHIR LOGIKA ROLE] ---

    sql += ' ORDER BY jb.jb_tanggal DESC';
    
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  /**
   * Mengambil daftar Staf IT (untuk filter dropdown)
   * (Logika dari 'getFormData' di file lama Anda)
   */
  async getItStaffList() {
    const sql = "SELECT user_nama FROM bsmcabang.job_user WHERE user_it = 1 ORDER BY user_nama";
    const [rows] = await pool.query(sql);
    return rows.map(row => row.user_nama); 
  }

  /**
   * Mengambil Detail Satu Tiket
   * (Diambil dari file lama Anda)
   */
  async getJobByNomor(nomor) {
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
    const data = rows[0];
    Object.keys(data).forEach(key => {
      if (data[key] === null) {
        data[key] = '';
      }
    });
    return data;
  }

  /**
   * Membuat Tiket Baru
   * (Diambil dari file lama Anda)
   */
  async createJob(data) {
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
      data.jb_jenis,
      data.jb_it,
      data.jb_ket,
      data.jb_konfirit ? '1' : '0',
      data.jb_konfirit ? new Date() : null,
      data.jb_selesai, // 0, 1, atau 2
      selesaiTgl,
      data.jb_note,
      data.jb_tgl_close ? new Date() : null
    ];
    
    await pool.execute(sql, params);
    return { newNomor };
  }

  /**
   * Mengupdate Tiket
   * (Diambil dari file lama Anda)
   */
  async updateJob(nomor, data) {
    const konfirBit = data.jb_konfirit ? 1 : 0;
    const selesaiStatus = data.jb_selesai;
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
      konfirBit,
      konfirBit,
      selesaiStatus,
      selesaiStatus,
      data.jb_note,
      closeBit,
      nomor
    ];
    
    const [result] = await pool.execute(sql, params);
    return result;
  }

  /**
   * Menghapus Tiket
   * (Diambil dari file lama Anda)
   */
  async deleteItJob(nomor) {
    const [rows] = await pool.query(
      'SELECT jb_tgl_close, jb_konfirit FROM bsmcabang.job_it WHERE jb_nomor = ?', 
      [nomor]
    ); 
    
    if (rows.length === 0) {
      throw new Error('Nomor tidak ditemukan.');
    }
    if (rows[0].jb_tgl_close !== null) {
      throw new Error('Sudah diclose. Tidak bisa dihapus.');
    }
    if (rows[0].jb_konfirit === 1) { 
      throw new Error('Sudah dikonfirmasi IT. Tidak bisa dihapus.');
    }

    await pool.execute(
      'DELETE FROM bsmcabang.job_it WHERE jb_nomor = ?',
      [nomor]
    ); 
    return { success: true, message: 'Job IT berhasil dihapus' };
  }
}

module.exports = new ItJobService();