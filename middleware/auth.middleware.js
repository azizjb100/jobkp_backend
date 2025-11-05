// middleware/auth.middleware.js
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
        console.log('✅ Token decoded:', decoded);

        // Pastikan kolom sesuai dengan DB (huruf besar semuanya)
        const sql = `
            SELECT USER_KODE, USER_NAMA, USER_BAG
            FROM job_user
            WHERE USER_KODE = ?
            LIMIT 1
        `;

        const [users] = await pool.execute(sql, [decoded.userId]);
        console.log('🔍 Query result:', users);

        if (!users || users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User tidak valid atau belum terautentikasi (DB kosong).',
            });
        }

        req.user = {
            userId: users[0].USER_KODE,
            nama: users[0].USER_NAMA,
            role: users[0].USER_BAG,
        };

        next();
    } catch (error) {
        console.error('❌ Auth error:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Token tidak valid atau error saat verifikasi.',
        });
    }
};

module.exports = authMiddleware;
