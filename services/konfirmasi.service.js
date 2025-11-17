const { pool } = require('../config/db.config');
// [FIX] Impor admin Firebase (jika Anda menggunakannya)
// const admin = require('../config/firebase.config.js');

class JobService {
  
  // =================================================================
  // FUNGSI UTAMA (Get List, Get By ID)
  // =================================================================

  /**
   * Mengambil daftar pekerjaan dengan filter (LEFT JOIN)
   */
  async getJobs(filters) {
    const { startDate, endDate, status, closeStatus, branch, technician, includeBantu, search } = filters;

    let sql = `
      SELECT 
        jb.jb_nomor,
        DATE_FORMAT(jb.jb_tanggal, '%d-%m-%Y %T') AS jb_tanggal,
        CONCAT(jb.jb_cabang, ' ', IFNULL(u_peminta.user_nama, '-')) AS jb_cabang,
        jb.jb_divisi, jb.jb_bagian, jb.jb_lokasi, jb.jb_jenis, jb.jb_ket,
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
        IFNULL(u_teknisi.user_nama, '-') AS jb_teknisi,
        IFNULL(u_teknisi2.user_nama, '-') AS jb_teknisi_bantu,
        CONCAT(
          IF(jb.jb_konfirteknisi=0,'Belum ','Sudah '),
          IFNULL(DATE_FORMAT(jb.jb_tgl_konfirteknisi, '%d-%m-%Y %T'),' '), ' ',
          IFNULL(u_konfirtek.user_nama, '')
        ) AS jb_konfir_teknisi,
        IF(jb.jb_pengajuan=0,'Tidak','Ya') AS jb_pengajuan_barang,
        IFNULL(spp.spp_nomor, '-') AS jb_sparepart_gudang,
        jb.jb_ket_teknisi,
        CONCAT(
          IF(jb.jb_selesai=0,'Belum ',
             IF(jb.jb_selesai=2,'Proses ','Sudah ')),
          IFNULL(DATE_FORMAT(jb.jb_tgl_selesai,'%d-%m-%Y %T'),' ')
        ) AS jb_selesai,
        IF(jb.jb_tgl_close IS NULL,'Belum',
          CONCAT('Sudah ', DATE_FORMAT(jb.jb_tgl_close,'%d-%m-%Y %T'))
        ) AS jb_close
      
      FROM bsmcabang.job_butuh_hdr AS jb
      
      LEFT JOIN bsmcabang.job_user AS u_peminta ON jb.jb_user = u_peminta.user_kode
      LEFT JOIN bsmcabang.job_user AS u_konfirga ON jb.jb_konfirga_nama = u_konfirga.user_kode
      LEFT JOIN bsmcabang.job_user AS u_teknisi ON jb.jb_teknisi = u_teknisi.user_kode
      LEFT JOIN bsmcabang.job_user AS u_teknisi2 ON jb.jb_teknisi2 = u_teknisi2.user_kode
      LEFT JOIN bsmcabang.job_user AS u_konfirtek ON jb.jb_konfirteknisi_nama = u_konfirtek.user_kode
      LEFT JOIN kencanaprint.tsparepart_pengajuan_hdr AS spp ON jb.jb_nomor = spp.spp_job
      
      WHERE 1=1
    `;

    const params = [];

    if (startDate && endDate) {
        sql += ` AND DATE(jb.jb_tanggal) BETWEEN ? AND ?`;
        params.push(startDate, endDate);
    }
    if (status && status.toUpperCase() !== 'ALL') {
        const statuses = status.toUpperCase().split(',');
        const statusValues = [];
        
        statuses.forEach(s => {
            if (s === 'BELUM' || s === 'BARU') statusValues.push(0); 
            if (s === 'PROSES') statusValues.push(2);                
            if (s === 'SELESAI') statusValues.push(1);               
        });
        
        console.log('Status input:', status); // Cek status yang masuk (misal: BARU,PROSES)
        console.log('Status Values yang dihasilkan:', statusValues); // Cek array yang dihasilkan (Harusnya: [0, 2])
        
        if (statusValues.length > 0) {const placeholders = statusValues.map(() => '?').join(', '); 
            sql += ` AND jb.jb_selesai IN (${placeholders})`;
            params.push(...statusValues);
        }
    }
    if (closeStatus && closeStatus.toUpperCase() !== 'ALL') {
        if (closeStatus.toUpperCase() === 'NOT CLOSE') {
            sql += ' AND jb.jb_tgl_close IS NULL';
        } else if (closeStatus.toUpperCase() === 'CLOSE') {
            sql += ' AND jb.jb_tgl_close IS NOT NULL';
        }
    }
    if (branch && branch.toUpperCase() !== 'ALL') {
        sql += ' AND jb.jb_cabang = ?';
        params.push(branch);
    }
    if (technician && technician.toUpperCase() !== 'ALL') {
        if (includeBantu === 'true') { 
            sql += ` AND (jb.jb_teknisi = ? OR jb.jb_teknisi2 = ?)`;
            params.push(technician, technician);
        } else {
            sql += ` AND jb.jb_teknisi = ?`;
            params.push(technician);
        }
    }
    if (search && search.trim() !== '') {
      const searchTerm = `%${search}%`;
      sql += ` AND (
        jb.jb_nomor LIKE ? OR 
        jb.jb_lokasi LIKE ? OR
        jb.jb_divisi LIKE ? OR
        jb.jb_ket LIKE ? 
      )`; 
      params.push(searchTerm, searchTerm, searchTerm, searchTerm); 
    }

    sql += ` ORDER BY jb.jb_tanggal DESC`;
    const [jobs] = await pool.query(sql, params);
    return jobs;
  }

async getJobById(id) {
    // 1. Ambil Header (Termasuk spp_nomor)
    const headerQuery = `
        SELECT 
            h.*, 
            IF(h.jb_pengajuan = 1, 'Ya', 'Tidak') as pengajuanBarang,
            j.spp_nomor,
            u.user_nama,
            IFNULL(t.user_nama, '') as nama_teknisi
        FROM bsmcabang.job_butuh_hdr h
        LEFT JOIN bsmcabang.job_user u ON u.user_kode = h.jb_user 
        LEFT JOIN bsmcabang.job_user t ON t.user_kode = h.jb_teknisi
        LEFT JOIN kencanaprint.tsparepart_pengajuan_hdr j ON j.spp_job = h.jb_nomor
        WHERE h.jb_nomor = ?;
    `;
    const [headerRows] = await pool.query(headerQuery, [id]);

    if (headerRows.length === 0) {
        const error = new Error('Job not found');
        error.statusCode = 404;
        throw error;
    }

    const header = headerRows[0];
    const sppNomor = header.spp_nomor; 

    // 2. Ambil Detail Barang Yang Dibutuhkan (jbd_nama, jbd_satuan, dll.)
    const jobDetailsQuery = `
        SELECT 
            jbd_nomor,
            jbd_nama as nama, 
            jbd_satuan as satuan, 
            jbd_qty as qty 
        FROM bsmcabang.job_butuh_dtl 
        WHERE jbd_nomor = ?;
    `;
    const [jobDetails] = await pool.query(jobDetailsQuery, [id]);
    return { 
        header, 
        job_details: jobDetails,
    };
}
  // =================================================================
  // FUNGSI UPDATE (GA & Teknisi)
  // =================================================================

