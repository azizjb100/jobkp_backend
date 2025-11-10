// File: services/pengajuan.service.js (VERSI FINAL YANG DIPERBAIKI)

const { pool } = require('../config/db.config');

class PengajuanService {

    async getPengajuanList(filters) {
        // [PERBAIKAN 1] Ambil 'search' dari filters
        const { startDate, endDate, status, search } = filters;

        let sql = `
            SELECT 
                spp_nomor AS Nomor,
                CONCAT(
                    'Tanggal: ', DATE_FORMAT(spp_tanggal, '%d-%m-%Y %T'), '\\r\\n',
                    'No.Job: ', IFNULL(spp_job, '-'), ' ', IFNULL(DATE_FORMAT(j.jb_tanggal, '%d-%m-%Y %T'), ''), '\\r\\n',
                    'Keterangan: ', IFNULL(spp_ket, ''), '\\r\\n',
                    'Status: ', IFNULL(spp_status, '')
                ) AS Detail
            FROM kencanaprint.tsparepart_pengajuan_hdr h
            LEFT JOIN bsmcabang.job_butuh_hdr j ON j.jb_nomor = h.spp_job
            WHERE DATE(h.spp_tanggal) BETWEEN ? AND ?
        `;
        const params = [startDate, endDate];

        if (status && status.toUpperCase() !== 'ALL') {
            sql += ' AND h.spp_status = ?';
            params.push(status);
        }

        // [PERBAIKAN 2] Tambahkan logika filter pencarian
        if (search && search.trim() !== '') {
            sql += ` AND (
                h.spp_nomor LIKE ? OR 
                h.spp_job LIKE ? OR 
                h.spp_ket LIKE ?
            )`;
            // Tambahkan 3 parameter 'LIKE' ke array params
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        sql += ' ORDER BY h.spp_tanggal DESC';

        const [rows] = await pool.query(sql, params);
        return rows;
    }


    async getPengajuanById(nomor) {
        // ... (Fungsi ini sudah benar, tidak diubah)
        const headerSql = `
            SELECT h.*, DAY(h.spp_tanggal) AS hari, MONTH(h.spp_tanggal) AS bulan, YEAR(h.spp_tanggal) AS tahun
            FROM kencanaprint.tsparepart_pengajuan_hdr h
            WHERE h.spp_nomor = ?
        `;
        const [headerRows] = await pool.query(headerSql, [nomor]);
        if (headerRows.length === 0) {
            throw new Error('Nomor pengajuan tidak ditemukan.');
        }
        const detailSql = `
            SELECT d.sppd_kode, b.sp_nama, b.sp_satuan, d.sppd_qty
            FROM kencanaprint.tsparepart_pengajuan_dtl d
            LEFT JOIN kencanaprint.tsparepart b ON b.sp_kode = d.sppd_kode
            WHERE d.sppd_nomor = ?
        `;
        const [detailRows] = await pool.query(detailSql, [nomor]);
        return { header: headerRows[0], details: detailRows };
    }

    /**
     * Fungsi internal untuk generate nomor baru (sesuai getnomor)
     */
    async _generateNomor(connection, transactionDate) {
        if (!connection) {
             throw new Error("_generateNomor harus dipanggil dari dalam transaction.");
        }
        
        // [FIX] Ambil tahun dari tanggal transaksi
        const tahun = transactionDate.getFullYear();
        const prefix = `SPP-${tahun}`;
        const searchPattern = `${prefix}-%`;
        
        const sql = `
            SELECT IFNULL(MAX(CAST(SUBSTRING_INDEX(spp_nomor, '-', -1) AS UNSIGNED)), 0) AS jumlah 
            FROM kencanaprint.tsparepart_pengajuan_hdr WHERE spp_nomor LIKE ?
        `;
        
        const [rows] = await connection.query(sql, [searchPattern]);
        
        // [PERBAIKAN]
        // Paksa 'jumlah' (yang mungkin string) menjadi Angka (Number) sebelum ditambah 1
        const nextSequence = Number(rows[0].jumlah || 0) + 1;
        
        const formattedSequence = String(nextSequence).padStart(5, '0');
        return `${prefix}-${formattedSequence}`;
    }

    /**
     * Fungsi yang dipanggil "SAAT SAVE"
     * (Logika ini sudah benar, menggunakan tanggal server)
     */
    async savePengajuan(data, userKode) {
        const { header, details } = data;
        const isNew = !header.spp_nomor; 

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            let nomorPengajuan = header.spp_nomor;
            
            // Tentukan tanggal transaksi SEKARANG di server
            const transactionDate = new Date();

            if (isNew) {
                // Kirim tanggal transaksi ke generator nomor
                nomorPengajuan = await this._generateNomor(connection, transactionDate); 
                
                const insertHeaderSql = `
                    INSERT INTO kencanaprint.tsparepart_pengajuan_hdr 
                        (spp_nomor, spp_tanggal, spp_job, spp_ket, user_create, date_create, spp_status)
                    VALUES (?, ?, ?, ?, ?, NOW(), 'BELUM')
                `;
                await connection.query(insertHeaderSql, [
                    nomorPengajuan, 
                    transactionDate, // Gunakan tanggal server
                    header.spp_job, 
                    header.spp_ket, 
                    userKode
                ]);
            } else {
                // Logika Update
                nomorPengajuan = header.spp_nomor;
                const updateHeaderSql = `
                    UPDATE kencanaprint.tsparepart_pengajuan_hdr SET
                        spp_ket = ?, user_modified = ?, date_modified = NOW()
                    WHERE spp_nomor = ?
                `;
                await connection.query(updateHeaderSql, [header.spp_ket, userKode, nomorPengajuan]);
            }
            
            // Hapus detail lama & simpan detail baru
            await connection.query('DELETE FROM kencanaprint.tsparepart_pengajuan_dtl WHERE sppd_nomor = ?', [nomorPengajuan]);

            if (details && details.length > 0) {
                const detailValues = details.map(d => [nomorPengajuan, d.sppd_kode, d.sppd_qty]);
                const insertDetailSql = 'INSERT INTO kencanaprint.tsparepart_pengajuan_dtl (sppd_nomor, sppd_kode, sppd_qty) VALUES ?';
                await connection.query(insertDetailSql, [detailValues]);
            }

            await connection.commit();
            return { success: true, message: 'Data berhasil disimpan', nomor: nomorPengajuan };

        } catch (error) {
            await connection.rollback();
            console.error("Error di savePengajuan service:", error);
            throw error;
        } finally {
            connection.release();
        }
    }

