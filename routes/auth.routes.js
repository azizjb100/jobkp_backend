// routes/auth.routes.js

const express = require('express');
const router = express.Router();

// Pastikan path ini benar menuju file controller Anda
const authController = require('../controllers/auth.controller');

// Pastikan nama fungsinya adalah 'login', bukan 'loginUser' atau lainnya
router.post('/login', authController.login);

module.exports = router;





// const express = require('express');
// const router = express.Router();
// const authController = require('../controllers/auth.controller');

// // Rute untuk POST /api/auth/login
// router.post('/login', authController.login);
// router.get('/credentials', authController.getCredentials);

// module.exports = router;
