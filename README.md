# Sistem Informasi Penyewaan Lapangan MiniSoccer Polinela

Sistem Informasi Penyewaan Lapangan Minisoccer di lingkungan Politeknik Negeri Lampung (Polinela) yang berbasis database relasional. Sistem ini memproses pencatatan data pengguna, lapangan, transaksi, ketersediaan jadwal secara real-time, dan mencetak laporan keuangan.

Proyek ini dibangun berdasarkan cakupan kebutuhan **Bab I Pendahuluan dan Analisis Kebutuhan** pada rancangan sistem.

## Fitur Utama (Sesuai Ruang Lingkup Bab 1)
1. **Pengelolaan Data Pengguna:** Registrasi akun terpisah bagi Mahasiswa Polinela, Dosen/Pegawai Polinela, dan Masyarakat Umum.
2. **Pengelolaan Lapangan:** Pengelola/Admin dapat menambahkan tipe lapangan baru (seperti Rumput Sintetis / Alami), menyesuaikan deskripsi, dan harga per jam.
3. **Pengecekan Ketersediaan:** Menampilkan slot waktu operasional (08:00 - 23:00) yang terisi (booked) vs tersedia (available) berdasarkan filter tanggal.
4. **Pencatatan Transaksi:** Mencegah terjadinya benturan jadwal sewa (Overlap/Double Booking) secara real-time dan menyimpan detail pembayaran.
5. **Pencarian Data:** Pencarian riwayat booking oleh Admin berdasarkan nama penyewa atau tanggal.
6. **Pembuatan Laporan Keuangan:** Laporan total pendapatan dan klasifikasi booking berdasarkan jenis pengguna atau lapangan. Dilengkapi tombol cetak PDF yang rapi.
7. **Database Relasional:** Diimplementasikan menggunakan **SQLite** dan query SQL (Tabel: `users`, `fields`, `bookings`, `transactions`).

---

## Teknologi yang Digunakan
- **Backend:** Node.js (Runtime) & Express.js (Web Framework)
- **Database:** SQLite (Relational SQL Database melalui library `sqlite3`)
- **Keamanan:** `bcryptjs` (Hashing password pengguna)
- **Frontend:** Vanilla HTML5, CSS3 (Sporty Dark Neon Theme & Glassmorphism), dan Javascript (DOM Manipulation & REST API Client).

---

## Struktur Folder Project
```text
Projek-Frans/
├── node_modules/         # Folder dependency Node.js
├── public/               # File aset client-side
│   ├── css/
│   │   └── style.css     # Styling premium sporty-dark theme & print media
│   ├── js/
│   │   └── app.js        # Controller logika frontend, AJAX client
│   └── index.html        # Single Page Application HTML
├── database.js           # Pengaturan SQLite database & helper promise SQL
├── schema.sql            # Desain relational database schema
├── server.js             # Express API Server endpoints
├── package.json          # Node project config & scripts
└── README.md             # Dokumentasi sistem (File ini)
```

---

## Panduan Menjalankan Aplikasi

### 1. Prasyarat
Pastikan komputer Anda sudah terinstal **Node.js** (Rekomendasi versi 18 ke atas) dan **npm**.

### 2. Instalasi Dependensi
Buka terminal/PowerShell pada direktori project (`d:\Projek-Frans`), lalu jalankan perintah:
```bash
npm install
```

### 3. Menjalankan Aplikasi
Jalankan server Node.js dengan perintah:
```bash
node server.js
```
*Catatan: Saat pertama kali dijalankan, sistem secara otomatis akan membuat file `minisoccer.db` dan mengeksekusi script `schema.sql` untuk membuat tabel relasional, serta melakukan **seeding** data lapangan awal dan user admin.*

### 4. Mengakses Aplikasi
Buka web browser dan akses alamat berikut:
```text
http://localhost:3000
```

---

## Akun Default untuk Login

### 1. Akun Pengelola / Administrator (Admin)
Digunakan untuk mengelola lapangan, memverifikasi status sewa/pembayaran, dan melihat laporan keuangan.
- **Username:** `admin`
- **Password:** `admin123`

### 2. Akun Penyewa (Mahasiswa / Dosen / Umum)
Anda dapat mendaftarkan akun penyewa baru langsung melalui tombol **Daftar** di pojok kanan atas aplikasi. Kategori pengguna yang dipilih akan menentukan kolom input identitas (NIM untuk Mahasiswa, NIP untuk Dosen, KTP untuk Umum).
