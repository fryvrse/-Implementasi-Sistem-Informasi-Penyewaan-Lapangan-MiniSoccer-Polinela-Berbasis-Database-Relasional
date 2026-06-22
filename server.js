const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const { initDatabase, dbRun, dbGet, dbAll } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
    secret: 'polinela-minisoccer-super-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 24 Hours
    }
}));

// Route protection middlewares
const requireLogin = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
    }
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Akses ditolak. Endpoint khusus Administrator.' });
    }
    next();
};

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

// Register
app.post('/api/auth/register', async (req, res) => {
    const { username, password, fullName, userType, identityNumber, phone } = req.body;

    if (!username || !password || !fullName || !userType || !phone) {
        return res.status(400).json({ error: 'Semua field wajib diisi kecuali Nomor Identitas.' });
    }

    if (!['mahasiswa', 'dosen', 'umum'].includes(userType)) {
        return res.status(400).json({ error: 'Tipe pengguna tidak valid.' });
    }

    try {
        // Check if username already exists
        const existingUser = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(400).json({ error: 'Username sudah digunakan.' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert user
        await dbRun(
            `INSERT INTO users (username, password_hash, full_name, user_type, identity_number, phone)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [username, passwordHash, fullName, userType, identityNumber || null, phone]
        );

        res.status(201).json({ message: 'Registrasi berhasil. Silakan login.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat registrasi.' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    try {
        const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) {
            return res.status(400).json({ error: 'Username atau password salah.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Username atau password salah.' });
        }

        // Store user in session (exclude password hash)
        req.session.user = {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            user_type: user.user_type,
            identity_number: user.identity_number,
            phone: user.phone
        };

        res.json({ message: 'Login berhasil.', user: req.session.user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Terjadi kesalahan pada server saat login.' });
    }
});

// Get session details
app.get('/api/auth/me', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Gagal logout.' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Logout berhasil.' });
    });
});


// ==========================================
// 2. FIELD MANAGEMENT ENDPOINTS
// ==========================================

// Get all fields
app.get('/api/fields', async (req, res) => {
    try {
        const fields = await dbAll('SELECT * FROM fields ORDER BY name ASC');
        res.json(fields);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal mengambil data lapangan.' });
    }
});

// Add Field (Admin only)
app.post('/api/fields', requireAdmin, async (req, res) => {
    const { name, type, pricePerHour, description, status } = req.body;

    if (!name || !type || !pricePerHour) {
        return res.status(400).json({ error: 'Nama, tipe, dan harga per jam wajib diisi.' });
    }

    try {
        const existingField = await dbGet('SELECT id FROM fields WHERE name = ?', [name]);
        if (existingField) {
            return res.status(400).json({ error: 'Nama lapangan sudah terdaftar.' });
        }

        await dbRun(
            `INSERT INTO fields (name, type, price_per_hour, description, status)
             VALUES (?, ?, ?, ?, ?)`,
            [name, type, pricePerHour, description || '', status || 'active']
        );
        res.status(201).json({ message: 'Lapangan berhasil ditambahkan.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal menambahkan lapangan.' });
    }
});

// Update Field (Admin only)
app.put('/api/fields/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, type, pricePerHour, description, status } = req.body;

    if (!name || !type || !pricePerHour) {
        return res.status(400).json({ error: 'Nama, tipe, dan harga per jam wajib diisi.' });
    }

    try {
        const field = await dbGet('SELECT id FROM fields WHERE id = ?', [id]);
        if (!field) {
            return res.status(404).json({ error: 'Lapangan tidak ditemukan.' });
        }

        await dbRun(
            `UPDATE fields SET name = ?, type = ?, price_per_hour = ?, description = ?, status = ? WHERE id = ?`,
            [name, type, pricePerHour, description || '', status || 'active', id]
        );
        res.json({ message: 'Data lapangan berhasil diperbarui.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal memperbarui data lapangan.' });
    }
});

// Delete Field (Admin only)
app.delete('/api/fields/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const field = await dbGet('SELECT id FROM fields WHERE id = ?', [id]);
        if (!field) {
            return res.status(404).json({ error: 'Lapangan tidak ditemukan.' });
        }

        await dbRun('DELETE FROM fields WHERE id = ?', [id]);
        res.json({ message: 'Lapangan berhasil dihapus.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal menghapus lapangan.' });
    }
});


// ==========================================
// 3. BOOKING & AVAILABILITY ENDPOINTS
// ==========================================

// Check schedule availability for a date and field
app.get('/api/bookings/check-availability', async (req, res) => {
    const { field_id, date } = req.query;

    if (!date) {
        return res.status(400).json({ error: 'Tanggal booking wajib disertakan (YYYY-MM-DD).' });
    }

    try {
        let bookings;
        if (field_id) {
            // Find bookings that overlap for this specific field (not cancelled)
            bookings = await dbAll(
                `SELECT start_time, end_time, status FROM bookings 
                 WHERE field_id = ? AND booking_date = ? AND status != 'cancelled'`,
                [field_id, date]
            );
        } else {
            // Find all active bookings on this date across all fields
            bookings = await dbAll(
                `SELECT field_id, start_time, end_time, status FROM bookings 
                 WHERE booking_date = ? AND status != 'cancelled'`,
                [date]
            );
        }

        res.json(bookings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal mengecek ketersediaan jadwal.' });
    }
});

// Create a booking
app.post('/api/bookings', requireLogin, async (req, res) => {
    const { fieldId, bookingDate, startTime, endTime, paymentMethod } = req.body;
    const userId = req.session.user.id;

    if (!fieldId || !bookingDate || startTime === undefined || endTime === undefined || !paymentMethod) {
        return res.status(400).json({ error: 'Semua detail booking wajib diisi.' });
    }

    const start = parseInt(startTime);
    const end = parseInt(endTime);

    if (start >= end) {
        return res.status(400).json({ error: 'Waktu mulai harus lebih awal dibanding waktu selesai.' });
    }

    if (start < 8 || end > 23) {
        return res.status(400).json({ error: 'Waktu operasional lapangan adalah pukul 08:00 sampai 23:00.' });
    }

    try {
        // Get field info
        const field = await dbGet('SELECT * FROM fields WHERE id = ?', [fieldId]);
        if (!field) {
            return res.status(404).json({ error: 'Lapangan tidak ditemukan.' });
        }

        if (field.status !== 'active') {
            return res.status(400).json({ error: 'Lapangan sedang tidak aktif atau dalam pemeliharaan.' });
        }

        // Check for conflicts: overlap check
        // Existing start < requested end AND existing end > requested start
        const conflict = await dbGet(
            `SELECT id FROM bookings 
             WHERE field_id = ? AND booking_date = ? AND status != 'cancelled' 
             AND start_time < ? AND end_time > ?`,
            [fieldId, bookingDate, end, start]
        );

        if (conflict) {
            return res.status(400).json({ error: 'Jadwal yang Anda pilih bertabrakan dengan penyewaan lain yang sudah terdaftar.' });
        }

        // Calculate pricing
        const durationHours = end - start;
        const totalPrice = durationHours * field.price_per_hour;

        // Insert booking
        const bookingResult = await dbRun(
            `INSERT INTO bookings (user_id, field_id, booking_date, start_time, end_time, total_price, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, fieldId, bookingDate, start, end, totalPrice, 'pending']
        );

        const bookingId = bookingResult.lastID;

        // Insert transaction
        await dbRun(
            `INSERT INTO transactions (booking_id, payment_method, payment_status)
             VALUES (?, ?, ?)`,
            [bookingId, paymentMethod, 'unpaid']
        );

        res.status(201).json({ 
            message: 'Booking berhasil diajukan. Silakan lakukan pembayaran dan hubungi admin untuk konfirmasi.',
            bookingId: bookingId,
            totalPrice: totalPrice
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal membuat penyewaan.' });
    }
});

// Get user's own bookings
app.get('/api/bookings/my', requireLogin, async (req, res) => {
    const userId = req.session.user.id;
    try {
        const bookings = await dbAll(
            `SELECT b.*, f.name as field_name, f.type as field_type, f.price_per_hour,
                    t.payment_method, t.payment_status, t.transaction_date
             FROM bookings b
             JOIN fields f ON b.field_id = f.id
             LEFT JOIN transactions t ON b.id = t.booking_id
             WHERE b.user_id = ?
             ORDER BY b.booking_date DESC, b.start_time DESC`,
            [userId]
        );
        res.json(bookings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal mengambil data riwayat penyewaan Anda.' });
    }
});

// Cancel own pending booking
app.put('/api/bookings/:id/cancel', requireLogin, async (req, res) => {
    const { id } = req.params;
    const userId = req.session.user.id;

    try {
        const booking = await dbGet('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [id, userId]);
        if (!booking) {
            return res.status(404).json({ error: 'Penyewaan tidak ditemukan.' });
        }

        if (booking.status !== 'pending') {
            return res.status(400).json({ error: 'Hanya booking berstatus PENDING yang dapat dibatalkan.' });
        }

        await dbRun('UPDATE bookings SET status = "cancelled" WHERE id = ?', [id]);
        await dbRun('UPDATE transactions SET payment_status = "unpaid" WHERE booking_id = ?', [id]);

        res.json({ message: 'Pemesanan berhasil dibatalkan.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal membatalkan pemesanan.' });
    }
});

// Update/Reschedule booking details
app.put('/api/bookings/:id', requireLogin, async (req, res) => {
    const { id } = req.params;
    const { fieldId, bookingDate, startTime, endTime } = req.body;
    const userId = req.session.user.id;
    const isAdmin = req.session.user.user_type === 'admin';

    if (!fieldId || !bookingDate || startTime === undefined || endTime === undefined) {
        return res.status(400).json({ error: 'Semua detail wajib diisi.' });
    }

    const start = parseInt(startTime);
    const end = parseInt(endTime);

    if (start >= end) {
        return res.status(400).json({ error: 'Waktu mulai harus lebih awal dibanding waktu selesai.' });
    }

    try {
        const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);
        if (!booking) {
            return res.status(404).json({ error: 'Booking tidak ditemukan.' });
        }

        if (!isAdmin && booking.user_id !== userId) {
            return res.status(403).json({ error: 'Akses ditolak.' });
        }

        const field = await dbGet('SELECT * FROM fields WHERE id = ?', [fieldId]);
        if (!field) {
            return res.status(404).json({ error: 'Lapangan tidak ditemukan.' });
        }

        if (field.status !== 'active') {
            return res.status(400).json({ error: 'Lapangan sedang tidak aktif atau maintenance.' });
        }

        // Overlap check (excluding this booking)
        const conflict = await dbGet(
            `SELECT id FROM bookings 
             WHERE field_id = ? AND booking_date = ? AND status != 'cancelled' AND id != ?
             AND start_time < ? AND end_time > ?`,
            [fieldId, bookingDate, id, end, start]
        );

        if (conflict) {
            return res.status(400).json({ error: 'Jadwal bertabrakan dengan penyewaan lain yang sudah terdaftar.' });
        }

        const duration = end - start;
        const newPrice = duration * field.price_per_hour;

        await dbRun(
            `UPDATE bookings SET field_id = ?, booking_date = ?, start_time = ?, end_time = ?, total_price = ?
             WHERE id = ?`,
            [fieldId, bookingDate, start, end, newPrice, id]
        );

        await dbRun('UPDATE transactions SET transaction_date = CURRENT_TIMESTAMP WHERE booking_id = ?', [id]);

        res.json({ message: 'Penyewaan berhasil dijadwalkan ulang.', totalPrice: newPrice });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal memperbarui data penyewaan.' });
    }
});

// Hard Delete booking (Admin only)
app.delete('/api/bookings/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const booking = await dbGet('SELECT id FROM bookings WHERE id = ?', [id]);
        if (!booking) {
            return res.status(404).json({ error: 'Penyewaan tidak ditemukan.' });
        }

        await dbRun('DELETE FROM bookings WHERE id = ?', [id]);
        res.json({ message: 'Data penyewaan berhasil dihapus permanen dari database.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal menghapus data penyewaan.' });
    }
});


// ==========================================
// 4. ADMIN BOOKINGS & TRANSACTION MANAGEMENT
// ==========================================

// Get all bookings with filtering & search (Admin only)
app.get('/api/bookings/all', requireAdmin, async (req, res) => {
    const { search, date, status } = req.query;
    
    let query = `
        SELECT b.*, u.full_name, u.user_type, u.identity_number, u.phone,
               f.name as field_name, f.type as field_type,
               t.payment_method, t.payment_status, t.transaction_date
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN fields f ON b.field_id = f.id
        LEFT JOIN transactions t ON b.id = t.booking_id
        WHERE 1=1
    `;
    const params = [];

    // Filter by date
    if (date) {
        query += ` AND b.booking_date = ?`;
        params.push(date);
    }

    // Filter by status
    if (status) {
        query += ` AND b.status = ?`;
        params.push(status);
    }

    // Search by renter's full name
    if (search) {
        query += ` AND u.full_name LIKE ?`;
        params.push(`%${search}%`);
    }

    query += ` ORDER BY b.booking_date DESC, b.start_time DESC`;

    try {
        const bookings = await dbAll(query, params);
        res.json(bookings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal memuat semua data penyewaan.' });
    }
});

// Update booking status (Admin only - approve/cancel)
app.put('/api/bookings/:id/status', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'Status tidak valid.' });
    }

    try {
        const booking = await dbGet('SELECT * FROM bookings WHERE id = ?', [id]);
        if (!booking) {
            return res.status(404).json({ error: 'Penyewaan tidak ditemukan.' });
        }

        await dbRun('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
        
        // If status is approved, we can auto-update transaction payment_status or keep it unpaid until paid.
        // Let's leave payment status to be managed independently, or if cancelled, we can update payment status.
        if (status === 'cancelled') {
            await dbRun('UPDATE transactions SET payment_status = "unpaid" WHERE booking_id = ?', [id]);
        }

        res.json({ message: `Status penyewaan berhasil diubah menjadi: ${status}.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal memperbarui status penyewaan.' });
    }
});

// Update transaction details (Admin only - mark paid/unpaid & method)
app.put('/api/bookings/:id/payment', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { paymentStatus, paymentMethod } = req.body;

    if (!['paid', 'unpaid'].includes(paymentStatus) || !['cash', 'transfer'].includes(paymentMethod)) {
        return res.status(400).json({ error: 'Status pembayaran atau metode pembayaran tidak valid.' });
    }

    try {
        const transaction = await dbGet('SELECT id FROM transactions WHERE booking_id = ?', [id]);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
        }

        await dbRun(
            `UPDATE transactions SET payment_status = ?, payment_method = ?, transaction_date = CURRENT_TIMESTAMP 
             WHERE booking_id = ?`,
            [paymentStatus, paymentMethod, id]
        );

        // If transaction is marked 'paid', we can also auto-approve the booking status if it was pending
        if (paymentStatus === 'paid') {
            await dbRun('UPDATE bookings SET status = "approved" WHERE id = ? AND status = "pending"', [id]);
        }

        res.json({ message: 'Status pembayaran berhasil diperbarui.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal memperbarui data transaksi.' });
    }
});

// ==========================================
// 5. USERS MANAGEMENT (Admin only)
// ==========================================

// Get all users
app.get('/api/users', requireAdmin, async (req, res) => {
    try {
        const users = await dbAll('SELECT id, username, full_name, user_type, identity_number, phone, created_at FROM users ORDER BY user_type ASC, full_name ASC');
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal mengambil data pengguna.' });
    }
});

// Add a new user (Admin only)
app.post('/api/users', requireAdmin, async (req, res) => {
    const { username, password, fullName, userType, identityNumber, phone } = req.body;

    if (!username || !password || !fullName || !userType || !phone) {
        return res.status(400).json({ error: 'Semua field wajib diisi.' });
    }

    if (!['admin', 'mahasiswa', 'dosen', 'umum'].includes(userType)) {
        return res.status(400).json({ error: 'Tipe pengguna tidak valid.' });
    }

    try {
        const existingUser = await dbGet('SELECT id FROM users WHERE username = ?', [username]);
        if (existingUser) {
            return res.status(400).json({ error: 'Username sudah digunakan.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await dbRun(
            `INSERT INTO users (username, password_hash, full_name, user_type, identity_number, phone)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [username, passwordHash, fullName, userType, identityNumber || null, phone]
        );

        res.status(201).json({ message: 'Pengguna berhasil ditambahkan.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal menambahkan pengguna.' });
    }
});

// Update user (Admin only)
app.put('/api/users/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { username, password, fullName, userType, identityNumber, phone } = req.body;

    if (!username || !fullName || !userType || !phone) {
        return res.status(400).json({ error: 'Username, Nama Lengkap, Kategori, dan Nomor HP wajib diisi.' });
    }

    try {
        const user = await dbGet('SELECT id FROM users WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
        }

        const duplicate = await dbGet('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
        if (duplicate) {
            return res.status(400).json({ error: 'Username sudah digunakan oleh akun lain.' });
        }

        if (password) {
            const passwordHash = await bcrypt.hash(password, 10);
            await dbRun(
                `UPDATE users SET username = ?, password_hash = ?, full_name = ?, user_type = ?, identity_number = ?, phone = ? WHERE id = ?`,
                [username, passwordHash, fullName, userType, identityNumber || null, phone, id]
            );
        } else {
            await dbRun(
                `UPDATE users SET username = ?, full_name = ?, user_type = ?, identity_number = ?, phone = ? WHERE id = ?`,
                [username, fullName, userType, identityNumber || null, phone, id]
            );
        }

        res.json({ message: 'Data pengguna berhasil diperbarui.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal memperbarui data pengguna.' });
    }
});

// Delete user (Admin only)
app.delete('/api/users/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;

    if (req.session.user.id == id) {
        return res.status(400).json({ error: 'Anda tidak dapat menghapus akun Administrator Anda yang sedang aktif.' });
    }

    try {
        const user = await dbGet('SELECT id FROM users WHERE id = ?', [id]);
        if (!user) {
            return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
        }

        await dbRun('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'Pengguna berhasil dihapus secara permanen.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal menghapus data pengguna.' });
    }
});


// ==========================================
// 6. REPORTS & STATISTICS (Admin only)
// ==========================================

app.get('/api/reports/summary', requireAdmin, async (req, res) => {
    const { startDate, endDate } = req.query;
    
    let dateFilter = '';
    const params = [];
    if (startDate && endDate) {
        dateFilter = 'AND b.booking_date BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    try {
        // 1. Total active fields
        const fieldsActive = await dbGet('SELECT COUNT(*) as count FROM fields WHERE status = "active"');

        // 2. Booking statistics (Approved, Pending, Cancelled)
        const bookingStats = await dbAll(
            `SELECT status, COUNT(*) as count, SUM(total_price) as total_value FROM bookings b
             WHERE 1=1 ${dateFilter} GROUP BY status`,
            params
        );

        // 3. Paid Revenue (Approved & Paid transactions)
        const revenueResult = await dbGet(
            `SELECT SUM(b.total_price) as revenue FROM bookings b
             JOIN transactions t ON b.id = t.booking_id
             WHERE b.status = 'approved' AND t.payment_status = 'paid' ${dateFilter}`,
            params
        );

        // 4. Bookings by user type
        const userTypeStats = await dbAll(
            `SELECT u.user_type, COUNT(*) as count, SUM(b.total_price) as total_value
             FROM bookings b
             JOIN users u ON b.user_id = u.id
             WHERE b.status = 'approved' ${dateFilter}
             GROUP BY u.user_type`,
            params
        );

        // 5. Bookings by field
        const fieldStats = await dbAll(
            `SELECT f.name as field_name, COUNT(*) as count, SUM(b.total_price) as total_value
             FROM bookings b
             JOIN fields f ON b.field_id = f.id
             WHERE b.status = 'approved' ${dateFilter}
             GROUP BY f.id`,
            params
        );

        // 6. Detailed transaction list for the report page
        const detailedTransactions = await dbAll(
            `SELECT b.id as booking_id, b.booking_date, b.start_time, b.end_time, b.total_price, b.status as booking_status,
                    u.full_name, u.user_type, u.identity_number, u.phone,
                    f.name as field_name,
                    t.payment_method, t.payment_status, t.transaction_date
             FROM bookings b
             JOIN users u ON b.user_id = u.id
             JOIN fields f ON b.field_id = f.id
             LEFT JOIN transactions t ON b.id = t.booking_id
             WHERE 1=1 ${dateFilter}
             ORDER BY b.booking_date DESC, b.start_time DESC`,
            params
        );

        res.json({
            fieldsCount: fieldsActive.count,
            bookingStats,
            revenue: revenueResult.revenue || 0,
            userTypeStats,
            fieldStats,
            detailedTransactions
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Gagal membuat laporan dan statistik.' });
    }
});


// Start server after checking/initializing the database
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
    });
});
