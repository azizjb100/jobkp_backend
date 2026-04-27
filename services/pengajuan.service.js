// File: services/pengajuan.service.js

const { pool } = require('../config/db.config');

class PengajuanService {

    async getPengajuanList(filters) {
        console.log(`[PengajuanService] Mengambil daftar pengajuan. Filter:`, JSON.stringify(filters));
        const { startDate, endDate, status, search } = filters;

        let sql = `
            SELECT 
                min_nomor AS Nomor,
                CONCAT(
                    'Tanggal: ', DATE_FORMAT(min_tanggal, '%d-%m-%Y %T'), '\\r\\n',
                    'No.Job: ', IFNULL(min_job, '-'), ' ', IFNULL(DATE_FORMAT(j.jb_tanggal, '%d-%m-%Y %T'), ''), '\\r\\n',
                    'Keterangan: ', IFNULL(min_ket, ''), '\\r\\n',
                    'Status: ', IFNULL(min_status, '')
                ) AS Detail
            FROM kencanaprint.tgarmenminta_hdr h
            LEFT JOIN bsmcabang.job_butuh_hdr j ON j.jb_nomor = h.min_job
            WHERE DATE(h.min_tanggal) BETWEEN ? AND ?
        `;
        const params = [startDate, endDate];

        if (status && status.toUpperCase() !== 'ALL') {
            sql += ' AND h.min_status = ?';
            params.push(status);
        }

        if (search && search.trim() !== '') {
            sql += ` AND (
                h.min_nomor LIKE ? OR 
                h.min_job LIKE ? OR 
                h.min_ket LIKE ?
            )`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        sql += ' ORDER BY h.min_tanggal DESC';

        try {
            const [rows] = await pool.query(sql, params);
            console.log(`[PengajuanService] Berhasil mengambil ${rows.length} data pengajuan.`);
            return rows;
        } catch (error) {
            console.error(`[PengajuanService] Error pada getPengajuanList:`, error.message);
            throw error;
        }
    }

    async getPengajuanById(nomor) {
        console.log(`[PengajuanService] Mencari pengajuan detail. Nomor: ${nomor}`);
        const headerSql = `
            SELECT h.*, DAY(h.min_tanggal) AS hari, MONTH(h.min_tanggal) AS bulan, YEAR(h.min_tanggal) AS tahun
            FROM kencanaprint.tgarmenminta_hdr h
            WHERE h.min_nomor = ?
        `;
        
        try {
            const [headerRows] = await pool.query(headerSql, [nomor]);
            if (headerRows.length === 0) {
                console.warn(`[PengajuanService] Pengajuan ${nomor} tidak ditemukan.`);
                throw new Error('Nomor pengajuan tidak ditemukan.');
            }

            const detailSql = `
                SELECT d.sppd_kode, b.sp_nama, b.sp_satuan, d.sppd_qty
                FROM kencanaprint.tsparepart_pengajuan_dtl d
                LEFT JOIN kencanaprint.tsparepart b ON b.sp_kode = d.sppd_kode
                WHERE d.sppd_nomor = ?
            `;
            const [detailRows] = await pool.query(detailSql, [nomor]);
            
            console.log(`[PengajuanService] Pengajuan ${nomor} ditemukan dengan ${detailRows.length} item detail.`);
            return { header: headerRows[0], details: detailRows };
        } catch (error) {
            console.error(`[PengajuanService] Error pada getPengajuanById:`, error.message);
            throw error;
        }
    }

    async _generateNomor(connection, transactionDate) {
        const tahun = transactionDate.getFullYear();
        const prefix = `SPP-${tahun}`;
        const searchPattern = `${prefix}-%`;
        
        console.log(`[PengajuanService] Menghasilkan nomor baru untuk tahun ${tahun}...`);
        
        const sql = `
            SELECT IFNULL(MAX(CAST(SUBSTRING_INDEX(min_nomor, '-', -1) AS UNSIGNED)), 0) AS jumlah 
            FROM kencanaprint.tgarmenminta_hdr WHERE min_nomor LIKE ?
        `;
        
        const [rows] = await connection.query(sql, [searchPattern]);
        const nextSequence = Number(rows[0].jumlah || 0) + 1;
        const formattedSequence = String(nextSequence).padStart(5, '0');
        const finalNomor = `${prefix}-${formattedSequence}`;
        
        console.log(`[PengajuanService] Nomor baru digenerate: ${finalNomor}`);
        return finalNomor;
    }

    async savePengajuan(data, userKode) {
        const { header, details } = data;
        const isNew = !header.min_nomor; 
        console.log(`[PengajuanService] Menyimpan pengajuan. Mode: ${isNew ? 'INSERT' : 'UPDATE'}. User: ${userKode}`);

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            let nomorPengajuan = header.min_nomor;
            const transactionDate = new Date();

            if (isNew) {
                nomorPengajuan = await this._generateNomor(connection, transactionDate); 
                const insertHeaderSql = `
                    INSERT INTO kencanaprint.tgarmenminta_hdr 
                        (min_nomor, min_tanggal, min_job, min_ket, user_create, date_create, min_status)
                    VALUES (?, ?, ?, ?, ?, NOW(), 'BELUM')
                `;
                await connection.query(insertHeaderSql, [
                    nomorPengajuan, transactionDate, header.min_job, header.min_ket, userKode
                ]);
                console.log(`[PengajuanService] Header baru berhasil disimpan: ${nomorPengajuan}`);
            } else {
                const updateHeaderSql = `
                    UPDATE kencanaprint.tgarmenminta_hdr SET
                        min_ket = ?, user_modified = ?, date_modified = NOW()
                    WHERE min_nomor = ?
                `;
                await connection.query(updateHeaderSql, [header.min_ket, userKode, nomorPengajuan]);
                console.log(`[PengajuanService] Header berhasil diperbarui: ${nomorPengajuan}`);
            }
            
            // Hapus detail lama & simpan detail baru
            console.log(`[PengajuanService] Memperbarui detail item untuk ${nomorPengajuan}`);
            await connection.query('DELETE FROM kencanaprint.tsparepart_pengajuan_dtl WHERE sppd_nomor = ?', [nomorPengajuan]);

            if (details && details.length > 0) {
                const detailValues = details.map(d => [nomorPengajuan, d.sppd_kode, d.sppd_qty]);
                const insertDetailSql = 'INSERT INTO kencanaprint.tsparepart_pengajuan_dtl (sppd_nomor, sppd_kode, sppd_qty) VALUES ?';
                await connection.query(insertDetailSql, [detailValues]);
                console.log(`[PengajuanService] Berhasil menyimpan ${details.length} item detail.`);
            }

            await connection.commit();
            console.log(`[PengajuanService] Transaksi berhasil di-commit.`);
            return { success: true, message: 'Data berhasil disimpan', nomor: nomorPengajuan };

        } catch (error) {
            await connection.rollback();
            console.error(`[PengajuanService] Transaksi di-rollback! Error:`, error.message);
            throw error;
        } finally {
            connection.release();
        }
    }

    async deletePengajuan(nomor) {
        console.log(`[PengajuanService] Mencoba menghapus pengajuan: ${nomor}`);
        const [rows] = await pool.query('SELECT min_status FROM kencanaprint.tgarmenminta_hdr WHERE min_nomor = ?', [nomor]);
        
        if (rows.length === 0) {
            console.warn(`[PengajuanService] Hapus gagal: Nomor ${nomor} tidak ada.`);
            throw new Error("Nomor tidak ditemukan.");
        }
        
        const status = rows[0].min_status ? rows[0].min_status.toUpperCase() : "BELUM";
        if (status === 'PROSES' || status === 'CLOSE') {
            console.warn(`[PengajuanService] Hapus ditolak: Pengajuan ${nomor} berstatus ${status}.`);
            throw new Error(`Tidak bisa dihapus. Status sudah ${status}.`);
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            await connection.query('DELETE FROM kencanaprint.tsparepart_pengajuan_dtl WHERE sppd_nomor = ?', [nomor]);
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