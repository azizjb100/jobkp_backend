// File: services/pengajuan.service.js

const { pool } = require('../config/db.config');

class PengajuanService {

    async getPengajuanList(filters) {
        console.log(`[PengajuanService] Mengambil daftar pengajuan. Filter:`, JSON.stringify(filters));
        const { startDate, endDate, status, search } = filters;

        let sql = `
            SELECT 
                h.min_nomor AS Nomor,
                CONCAT(
                    'Tanggal: ', DATE_FORMAT(h.min_tanggal, '%d-%m-%Y %T'), '\\r\\n',
                    'No.Job: ', IFNULL(h.min_spk_nomor, '-'), ' ', IFNULL(DATE_FORMAT(j.jb_tanggal, '%d-%m-%Y %T'), ''), '\\r\\n',
                    'Keterangan: ', IFNULL(h.min_ket, ''), '\\r\\n',
                    'Status: ', CASE 
                        WHEN h.min_close = 1 THEN 'SUDAH'
                        WHEN h.min_close = 2 THEN 'PROSES'
                        ELSE 'BELUM'
                    END
                ) AS Detail
            FROM kencanaprint.tgarmenminta_hdr h
            LEFT JOIN bsmcabang.job_butuh_hdr j ON j.jb_nomor = h.min_spk_nomor
            WHERE DATE(h.min_tanggal) BETWEEN ? AND ?
        `;
        const params = [startDate, endDate];

        if (status && status.toUpperCase() !== 'ALL') {
            // Mapping filter status dari frontend ke nilai database
            let statusVal = 0;
            if (status.toUpperCase() === 'SUDAH') statusVal = 1;
            if (status.toUpperCase() === 'PROSES') statusVal = 2;
            
            sql += ' AND h.min_close = ?';
            params.push(statusVal);
        }

        if (search && search.trim() !== '') {
            sql += ` AND (h.min_nomor LIKE ? OR h.min_spk_nomor LIKE ? OR h.min_ket LIKE ?)`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        sql += ' ORDER BY h.min_tanggal DESC';

        try {
            const [rows] = await pool.query(sql, params);
            return rows;
        } catch (error) {
            console.error(`[PengajuanService] Error getPengajuanList:`, error.message);
            throw error;
        }
    }

    /**
     * Get By ID dengan ALIAS agar sesuai dengan Model Flutter (spp_nomor, dll)
     */
    async getPengajuanById(nomor) {
        console.log(`[PengajuanService] Mencari pengajuan. Nomor: ${nomor}`);
        
        // Gunakan ALIAS (AS) agar sinkron dengan PengajuanHeader.fromJson di Flutter
        const headerSql = `
            SELECT 
                min_nomor AS spp_nomor, 
                min_tanggal AS spp_tanggal, 
                min_spk_nomor AS spp_job, 
                min_ket AS spp_ket,
                CASE 
                    WHEN min_close = 1 THEN 'SUDAH'
                    WHEN min_close = 2 THEN 'PROSES'
                    ELSE 'BELUM'
                END AS spp_status
            FROM kencanaprint.tgarmenminta_hdr
            WHERE min_nomor = ?
        `;
        
        try {
            const [headerRows] = await pool.query(headerSql, [nomor]);
            if (headerRows.length === 0) throw new Error('Nomor pengajuan tidak ditemukan.');

            const detailSql = `
                SELECT 
                    d.sppd_kode, 
                    b.brg_nama, 
                    b.brg_satuan, 
                    d.sppd_qty
                FROM kencanaprint.tgarmenminta_dtl d
                LEFT JOIN kencanaprint.tgarmen_brg b ON b.brg_kode = d.sppd_kode
                WHERE d.sppd_nomor = ?
            `;
            const [detailRows] = await pool.query(detailSql, [nomor]);
            
            return { header: headerRows[0], details: detailRows };
        } catch (error) {
            console.error(`[PengajuanService] Error getPengajuanById:`, error.message);
            throw error;
        }
    }

    async _generateNomor(connection, transactionDate) {
        const tahun = transactionDate.getFullYear();
        const prefix = `SPP-${tahun}`;
        const searchPattern = `${prefix}-%`;
        
        const sql = `
            SELECT IFNULL(MAX(CAST(SUBSTRING_INDEX(min_nomor, '-', -1) AS UNSIGNED)), 0) AS jumlah 
            FROM kencanaprint.tgarmenminta_hdr WHERE min_nomor LIKE ?
        `;
        
        const [rows] = await connection.query(sql, [searchPattern]);
        const nextSequence = Number(rows[0].jumlah || 0) + 1;
        return `${prefix}-${String(nextSequence).padStart(5, '0')}`;
    }

    async savePengajuan(data, userKode) {
        const { header, details } = data;
        const isNew = !header.spp_nomor; 
        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            let nomorPengajuan = header.spp_nomor;
            const transactionDate = new Date();

            if (isNew) {
                nomorPengajuan = await this._generateNomor(connection, transactionDate); 
                const insertHeaderSql = `
                    INSERT INTO kencanaprint.tgarmenminta_hdr 
                        (min_nomor, min_tanggal, min_spk_nomor, min_ket, user_create, date_create, min_close)
                    VALUES (?, ?, ?, ?, ?, NOW(), 0)
                `;
                await connection.query(insertHeaderSql, [
                    nomorPengajuan, transactionDate, header.spp_job, header.spp_ket, userKode
                ]);
            } else {
                const updateHeaderSql = `
                    UPDATE kencanaprint.tgarmenminta_hdr SET
                        min_ket = ?, user_modified = ?, date_modified = NOW()
                    WHERE min_nomor = ?
                `;
                await connection.query(updateHeaderSql, [header.spp_ket, userKode, nomorPengajuan]);
            }
            
            await connection.query('DELETE FROM kencanaprint.tgarmenminta_dtl WHERE sppd_nomor = ?', [nomorPengajuan]);

            if (details && details.length > 0) {
                const detailValues = details.map(d => [nomorPengajuan, d.sppd_kode, d.sppd_qty]);
                await connection.query(
                    'INSERT INTO kencanaprint.tgarmenminta_dtl (sppd_nomor, sppd_kode, sppd_qty) VALUES ?',
                    [detailValues]
                );
            }

            await connection.commit();
            return { success: true, message: 'Data berhasil disimpan', nomor: nomorPengajuan };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    async deletePengajuan(nomor) {
        console.log(`[PengajuanService] Mencoba menghapus pengajuan: ${nomor}`);
        const [rows] = await pool.query('SELECT min_close FROM kencanaprint.tgarmenminta_hdr WHERE min_nomor = ?', [nomor]);
        
        if (rows.length === 0) {
            console.warn(`[PengajuanService] Hapus gagal: Nomor ${nomor} tidak ada.`);
            throw new Error("Nomor tidak ditemukan.");
        }
        
        const status = rows[0].min_close ? rows[0].min_close.toUpperCase() : "BELUM";
        if (status === 'PROSES' || status === 'CLOSE') {
            console.warn(`[PengajuanService] Hapus ditolak: Pengajuan ${nomor} berstatus ${status}.`);
            throw new Error(`Tidak bisa dihapus. Status sudah ${status}.`);
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            await connection.query('DELETE FROM kencanaprint.tgarmenminta_dtl WHERE sppd_nomor = ?', [nomor]);
            await connection.query('DELETE FROM kencanaprint.tgarmenminta_hdr WHERE min_nomor = ?', [nomor]);
            await connection.commit();
            console.log(`[PengajuanService] Pengajuan ${nomor} berhasil dihapus.`);
            return { success: true, message: 'Berhasil dihapus.' };
        } catch (error) {
            await connection.rollback();
            console.error(`[PengajuanService] Error saat menghapus ${nomor}:`, error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    async getJobDetailsForPengajuan(jobNomor) {
        console.log(`[PengajuanService] Mengambil rincian kebutuhan dari Job: ${jobNomor}`);
        const sql = `
            SELECT jbd_kode, jbd_nama, jbd_satuan, jbd_qty
            FROM bsmcabang.job_butuh_dtl
            WHERE jbd_nomor = ?
        `;
        try {
            const [rows] = await pool.query(sql, [jobNomor]);
            return rows; 
        } catch (error) {
            console.error(`[PengajuanService] Error getJobDetailsForPengajuan:`, error.message);
            throw error;
        }
    }

    async getAvailableJobs() {
        console.log(`[PengajuanService] Mengambil daftar Job yang siap untuk diajukan sparepart...`);
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
        console.log(`[PengajuanService] Fetching master sparepart & stok...`);
        const sql = `
            SELECT brg_kode, brg_nama, brg_satuan,
                IFNULL((SELECT SUM(m.mst_stok_in - m.mst_stok_out) 
                        FROM kencanaprint.tmasterstok_sparepart m 
                        WHERE m.mst_aktif="Y" AND m.mst_brg_kode=brg_kode), 0) AS stok
            FROM kencanaprint.tsparepart ORDER BY brg_nama
        `;
        const [rows] = await pool.query(sql);
        return rows;
    }
}

module.exports = new PengajuanService();