    async deletePengajuan(nomor) {
        // ... (Fungsi ini sudah benar, tidak diubah)
        const [rows] = await pool.query('SELECT spp_status FROM kencanaprint.tsparepart_pengajuan_hdr WHERE spp_nomor = ?', [nomor]);
        if (rows.length === 0) throw new Error("Nomor tidak ditemukan.");
        
        const status = rows[0].spp_status ? rows[0].spp_status.toUpperCase() : "BELUM";
        if (status === 'PROSES' || status === 'CLOSE') {
            throw new Error(`Tidak bisa dihapus. Status sudah ${status}.`);
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            await connection.query('DELETE FROM kencanaprint.tsparepart_pengajuan_dtl WHERE sppd_nomor = ?', [nomor]);
            await connection.query('DELETE FROM kencanaprint.tsparepart_pengajuan_hdr WHERE spp_nomor = ?', [nomor]);
            await connection.commit();
            return { success: true, message: 'Berhasil dihapus.' };
        } catch (error) {
            await connection.rollback();
            console.error("Error di deletePengajuan service:", error);
            throw error;
        } finally {
            connection.release();
        }
    }

    async getJobDetailsForPengajuan(jobNomor) {
        // ... (Fungsi ini sudah benar, tidak diubah)
        const sql = `
            SELECT 
                jbd_kode,
                jbd_nama, 
                jbd_satuan, 
                jbd_qty
            FROM bsmcabang.job_butuh_dtl
            WHERE jbd_nomor = ?
        `;
        const [rows] = await pool.query(sql, [jobNomor]);
        return rows; 
    }

    async getAvailableJobs() {
        const sql = `
            SELECT jb_nomor AS Nomor,
                CONCAT('Tanggal: ', DATE_FORMAT(jb_tanggal, '%d-%m-%Y %T'), '\\r\\n',
                       'User: ', jb_cabang, ' ', IFNULL((SELECT user_nama FROM bsmcabang.job_user WHERE user_kode=jb_user), '-'), '\\r\\n',
                       'Kerusakan: ', jb_lokasi, '\\r\\n',
                       'Keterangan: ', IFNULL(jb_ket, '-') 
                       ) AS Detail
            FROM bsmcabang.job_butuh_hdr
            WHERE jb_konfirteknisi = 1 AND jb_pengajuan = 1 AND jb_selesai <> 1 AND jb_tgl_close IS NULL
            ORDER BY jb_tanggal DESC
        `;
        const [rows] = await pool.query(sql);
        return rows;
    }

    async getAvailableSpareparts() {
        // ... (Fungsi ini sudah benar, tidak diubah)
        const sql = `
            SELECT sp_kode, sp_nama, sp_satuan,
                IFNULL((SELECT SUM(m.mst_stok_in - m.mst_stok_out) 
                        FROM kencanaprint.tmasterstok_sparepart m 
                        WHERE m.mst_aktif="Y" AND m.mst_brg_kode=sp_kode), 0) AS stok
            FROM kencanaprint.tsparepart ORDER BY sp_nama
        `;
        const [rows] = await pool.query(sql);
        return rows;
    }
}

module.exports = new PengajuanService();