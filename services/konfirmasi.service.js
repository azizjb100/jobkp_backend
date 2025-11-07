// services/konfirmasiService.js
const { pool } = require('../config/db.config');

class JobService {
    /**
     * Mengambil daftar pekerjaan dengan filter.
     */
    async getJobs(filters) {
        const { startDate, endDate, status, closeStatus, branch, technician, search } = filters;

        // [PERBAIKAN] Query utama sekarang menggunakan JOIN
        let sql = `
        SELECT 
          jb.jb_nomor,
          DATE_FORMAT(jb.jb_tanggal, '%d-%m-%Y %T') AS jb_tanggal,
          CONCAT(
            jb.jb_cabang, ' ',
            IFNULL(u_peminta.user_nama, '-')
          ) AS jb_cabang,
          jb.jb_divisi,
          jb.jb_bagian,
          jb.jb_lokasi,
          jb.jb_jenis,
          jb.jb_ket,
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
          jb.jb_ket_teknisi AS jb_ket_proses,
          CONCAT(
            IF(jb.jb_selesai=0,'Belum ',
               IF(jb.jb_selesai=2,'Proses ','Sudah ')),
            IFNULL(DATE_FORMAT(jb.jb_tgl_selesai,'%d-%m-%Y %T'),' ')
          ) AS jb_selesai,
          IF(jb.jb_tgl_close IS NULL,'Belum',
            CONCAT('Sudah ', DATE_FORMAT(jb.jb_tgl_close,'%d-%m-%Y %T'))
          ) AS jb_close
        
        FROM bsmcabang.job_butuh_hdr AS jb
        
        /* [PERBAIKAN] Mengganti semua subquery dengan LEFT JOIN */
        LEFT JOIN bsmcabang.job_user AS u_peminta ON jb.jb_user = u_peminta.user_kode
        LEFT JOIN bsmcabang.job_user AS u_konfirga ON jb.jb_konfirga_nama = u_konfirga.user_kode
        LEFT JOIN bsmcabang.job_user AS u_teknisi ON jb.jb_teknisi = u_teknisi.user_kode
        LEFT JOIN bsmcabang.job_user AS u_teknisi2 ON jb.jb_teknisi2 = u_teknisi2.user_kode
        LEFT JOIN bsmcabang.job_user AS u_konfirtek ON jb.jb_konfirteknisi_nama = u_konfirtek.user_kode
        LEFT JOIN kencanaprint.tsparepart_pengajuan_hdr AS spp ON jb.jb_nomor = spp.spp_job
        
        WHERE 1=1
        `;

        const params = [];

        // Filter tanggal
        if (startDate && endDate) {
            sql += ` AND DATE(jb.jb_tanggal) BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        // Filter status
        if (status && status.toUpperCase() !== 'ALL') {
            let statusValue = 0;
            if (status.toUpperCase() === 'PROSES') statusValue = 2;
            if (status.toUpperCase() === 'SELESAI') statusValue = 1;
            sql += ' AND jb.jb_selesai = ?';
            params.push(statusValue);
        }

        // Filter close
        if (closeStatus && closeStatus.toUpperCase() !== 'ALL') {
            if (closeStatus.toUpperCase() === 'NOT CLOSE') {
                sql += ' AND jb.jb_tgl_close IS NULL';
            } else if (closeStatus.toUpperCase() === 'CLOSE') {
                sql += ' AND jb.jb_tgl_close IS NOT NULL';
            }
        }

        // Filter cabang
        if (branch && branch.toUpperCase() !== 'ALL') {
            sql += ' AND jb.jb_cabang = ?';
            params.push(branch);
        }

        // Filter teknisi
        if (technician && technician.toUpperCase() !== 'ALL') {
            // [PERBAIKAN] Mengganti logika OR yang salah menjadi filter teknisi yang benar
            sql += ' AND jb.jb_teknisi = ?';
            params.push(technician);
        }
        
        // Filter search
        if (search && search.trim() !== '') {
          sql += ` AND (
            jb.jb_nomor LIKE ? OR 
            jb.jb_lokasi LIKE ? OR
            jb.jb_divisi LIKE ? OR
            jb.jb_ket LIKE ?
          )`;
          params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        sql += ` ORDER BY jb.jb_tanggal DESC`;

        const [jobs] = await pool.query(sql, params);
        return jobs;
    }

    async getJobById(id) {
        // ... (Fungsi ini sudah benar)
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
        // ... (Fungsi ini sudah benar)
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
        return pool.query(sql, [
            konfirGA,
            userId,
            konfirGA, // Parameter untuk IF
            data.teknisiId,
            data.jadwal1 || null,
            data.jadwal2 || null,
            id
        ]);
    }

    async updateJobByTechnician(id, data, userId) {
        // ... (Fungsi ini sudah benar)
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
                konfirTeknisi,
                data.pengajuanSparepart ? 1 : 0,
                data.status,
                data.keteranganTeknisi,
                data.status === 1 ? new Date() : null,
                data.teknisiBantuId ?? '',
                id
            ]);

            if (data.pengajuanSparepart === true) {
                await connection.query('DELETE FROM bsmcabang.job_butuh_dtl WHERE jbd_nomor = ?', [id]);

                if (data.details && data.details.length > 0) {
                    const detailValues = data.details.map(d => [id, d.nama, d.satuan, d.qty]);
                    await connection.query(
                        'INSERT INTO bsmcabang.job_butuh_dtl (jbd_nomor, jbd_nama, jbd_satuan, jbd_qty) VALUES ?',
                        [detailValues]
                    );
                }
            }

            await connection.commit();
            return { success: true, message: 'Data berhasil diperbarui.' };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async getTechnicians() {
        // ... (Fungsi ini sudah benar)
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
