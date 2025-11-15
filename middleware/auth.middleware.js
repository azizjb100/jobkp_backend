const jwt = require('jsonwebtoken');
const { pool } = require('../config/db.config');

const JWT_SECRET = process.env.JWT_SECRET || 's+qG0PB3JQB/jHABdHfVejMBUm9zJtE4Mb1GHMAYXsw=';

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Token tidak disediakan.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // [PERBAIKAN] Ambil SEMUA data role, terutama USER_IT
        const sql = `
            SELECT USER_KODE, USER_NAMA, USER_BAG, USER_IT, USER_MANAGER, USER_BRG
            FROM job_user
            WHERE USER_KODE = ?
            LIMIT 1
        `;

        const [users] = await pool.execute(sql, [decoded.userId]);

        if (!users || users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User tidak valid (sudah terhapus).',
            });
        }

        // [PERBAIKAN] Simpan SEMUA data role ke req.user
        req.user = {
            userId: users[0].USER_KODE,
            nama: users[0].USER_NAMA,
            role: users[0].USER_BAG, // Ini 'user_bag' (zlog)
            it: users[0].USER_IT,     // Ini 'user_it'
            manager: users[0].USER_MANAGER,
            brg: users[0].USER_BRG
        };

        next(); // Lanjutkan ke controller
    } catch (error) {
        console.error('❌ Auth error:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Token tidak valid atau kedaluwarsa.',
        });
    }
};

module.exports = authMiddleware;