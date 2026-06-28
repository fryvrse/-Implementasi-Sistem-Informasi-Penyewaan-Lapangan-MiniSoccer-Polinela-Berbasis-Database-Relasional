const serverless = require('serverless-http');
const { app, initDatabase } = require('../../server');

// Inisialisasi database sekali saat cold start (agar tidak diulang setiap request)
let isInitialized = false;

module.exports.handler = async (event, context) => {
    // Pastikan koneksi database & inisialisasi tabel hanya terjadi sekali
    if (!isInitialized) {
        await initDatabase();
        isInitialized = true;
    }
    
    // Teruskan request ke Express app
    return serverless(app)(event, context);
};