  async updateJobByGa(id, data, userId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const sql = `
        UPDATE bsmcabang.job_butuh_hdr SET 
          jb_konfirga = ?, 
          jb_konfirga_nama = ?, 
          jb_tgl_konfirga = IF(jb_tgl_konfirga IS NULL AND ? = 1, NOW(), jb_tgl_konfirga),
          jb_teknisi = ?, 
          jb_jadwal1 = ?, 
          jb_jadwal2 = ?
        WHERE jb_nomor = ?
      `;
      const konfirGA = data.konfirGA ? 1 : 0;
      await connection.query(sql, [
        konfirGA,
        userId, // jb_konfirga_nama
        konfirGA, // Parameter untuk IF
        data.teknisiId,
        data.jadwal1 || null,
        data.jadwal2 || null,
        id
      ]);

      if (konfirGA) {
        const [jobRows] = await connection.query("SELECT jb_user, jb_lokasi, jb_ket FROM bsmcabang.job_butuh_hdr WHERE jb_nomor = ?", [id]);
        const jobInfo = jobRows[0];
        const notifText = `${jobInfo.jb_lokasi} ${jobInfo.jb_ket}. Dikonfirmasi & Dijadwalkan GA: ${userId}`;
        await this._sendNotification(connection, id, notifText, jobInfo.jb_user, 2);
        await this._sendNotification(connection, id, notifText, data.teknisiId, 2);
      }
      
      await connection.commit();
      return { success: true, message: 'Data GA berhasil diperbarui.' };
    } catch (error) {
      await connection.rollback();
      console.error("Error di updateJobByGa (service):", error);
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateJobByTechnician(id, data, userId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const tglSelesai = data.status === 1 ? new Date() : null;
      const headerSql = `
        UPDATE bsmcabang.job_butuh_hdr SET
          jb_konfirteknisi = ?, 
          jb_konfirteknisi_nama = ?, 
          jb_tgl_konfirteknisi = IF(jb_tgl_konfirteknisi IS NULL AND ? = 1, NOW(), jb_tgl_konfirteknisi),
          jb_pengajuan = ?, 
          jb_selesai = ?, 
          jb_ket_teknisi = ?, 
          jb_tgl_selesai = ?,
          jb_teknisi2 = ?
        WHERE jb_nomor = ?
      `;
      const konfirTeknisi = data.konfirTeknisi ? 1 : 0;
      await connection.query(headerSql, [
        konfirTeknisi,
        userId,
        konfirTeknisi,
        data.pengajuanSparepart ? 1 : 0,
        data.status,
        data.keteranganTeknisi,
        tglSelesai,
        data.teknisiBantuId ?? '', 
        id
      ]);

      const [jobRows] = await connection.query("SELECT jb_user, jb_konfirga_nama, jb_lokasi, jb_ket FROM bsmcabang.job_butuh_hdr WHERE jb_nomor = ?", [id]);
      const jobInfo = jobRows[0];
      const userPeminta = jobInfo.jb_user;
      const userGA = jobInfo.jb_konfirga_nama;

      if (data.status === 1) { // Selesai
        const notifText = `${jobInfo.jb_lokasi} ${jobInfo.jb_ket}. Selesai dikerjakan.`;
        await this._sendNotification(connection, id, notifText, userGA, 4);
        await this._sendNotification(connection, id, notifText, userPeminta, 4);
      } 
      else if (konfirTeknisi) { // Konfirmasi
        const notifText = `${jobInfo.jb_lokasi} ${jobInfo.jb_ket}. Dikonfirmasi Teknisi: ${userId}`;
        await this._sendNotification(connection, id, notifText, userGA, 3);
      }

      // [PERBAIKAN SPAREPART]
      if (data.pengajuanSparepart === true) {
        await connection.query('DELETE FROM bsmcabang.job_butuh_dtl WHERE jbd_nomor = ?', [id]);
        
        if (data.details && data.details.length > 0) {
          // [FIX] Ambil data yang benar dari Flutter (nama, satuan, qty)
          const detailValues = data.details.map(d => [id, d.nama, d.satuan, d.qty]); 
          
          // [FIX] Hapus 'jbd_kode' dari query INSERT
          await connection.query(
            'INSERT INTO bsmcabang.job_butuh_dtl (jbd_nomor, jbd_nama, jbd_satuan, jbd_qty) VALUES ?',
            [detailValues]
          );
        }
      }
      // [AKHIR PERBAIKAN SPAREPART]

      await connection.commit();
      return { success: true, message: 'Data Teknisi berhasil diperbarui.' };
    } catch (error) {
      await connection.rollback();
      console.error("Error di updateJobByTechnician (service):", error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  // =================================================================
  // FUNGSI NOTIFIKASI (Internal)
  // =================================================================

  async _sendNotification(connection, nomor, notifText, userKode, idTipe) {
    if (!userKode || userKode === '') return; 

    const notifSql = `
      INSERT INTO bsmcabang.job_notif 
        (nomor, notif, date_create, date_notif_exp, user, id) 
      VALUES 
        (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), ?, ?)
      ON DUPLICATE KEY UPDATE 
        date_create = NOW(),
        notif = VALUES(notif),
        date_notif = NULL,
        date_notif_exp = VALUES(date_notif_exp)
    `;
    
    try {
      await connection.query(notifSql, [nomor, notifText, userKode, idTipe]);
    } catch (error) {
      console.error(`Gagal mengirim notif ke user ${userKode}: ${error.message}`);
    }
  }

  // =================================================================
  // FUNGSI LOOKUP (Dropdown)
  // =================================================================
  
  async getTechnicians() {
    const sql = `
      SELECT user_kode, user_nama 
      FROM bsmcabang.job_user 
      WHERE user_aktif = 0 AND user_bag = 2 
      ORDER BY user_nama
    `;
    const [technicians] = await pool.query(sql);
    return technicians;
  }
}

module.exports = new JobService();