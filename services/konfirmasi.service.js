// services/konfirmasiService.js
const { pool } = require('../config/db.config');

class JobService {
    /**
     * Mengambil daftar pekerjaan dengan filter.
     */
    async getJobs(filters) {
        const { startDate, endDate, status, closeStatus, branch, technician } = filters;

        let sql = `
        SELECT 
          jb_nomor,
          DATE_FORMAT(jb_tanggal, '%d-%m-%Y %T') AS jb_tanggal,
          CONCAT(
            jb_cabang, ' ',
            IFNULL((SELECT user_nama FROM bsmcabang.job_user WHERE user_kode=jb_user LIMIT 1), '-')
          ) AS jb_cabang,
          jb_divisi,
          jb_bagian,
          jb_lokasi,
          jb_jenis,
          jb_ket,
          IF(jb_urgent=0,'Urgent','Top Urgent') AS jb_kepentingan,

          CONCAT(
            IF(jb_konfirga=0,'Belum ','Sudah '),
            IFNULL(DATE_FORMAT(jb_tgl_konfirga, '%d-%m-%Y %T'),' '), ' ',
            IFNULL((SELECT user_nama FROM bsmcabang.job_user WHERE user_kode=jb_konfirga_nama LIMIT 1), '')
          ) AS jb_konfir_ga,

          CONCAT(
            IFNULL(DATE_FORMAT(jb_jadwal1,'%d-%m-%Y'),' - '),
            ' s.d ',
            IFNULL(DATE_FORMAT(jb_jadwal2,'%d-%m-%Y'),' - ')
          ) AS jb_jadwal_pengerjaan,

          IFNULL((SELECT user_nama FROM bsmcabang.job_user WHERE user_kode=jb_teknisi LIMIT 1), '-') AS jb_teknisi,
          IFNULL((SELECT user_nama FROM bsmcabang.job_user WHERE user_kode=jb_teknisi2 LIMIT 1), '-') AS jb_teknisi_bantu,

          CONCAT(
            IF(jb_konfirteknisi=0,'Belum ','Sudah '),
            IFNULL(DATE_FORMAT(jb_tgl_konfirteknisi, '%d-%m-%Y %T'),' '), ' ',
            IFNULL((SELECT user_nama FROM bsmcabang.job_user WHERE user_kode=jb_konfirteknisi_nama LIMIT 1), '')
          ) AS jb_konfir_teknisi,

          IF(jb_pengajuan=0,'Tidak','Ya') AS jb_pengajuan_barang,

          IFNULL(
            (SELECT spp_nomor FROM kencanaprint.tsparepart_pengajuan_hdr WHERE spp_job=jb_nomor LIMIT 1),
            '-'
          ) AS jb_sparepart_gudang,

          jb_ket_teknisi AS jb_ket_proses,

          CONCAT(
            IF(jb_selesai=0,'Belum ',
               IF(jb_selesai=2,'Proses ','Sudah ')),
            IFNULL(DATE_FORMAT(jb_tgl_selesai,'%d-%m-%Y %T'),' ')
          ) AS jb_selesai,

          IF(jb_tgl_close IS NULL,'Belum',
            CONCAT('Sudah ', DATE_FORMAT(jb_tgl_close,'%d-%m-%Y %T'))
          ) AS jb_close

        FROM bsmcabang.job_butuh_hdr
        WHERE 1=1
        `;

        const params = [];

        // Filter tanggal
        if (startDate && endDate) {
            sql += ` AND DATE(jb_tanggal) BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        // Filter status
        if (status) {
            let statusValue = 0;
            if (status.toUpperCase() === 'PROSES') statusValue = 2;
            if (status.toUpperCase() === 'SELESAI') statusValue = 1;
            sql += ' AND jb_selesai = ?';
            params.push(statusValue);
        }

        // Filter close
        if (closeStatus) {
            if (closeStatus.toUpperCase() === 'NOT CLOSE') {
                sql += ' AND jb_tgl_close IS NULL';
            } else if (closeStatus.toUpperCase() === 'CLOSE') {
                sql += ' AND jb_tgl_close IS NOT NULL';
            }
        }

        // Filter cabang
        if (branch && branch.toUpperCase() !== 'ALL') {
            sql += ' AND jb_cabang = ?';
            params.push(branch);
        }

        // Filter teknisi
        if (technician && technician.toUpperCase() !== 'ALL') {
            sql += ' AND (jb_konfirga = 0 OR jb_teknisi = ?)';
            params.push(technician);
        }

        sql += ` ORDER BY jb_tanggal DESC`;

        const [jobs] = await pool.query(sql, params);
        return jobs;
    }

    async getJobById(id) {
        const headerQuery = `
            SELECT 
                h.*, 
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

        const detailsQuery = `
            SELECT 
                jbd_nama as nama, 
                jbd_satuan as satuan, 
                jbd_qty as qty 
            FROM bsmcabang.job_butuh_dtl 
            WHERE jbd_nomor = ?;
        `;
        const [details] = await pool.query(detailsQuery, [id]);

        return { header: headerRows[0], details };
    }

    async updateJobByGa(id, data, userId) {
        const sql = `
            UPDATE bsmcabang.job_butuh_hdr SET 
                jb_konfirga = ?, 
                jb_konfirga_nama = ?, 
                jb_tgl_konfirga = IFNULL(jb_tgl_konfirga, NOW()),
                jb_teknisi = ?, 
                jb_jadwal1 = ?, 
                jb_jadwal2 = ?
            WHERE jb_nomor = ?
        `;
        return pool.query(sql, [
            data.konfirGA ? 1 : 0,
            userId,
            data.teknisiId,
            data.jadwal1 || null,
            data.jadwal2 || null,
            id
        ]);
    }

    /**
     * Update dari sisi Teknisi
     */
    async updateJobByTechnician(id, data, userId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

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
                konfirTeknisi, // Parameter untuk IF jb_tgl_konfirteknisi
                data.pengajuanSparepart ? 1 : 0,
                data.status,
                data.keteranganTeknisi,
                data.status === 1 ? new Date() : null, // Set tgl selesai jika status=1
                
                // [PERBAIKAN DI SINI]
                // Gunakan '??' (nullish coalescing) BUKAN '||' (OR).
                // '|| null' mengubah string kosong ('') menjadi null.
                // '??' akan tetap mengirim string kosong ('') jika itu string kosong,
                // dan hanya mengubah 'null' atau 'undefined' menjadi string kosong.
                data.teknisiBantuId ?? '', 
                
                id
            ]);

