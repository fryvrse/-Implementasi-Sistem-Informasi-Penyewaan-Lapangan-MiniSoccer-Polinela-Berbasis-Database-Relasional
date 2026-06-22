-- Database Schema for Polinela Minisoccer Field Rental Information System

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    user_type TEXT CHECK(user_type IN ('admin', 'mahasiswa', 'dosen', 'umum')) NOT NULL,
    identity_number TEXT, -- NPM for students, NIP for lecturers/staff, KTP/empty for public
    phone TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Fields Table
CREATE TABLE IF NOT EXISTS fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL, -- e.g., 'Rumput Sintetis', 'Rumput Alami'
    price_per_hour INTEGER NOT NULL,
    description TEXT,
    status TEXT CHECK(status IN ('active', 'maintenance')) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    field_id INTEGER NOT NULL,
    booking_date TEXT NOT NULL, -- Format: YYYY-MM-DD
    start_time INTEGER NOT NULL, -- Hour integer (e.g., 8 for 08:00, 16 for 16:00)
    end_time INTEGER NOT NULL,   -- Hour integer (e.g., 10 for 10:00, 18 for 18:00)
    total_price INTEGER NOT NULL,
    status TEXT CHECK(status IN ('pending', 'approved', 'cancelled')) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE
);

-- 4. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER UNIQUE NOT NULL,
    payment_method TEXT CHECK(payment_method IN ('cash', 'transfer')) DEFAULT 'cash',
    payment_status TEXT CHECK(payment_status IN ('unpaid', 'paid')) DEFAULT 'unpaid',
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);