            // [PERBAIKAN KEDUA] Logika 'delete details' Anda salah.
            // Anda tidak boleh menghapus detail jika 'pengajuanSparepart' false.
            // Anda HANYA boleh mengubah detail jika 'pengajuanSparepart' true.
            if (data.pengajuanSparepart === true) {
                // Hapus detail lama HANYA jika pengajuan dicentang
                await connection.query('DELETE FROM bsmcabang.job_butuh_dtl WHERE jbd_nomor = ?', [id]);

                // Masukkan detail baru
                if (data.details && data.details.length > 0) {
                    const detailValues = data.details.map(d => [id, d.nama, d.satuan, d.qty]);
                    await connection.query(
                        'INSERT INTO bsmcabang.job_butuh_dtl (jbd_nomor, jbd_nama, jbd_satuan, jbd_qty) VALUES ?',
                        [detailValues]
                    );
                }
            }
            // Jika 'pengajuanSparepart' false, kita tidak melakukan apa-apa pada tabel detail.

            await connection.commit();
            return { success: true, message: 'Data berhasil diperbarui.' }; // Kirim balasan sukses
        } catch (error) {
            await connection.rollback();
            throw error; // Lempar error agar controller bisa menangkap
        } finally {
            connection.release();
        }
    }
    
    /**
     * Mengambil daftar teknisi
     */
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
