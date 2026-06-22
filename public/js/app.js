// Polinela Minisoccer Booking System - Frontend Application Logic

// 1. Application State
const state = {
    currentUser: null,
    fields: [],
    activeView: 'view-landing',
    adminActiveTab: 'admin-panel-bookings',
    currentFieldEditing: null
};

// 2. Helper formatters
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
    }).format(amount);
}

function formatHour(hour) {
    return hour.toString().padStart(2, '0') + ':00';
}

function formatDateIndo(dateStr) {
    if (!dateStr) return '-';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('id-ID', options);
}

// 3. Page / View Management
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(viewId);
    if (targetSection) {
        targetSection.classList.add('active');
        state.activeView = viewId;
    }

    // Close mobile nav drawer if active
    const wrapper = document.getElementById('nav-menu-wrapper');
    if (wrapper) wrapper.classList.remove('active');

    // Update navigation active states
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });

    if (viewId === 'view-landing') {
        document.getElementById('nav-home').classList.add('active');
    } else if (viewId === 'view-schedule') {
        document.getElementById('nav-schedule').classList.add('active');
    } else if (viewId === 'view-renter-dashboard') {
        document.getElementById('nav-renter-dashboard').classList.add('active');
    } else if (viewId === 'view-admin-dashboard') {
        document.getElementById('nav-admin-dashboard').classList.add('active');
    }
    
    // View specific init loaders
    if (viewId === 'view-renter-dashboard') {
        loadRenterDashboard();
    } else if (viewId === 'view-admin-dashboard') {
        loadAdminDashboard();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Switch tabs inside Admin Panel
function switchAdminTab(tabId, panelId) {
    document.querySelectorAll('.admin-menu a').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    document.getElementById(panelId).classList.add('active');
    state.adminActiveTab = panelId;

    if (panelId === 'admin-panel-bookings') {
        loadAdminBookings();
    } else if (panelId === 'admin-panel-fields') {
        loadAdminFields();
    } else if (panelId === 'admin-panel-users') {
        loadAdminUsers();
    } else if (panelId === 'admin-panel-reports') {
        loadReportsSummary();
    }
}

// 4. Session & Header UI Restoration
async function checkSession() {
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        
        const authBtnContainer = document.getElementById('auth-buttons-container');
        const navRenterDash = document.getElementById('nav-renter-dashboard');
        const navAdminDash = document.getElementById('nav-admin-dashboard');

        if (data.loggedIn) {
            state.currentUser = data.user;
            
            // Show dashboard navigations according to user role
            if (state.currentUser.user_type === 'admin') {
                navAdminDash.classList.remove('hidden');
                navRenterDash.classList.add('hidden');
            } else {
                navRenterDash.classList.remove('hidden');
                navAdminDash.classList.add('hidden');
            }

            // Inject Profile and Logout button
            authBtnContainer.innerHTML = `
                <div class="user-profile-tag">
                    <i class="fa-solid fa-circle-user"></i>
                    <span><strong>${state.currentUser.full_name}</strong> (${state.currentUser.user_type.toUpperCase()})</span>
                </div>
                <button id="btn-logout" class="btn btn-outline btn-sm"><i class="fa-solid fa-arrow-right-from-bracket"></i> Keluar</button>
            `;

            // Bind log out button
            document.getElementById('btn-logout').addEventListener('click', handleLogout);

            // Redirect if in Login / Register pages to their respective dashboards
            if (state.activeView === 'view-login' || state.activeView === 'view-register') {
                if (state.currentUser.user_type === 'admin') {
                    switchView('view-admin-dashboard');
                } else {
                    switchView('view-renter-dashboard');
                }
            }
        } else {
            state.currentUser = null;
            navRenterDash.classList.add('hidden');
            navAdminDash.classList.add('hidden');
            
            authBtnContainer.innerHTML = `
                <button id="btn-login-view" class="btn btn-outline"><i class="fa-solid fa-arrow-right-to-bracket"></i> Masuk</button>
                <button id="btn-register-view" class="btn btn-primary"><i class="fa-solid fa-user-plus"></i> Daftar</button>
            `;

            document.getElementById('btn-login-view').addEventListener('click', () => switchView('view-login'));
            document.getElementById('btn-register-view').addEventListener('click', () => switchView('view-register'));

            // Redirect if user logged out while on dashboard views
            if (state.activeView === 'view-renter-dashboard' || state.activeView === 'view-admin-dashboard') {
                switchView('view-landing');
            }
        }
    } catch (err) {
        console.error('Session check failure:', err);
    }
}

async function handleLogout() {
    try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            checkSession();
            alert('Logout berhasil.');
            switchView('view-landing');
        } else {
            alert(data.error || 'Gagal logout.');
        }
    } catch (err) {
        console.error('Logout error:', err);
    }
}

// 5. Auth Form Submissions
async function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('login-username').value;
    const passwordInput = document.getElementById('login-password').value;
    const errorAlert = document.getElementById('login-error-alert');

    errorAlert.classList.add('hidden');

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });
        const data = await res.json();

        if (res.ok) {
            document.getElementById('form-login').reset();
            await checkSession();
            if (data.user.user_type === 'admin') {
                switchView('view-admin-dashboard');
            } else {
                switchView('view-renter-dashboard');
            }
        } else {
            errorAlert.textContent = data.error || 'Login gagal. Periksa kembali input Anda.';
            errorAlert.classList.remove('hidden');
        }
    } catch (err) {
        console.error(err);
        errorAlert.textContent = 'Koneksi ke server gagal.';
        errorAlert.classList.remove('hidden');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const fullName = document.getElementById('reg-fullname').value;
    const password = document.getElementById('reg-password').value;
    const phone = document.getElementById('reg-phone').value;
    const userType = document.getElementById('reg-usertype').value;
    const identityNumber = document.getElementById('reg-identity').value;

    const errorAlert = document.getElementById('register-error-alert');
    const successAlert = document.getElementById('register-success-alert');

    errorAlert.classList.add('hidden');
    successAlert.classList.add('hidden');

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, fullName, password, phone, userType, identityNumber })
        });
        const data = await res.json();

        if (res.ok) {
            successAlert.textContent = data.message || 'Registrasi sukses! Silakan login.';
            successAlert.classList.remove('hidden');
            document.getElementById('form-register').reset();
            setTimeout(() => {
                switchView('view-login');
                successAlert.classList.add('hidden');
            }, 2000);
        } else {
            errorAlert.textContent = data.error || 'Registrasi gagal.';
            errorAlert.classList.remove('hidden');
        }
    } catch (err) {
        console.error(err);
        errorAlert.textContent = 'Koneksi server gagal.';
        errorAlert.classList.remove('hidden');
    }
}

// Dynamic identity input placeholder based on user type selection in register page
function updateRegisterIdentityLabel() {
    const userType = document.getElementById('reg-usertype').value;
    const label = document.getElementById('reg-identity-label');
    const input = document.getElementById('reg-identity');

    if (userType === 'mahasiswa') {
        label.innerHTML = '<i class="fa-solid fa-id-badge"></i> Nomor Induk Mahasiswa (NIM)';
        input.placeholder = 'Masukkan NIM Polinela Anda';
        input.required = true;
    } else if (userType === 'dosen') {
        label.innerHTML = '<i class="fa-solid fa-id-badge"></i> Nomor Induk Pegawai (NIP)';
        input.placeholder = 'Masukkan NIP Anda';
        input.required = true;
    } else {
        label.innerHTML = '<i class="fa-solid fa-id-badge"></i> Nomor Identitas (KTP)';
        input.placeholder = 'Masukkan No. KTP / Identitas';
        input.required = false;
    }
}


// ==========================================
// 6. FIELDS DATA HANDLING
// ==========================================

async function loadFields() {
    try {
        const res = await fetch('/api/fields');
        state.fields = await res.json();

        populateFieldSelectors();
        renderLandingFields();
    } catch (err) {
        console.error('Gagal mengambil data lapangan:', err);
    }
}

function populateFieldSelectors() {
    const selectors = [
        document.getElementById('sched-field-select'),
        document.getElementById('book-field')
    ];

    selectors.forEach(select => {
        if (!select) return;
        const currentVal = select.value;
        
        // Save initial placeholder option if booking field
        let optionsHtml = '';
        if (select.id === 'book-field') {
            optionsHtml = '<option value="" disabled selected>Pilih Lapangan</option>';
        }

        state.fields.forEach(field => {
            optionsHtml += `<option value="${field.id}">${field.name} (${formatRupiah(field.price_per_hour)}/Jam)</option>`;
        });

        select.innerHTML = optionsHtml;
        if (currentVal) select.value = currentVal;
    });
}

function renderLandingFields() {
    const container = document.getElementById('landing-fields-container');
    if (!container) return;

    if (state.fields.length === 0) {
        container.innerHTML = '<p class="text-center text-secondary">Tidak ada data lapangan tersedia.</p>';
        return;
    }

    container.innerHTML = state.fields.map(field => `
        <div class="field-card">
            <div class="field-visual-header">
                <i class="fa-solid fa-futbol"></i>
                <span class="field-tag">${field.type}</span>
                <span class="field-status-tag ${field.status}">${field.status === 'active' ? 'Aktif' : 'Pemeliharaan'}</span>
            </div>
            <div class="field-body">
                <h3>${field.name}</h3>
                <p>${field.description || 'Fasilitas minisoccer Polinela dengan perawatan standar terbaik.'}</p>
                <div class="field-info-row">
                    <div class="field-price">
                        ${formatRupiah(field.price_per_hour)} <span>/ Jam</span>
                    </div>
                    <button class="btn btn-primary btn-sm btn-book-now-trigger" data-field-id="${field.id}">
                        <i class="fa-solid fa-calendar-check"></i> Pesan
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Bind booking button triggers inside the landing page
    container.querySelectorAll('.btn-book-now-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const fieldId = e.currentTarget.getAttribute('data-field-id');
            if (!state.currentUser) {
                alert('Silakan login terlebih dahulu untuk melakukan booking.');
                switchView('view-login');
            } else {
                switchView('view-renter-dashboard');
                document.getElementById('book-field').value = fieldId;
                updatePriceEstimator();
            }
        });
    });
}


// ==========================================
// 7. SCHEDULE AVAILABILITY CHECKER
// ==========================================

async function loadScheduleGrid() {
    const fieldId = document.getElementById('sched-field-select').value;
    const dateInput = document.getElementById('sched-date-input').value;
    const gridContainer = document.getElementById('timetable-slots-grid');

    if (!fieldId || !dateInput) {
        gridContainer.innerHTML = '<p class="placeholder-text">Harap tentukan lapangan dan tanggal booking.</p>';
        return;
    }

    gridContainer.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Menghubungkan database...</div>';

    try {
        const res = await fetch(`/api/bookings/check-availability?field_id=${fieldId}&date=${dateInput}`);
        const activeBookings = await res.json(); // Array of {start_time, end_time}

        // Generate hours from 08:00 to 23:00 (15 hourly slots)
        let slotsHtml = '';
        for (let hour = 8; hour < 23; hour++) {
            const startStr = formatHour(hour);
            const endStr = formatHour(hour + 1);
            
            // Check if this hour overlaps with any booked schedule
            const isBooked = activeBookings.some(booking => {
                return hour >= booking.start_time && hour < booking.end_time;
            });

            if (isBooked) {
                slotsHtml += `
                    <div class="slot-card booked">
                        <span class="slot-time">${startStr} - ${endStr}</span>
                        <span class="slot-status-text"><i class="fa-solid fa-circle-xmark"></i> Terisi (Booked)</span>
                    </div>
                `;
            } else {
                slotsHtml += `
                    <div class="slot-card available">
                        <span class="slot-time">${startStr} - ${endStr}</span>
                        <span class="slot-status-text"><i class="fa-solid fa-circle-check"></i> Tersedia</span>
                    </div>
                `;
            }
        }

        gridContainer.innerHTML = slotsHtml;

    } catch (err) {
        console.error(err);
        gridContainer.innerHTML = '<p class="placeholder-text text-danger">Gagal mengecek jadwal ke server.</p>';
    }
}


// ==========================================
// 8. RENTER DASHBOARD LOGIC
// ==========================================

async function loadRenterDashboard() {
    if (!state.currentUser) return;
    document.getElementById('renter-welcome-name').textContent = state.currentUser.full_name;
    
    // Clear dynamic forms
    document.getElementById('form-booking').reset();
    document.getElementById('book-date').value = new Date().toISOString().split('T')[0];
    updatePriceEstimator();

    try {
        const res = await fetch('/api/bookings/my');
        const bookings = await res.json();

        // Calculate Stats
        const totalCount = bookings.length;
        const pendingCount = bookings.filter(b => b.status === 'pending').length;
        const approvedCount = bookings.filter(b => b.status === 'approved').length;

        document.getElementById('renter-stat-total').textContent = totalCount;
        document.getElementById('renter-stat-pending').textContent = pendingCount;
        document.getElementById('renter-stat-approved').textContent = approvedCount;

        // Render bookings history table
        const tbody = document.querySelector('#table-renter-bookings tbody');
        if (bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-secondary">Anda belum memiliki riwayat booking lapangan.</td></tr>';
            return;
        }

        tbody.innerHTML = bookings.map(b => {
            const timeRange = `${formatHour(b.start_time)} - ${formatHour(b.end_time)}`;
            const payStatusLabel = b.payment_status === 'paid' ? 'LUNAS' : 'BELUM BAYAR';
            
            let actionButtons = `
                <button class="btn btn-outline btn-sm btn-view-invoice" data-booking-id="${b.id}" title="Lihat Kuitansi">
                    <i class="fa-solid fa-print"></i> Kuitansi
                </button>
            `;
            
            // Allow renters to reschedule or cancel their booking only if status is pending
            if (b.status === 'pending') {
                actionButtons += `
                    <button class="btn btn-outline btn-sm btn-edit-booking text-warning" data-booking-id="${b.id}" title="Reschedule Jadwal">
                        <i class="fa-solid fa-calendar-day"></i> Reschedule
                    </button>
                    <button class="btn btn-danger btn-sm btn-cancel-booking" data-booking-id="${b.id}" title="Batalkan Pesanan">
                        <i class="fa-solid fa-xmark"></i> Batal
                    </button>
                `;
            }

            return `
                <tr>
                    <td><strong>#MS-${b.id}</strong></td>
                    <td>${b.field_name}</td>
                    <td>${formatDateIndo(b.booking_date)}</td>
                    <td>${timeRange}</td>
                    <td>${formatRupiah(b.total_price)}</td>
                    <td><span class="badge-status ${b.status}">${b.status.toUpperCase()}</span></td>
                    <td><span class="badge-status ${b.payment_status}">${payStatusLabel}</span></td>
                    <td>
                        <div class="actions-cell">${actionButtons}</div>
                    </td>
                </tr>
            `;
        }).join('');

        // Bind actions
        tbody.querySelectorAll('.btn-view-invoice').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bookingId = e.currentTarget.getAttribute('data-booking-id');
                const selectedBooking = bookings.find(b => b.id == bookingId);
                showInvoiceModal(selectedBooking);
            });
        });
        tbody.querySelectorAll('.btn-edit-booking').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bookingId = e.currentTarget.getAttribute('data-booking-id');
                const selectedBooking = bookings.find(b => b.id == bookingId);
                openBookingModal(selectedBooking);
            });
        });
        tbody.querySelectorAll('.btn-cancel-booking').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const bookingId = e.currentTarget.getAttribute('data-booking-id');
                cancelBooking(bookingId);
            });
        });

    } catch (err) {
        console.error('Failed load renter history:', err);
    }
}

// Recalculates estimated booking cost in renter dashboard form
function updatePriceEstimator() {
    const fieldId = document.getElementById('book-field').value;
    const startHour = parseInt(document.getElementById('book-start').value);
    const endHour = parseInt(document.getElementById('book-end').value);

    const estDuration = document.getElementById('est-duration');
    const estRate = document.getElementById('est-rate');
    const estTotal = document.getElementById('est-total');

    if (!fieldId) {
        estDuration.textContent = '0 Jam';
        estRate.textContent = 'Rp 0';
        estTotal.textContent = 'Rp 0';
        return;
    }

    const field = state.fields.find(f => f.id == fieldId);
    if (!field) return;

    estRate.textContent = `${formatRupiah(field.price_per_hour)}`;

    const duration = endHour - startHour;
    if (duration <= 0) {
        estDuration.textContent = 'Durasi tidak valid';
        estTotal.textContent = 'Rp 0';
        return;
    }

    estDuration.textContent = `${duration} Jam`;
    const totalPrice = duration * field.price_per_hour;
    estTotal.textContent = formatRupiah(totalPrice);
}

// Submission for New Booking Form
async function handleNewBooking(e) {
    e.preventDefault();
    const fieldId = document.getElementById('book-field').value;
    const bookingDate = document.getElementById('book-date').value;
    const startTime = document.getElementById('book-start').value;
    const endTime = document.getElementById('book-end').value;
    const paymentMethod = document.getElementById('book-payment-method').value;

    try {
        const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fieldId, bookingDate, startTime, endTime, paymentMethod })
        });
        const data = await res.json();

        if (res.ok) {
            alert(data.message || 'Penyewaan berhasil diajukan!');
            loadRenterDashboard();
        } else {
            alert(data.error || 'Gagal mengajukan booking.');
        }
    } catch (err) {
        console.error(err);
        alert('Gagal mengirim pemesanan ke server.');
    }
}


// ==========================================
// 9. ADMINISTRATOR PORTAL CONTROLLERS
// ==========================================

function loadAdminDashboard() {
    switchAdminTab('admin-tab-bookings', 'admin-panel-bookings');
}

// Tab 1: Bookings Management
async function loadAdminBookings() {
    const search = document.getElementById('admin-search-name').value;
    const date = document.getElementById('admin-filter-date').value;
    const status = document.getElementById('admin-filter-status').value;

    const tbody = document.querySelector('#table-admin-bookings tbody');
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">Memuat data penyewaan...</td></tr>';

    try {
        let url = '/api/bookings/all?';
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (date) url += `date=${date}&`;
        if (status) url += `status=${status}&`;

        const res = await fetch(url);
        const bookings = await res.json();

        if (!res.ok) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">${bookings.error || 'Sesi habis atau akses ditolak. Silakan login ulang.'}</td></tr>`;
            return;
        }

        if (!Array.isArray(bookings) || bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-secondary">Tidak ada data penyewaan ditemukan.</td></tr>';
            return;
        }

        tbody.innerHTML = bookings.map(b => {
            const timeRange = `${formatHour(b.start_time)} - ${formatHour(b.end_time)}`;
            const isApproved = b.status === 'approved';
            const isCancelled = b.status === 'cancelled';
            const isPaid = b.payment_status === 'paid';
            const categoryText = b.user_type === 'mahasiswa' ? 'MAHASISWA' : b.user_type === 'dosen' ? 'DOSEN' : 'UMUM';

            let actionsHtml = '';
            // Booking action buttons based on status
            if (!isApproved && !isCancelled) {
                actionsHtml += `<button class="btn btn-primary btn-sm btn-approve" data-id="${b.id}" title="Setujui Booking">Setujui</button> `;
            }
            if (!isCancelled) {
                actionsHtml += `<button class="btn btn-danger btn-sm btn-cancel" data-id="${b.id}" title="Batalkan Booking">Batalkan</button> `;
            }
            
            // Payment Action
            if (!isPaid && !isCancelled) {
                actionsHtml += `
                    <button class="btn btn-outline btn-sm btn-mark-paid text-neon" data-id="${b.id}" data-method="${b.payment_method}" title="Konfirmasi Lunas">
                        <i class="fa-solid fa-check-double"></i> Lunas
                    </button>
                `;
            }

            // Reschedule & hard delete for Admin
            actionsHtml += `
                <button class="btn btn-outline btn-sm btn-edit-booking text-warning" data-id="${b.id}" title="Reschedule"><i class="fa-solid fa-calendar-day"></i></button>
                <button class="btn btn-danger btn-sm btn-delete-booking" data-id="${b.id}" title="Hapus Permanen"><i class="fa-solid fa-trash"></i></button>
                <button class="btn btn-outline btn-sm btn-print-inv" data-id="${b.id}" title="Cetak Kuitansi"><i class="fa-solid fa-print"></i></button>
            `;

            return `
                <tr>
                    <td><strong>#MS-${b.id}</strong></td>
                    <td><strong>${b.full_name}</strong><br><span class="text-muted" style="font-size: 11px;">Kategori: ${categoryText}</span></td>
                    <td><span style="font-size:12px;">ID: ${b.identity_number || '-'}<br>Telp: ${b.phone}</span></td>
                    <td>${b.field_name}</td>
                    <td><span style="font-weight:600;">${formatDateIndo(b.booking_date)}</span><br>${timeRange}</td>
                    <td>${formatRupiah(b.total_price)}</td>
                    <td><span class="badge-status ${b.status}">${b.status.toUpperCase()}</span></td>
                    <td><span class="badge-status ${b.payment_status}">${b.payment_status.toUpperCase()}</span><br><span style="font-size: 11px; text-transform: uppercase;">(${b.payment_method})</span></td>
                    <td><div class="actions-cell">${actionsHtml}</div></td>
                </tr>
            `;
        }).join('');

        // Bind event listeners for actions
        tbody.querySelectorAll('.btn-approve').forEach(btn => {
            btn.addEventListener('click', () => updateBookingStatus(btn.getAttribute('data-id'), 'approved'));
        });
        tbody.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.addEventListener('click', () => updateBookingStatus(btn.getAttribute('data-id'), 'cancelled'));
        });
        tbody.querySelectorAll('.btn-mark-paid').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const method = btn.getAttribute('data-method');
                updatePaymentStatus(id, 'paid', method);
            });
        });
        tbody.querySelectorAll('.btn-edit-booking').forEach(btn => {
            btn.addEventListener('click', () => {
                const bookingId = btn.getAttribute('data-id');
                const selected = bookings.find(b => b.id == bookingId);
                openBookingModal(selected);
            });
        });
        tbody.querySelectorAll('.btn-delete-booking').forEach(btn => {
            btn.addEventListener('click', () => {
                const bookingId = btn.getAttribute('data-id');
                deleteBooking(bookingId);
            });
        });
        tbody.querySelectorAll('.btn-print-inv').forEach(btn => {
            btn.addEventListener('click', () => {
                const bookingId = btn.getAttribute('data-id');
                const selected = bookings.find(b => b.id == bookingId);
                showInvoiceModal(selected);
            });
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Gagal memuat list booking.</td></tr>';
    }
}

async function updateBookingStatus(id, newStatus) {
    if (!confirm(`Apakah Anda yakin ingin mengubah status booking ini menjadi ${newStatus}?`)) return;
    try {
        const res = await fetch(`/api/bookings/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        alert(data.message || 'Status berhasil diubah.');
        loadAdminBookings();
    } catch (err) {
        console.error(err);
        alert('Gagal memperbarui status.');
    }
}

async function updatePaymentStatus(id, paymentStatus, paymentMethod) {
    if (!confirm(`Konfirmasi pembayaran LUNAS untuk penyewaan ini?`)) return;
    try {
        const res = await fetch(`/api/bookings/${id}/payment`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentStatus, paymentMethod })
        });
        const data = await res.json();
        alert(data.message || 'Status pembayaran diubah.');
        loadAdminBookings();
    } catch (err) {
        console.error(err);
        alert('Gagal mengupdate pembayaran.');
    }
}

// Tab 2: Fields Management (CRUD)
async function loadAdminFields() {
    const listContainer = document.getElementById('admin-fields-list');
    listContainer.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Memuat lapangan...</div>';

    try {
        const res = await fetch('/api/fields');
        const fields = await res.json();

        if (!res.ok) {
            listContainer.innerHTML = `<p class="placeholder-text text-danger">${fields.error || 'Gagal memuat data lapangan.'}</p>`;
            return;
        }

        state.fields = fields;

        if (fields.length === 0) {
            listContainer.innerHTML = '<p class="placeholder-text">Belum ada lapangan yang terdaftar.</p>';
            return;
        }

        listContainer.innerHTML = fields.map(field => `
            <div class="field-card">
                <div class="field-visual-header">
                    <i class="fa-solid fa-futbol"></i>
                    <span class="field-tag">${field.type}</span>
                    <span class="field-status-tag ${field.status}">${field.status === 'active' ? 'Aktif' : 'Maintenance'}</span>
                </div>
                <div class="field-body">
                    <h3>${field.name}</h3>
                    <p>${field.description || 'Tidak ada deskripsi.'}</p>
                    <div class="field-info-row">
                        <div class="field-price">
                            ${formatRupiah(field.price_per_hour)} <span>/ Jam</span>
                        </div>
                        <div class="actions-cell">
                            <button class="btn btn-outline btn-sm btn-edit-field" data-id="${field.id}"><i class="fa-solid fa-edit"></i> Edit</button>
                            <button class="btn btn-danger btn-sm btn-delete-field" data-id="${field.id}"><i class="fa-solid fa-trash"></i> Hapus</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Bind CRUD actions
        listContainer.querySelectorAll('.btn-edit-field').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const field = fields.find(f => f.id == id);
                openFieldModal(field);
            });
        });

        listContainer.querySelectorAll('.btn-delete-field').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                deleteField(id);
            });
        });

    } catch (err) {
        console.error(err);
        listContainer.innerHTML = '<p class="placeholder-text text-danger">Gagal mengambil data lapangan.</p>';
    }
}

function openFieldModal(field = null) {
    const modal = document.getElementById('field-modal-overlay');
    const title = document.getElementById('field-modal-title');
    const form = document.getElementById('form-admin-field');
    
    form.reset();
    
    if (field) {
        title.textContent = 'Edit Data Lapangan';
        document.getElementById('field-id-input').value = field.id;
        document.getElementById('field-name-input').value = field.name;
        document.getElementById('field-type-input').value = field.type;
        document.getElementById('field-price-input').value = field.price_per_hour;
        document.getElementById('field-desc-input').value = field.description;
        document.getElementById('field-status-input').value = field.status;
        state.currentFieldEditing = field.id;
    } else {
        title.textContent = 'Tambah Lapangan Baru';
        document.getElementById('field-id-input').value = '';
        state.currentFieldEditing = null;
    }
    
    modal.classList.remove('hidden');
}

function closeFieldModal() {
    document.getElementById('field-modal-overlay').classList.add('hidden');
}

async function handleSaveField(e) {
    e.preventDefault();
    const id = document.getElementById('field-id-input').value;
    const name = document.getElementById('field-name-input').value;
    const type = document.getElementById('field-type-input').value;
    const pricePerHour = document.getElementById('field-price-input').value;
    const description = document.getElementById('field-desc-input').value;
    const status = document.getElementById('field-status-input').value;

    const payload = { name, type, pricePerHour, description, status };

    try {
        let res, data;
        if (id) {
            // Edit
            res = await fetch(`/api/fields/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            // Add
            res = await fetch('/api/fields', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        data = await res.json();

        if (res.ok) {
            alert(data.message || 'Lapangan berhasil disimpan.');
            closeFieldModal();
            loadAdminFields();
            loadFields(); // Reload selectors globally
        } else {
            alert(data.error || 'Gagal menyimpan lapangan.');
        }
    } catch (err) {
        console.error(err);
        alert('Gagal menghubungi server.');
    }
}

async function deleteField(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus lapangan ini? Menghapus lapangan akan membatalkan seluruh data booking terkait.')) return;
    try {
        const res = await fetch(`/api/fields/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            alert(data.message || 'Lapangan berhasil dihapus.');
            loadAdminFields();
            loadFields();
        } else {
            alert(data.error || 'Gagal menghapus lapangan.');
        }
    } catch (err) {
        console.error(err);
        alert('Terjadi error server.');
    }
}

// Tab 3: Users List
async function loadAdminUsers() {
    const tbody = document.querySelector('#table-admin-users tbody');
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">Memuat data pengguna...</td></tr>';

    try {
        const res = await fetch('/api/users');
        const users = await res.json();

        if (!res.ok) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">${users.error || 'Sesi habis atau akses ditolak. Silakan login ulang.'}</td></tr>`;
            return;
        }

        if (!Array.isArray(users) || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada pengguna terdaftar.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(u => {
            const roleBadge = u.user_type === 'admin' ? '<span class="badge-status approved">ADMIN</span>' : `<span class="badge-status pending">${u.user_type.toUpperCase()}</span>`;
            
            let actionsHtml = `<button class="btn btn-outline btn-sm btn-edit-user" data-id="${u.id}"><i class="fa-solid fa-edit"></i> Edit</button> `;
            // Prevent self-deletion
            if (state.currentUser && state.currentUser.id != u.id) {
                actionsHtml += `<button class="btn btn-danger btn-sm btn-delete-user" data-id="${u.id}"><i class="fa-solid fa-trash"></i> Hapus</button>`;
            }

            return `
                <tr>
                    <td><strong>${u.id}</strong></td>
                    <td><strong>${u.full_name}</strong></td>
                    <td>${u.username}</td>
                    <td>${roleBadge}</td>
                    <td>${u.identity_number || '-'}</td>
                    <td>${u.phone}</td>
                    <td>${formatDateIndo(u.created_at)}</td>
                    <td><div class="actions-cell">${actionsHtml}</div></td>
                </tr>
            `;
        }).join('');

        // Bind user CRUD buttons
        tbody.querySelectorAll('.btn-edit-user').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const user = users.find(u => u.id == id);
                openUserModal(user);
            });
        });
        tbody.querySelectorAll('.btn-delete-user').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                deleteUser(id);
            });
        });

    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Gagal mengambil data pengguna.</td></tr>';
    }
}

// Tab 4: Financial & Transaction Ledger Reports
async function loadReportsSummary() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;

    let url = '/api/reports/summary?';
    if (startDate && endDate) {
        url += `startDate=${startDate}&endDate=${endDate}`;
        document.getElementById('print-date-range').innerHTML = `
            <strong>Periode Laporan:</strong> ${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}
        `;
    } else {
        document.getElementById('print-date-range').innerHTML = `
            <strong>Periode Laporan:</strong> Semua Tanggal
        `;
    }

    try {
        const res = await fetch(url);
        const data = await res.json();

        // Update statistics cards
        document.getElementById('report-total-revenue').textContent = formatRupiah(data.revenue);
        
        const approvedStats = data.bookingStats.find(s => s.status === 'approved');
        document.getElementById('report-total-approved-bookings').textContent = approvedStats ? approvedStats.count : 0;
        document.getElementById('report-active-fields').textContent = data.fieldsCount;

        // Render User Type classification stats
        const typeTbody = document.querySelector('#table-report-usertype tbody');
        if (data.userTypeStats.length === 0) {
            typeTbody.innerHTML = '<tr><td colspan="3" class="text-center text-secondary">Belum ada transaksi sukses.</td></tr>';
        } else {
            typeTbody.innerHTML = data.userTypeStats.map(s => `
                <tr>
                    <td><strong>${s.user_type.toUpperCase()}</strong></td>
                    <td>${s.count} Kali</td>
                    <td>${formatRupiah(s.total_value)}</td>
                </tr>
            `).join('');
        }

        // Render Field Classification stats
        const fieldTbody = document.querySelector('#table-report-fields tbody');
        if (data.fieldStats.length === 0) {
            fieldTbody.innerHTML = '<tr><td colspan="3" class="text-center text-secondary">Belum ada transaksi sukses.</td></tr>';
        } else {
            fieldTbody.innerHTML = data.fieldStats.map(s => `
                <tr>
                    <td><strong>${s.field_name}</strong></td>
                    <td>${s.count} Kali</td>
                    <td>${formatRupiah(s.total_value)}</td>
                </tr>
            `).join('');
        }

        // Render Detailed Ledger Table
        const ledgerTbody = document.querySelector('#table-report-ledger tbody');
        if (data.detailedTransactions.length === 0) {
            ledgerTbody.innerHTML = '<tr><td colspan="9" class="text-center text-secondary">Tidak ada transaksi tercatat pada rentang waktu ini.</td></tr>';
            return;
        }

        ledgerTbody.innerHTML = data.detailedTransactions.map(t => {
            const timeRange = `${formatHour(t.start_time)} - ${formatHour(t.end_time)}`;
            const payLabel = t.payment_status === 'paid' ? 'LUNAS' : 'BELUM';
            const incomeValue = t.booking_status === 'approved' && t.payment_status === 'paid' ? formatRupiah(t.total_price) : 'Rp 0';
            
            return `
                <tr>
                    <td><strong>#MS-${t.booking_id}</strong></td>
                    <td>${formatDateIndo(t.booking_date)}</td>
                    <td>${timeRange}</td>
                    <td>${t.full_name}</td>
                    <td>${t.user_type.toUpperCase()}</td>
                    <td>${t.field_name}</td>
                    <td>${t.payment_method.toUpperCase()}</td>
                    <td><span class="badge-status ${t.payment_status}">${payLabel}</span></td>
                    <td style="font-weight: 600; text-align: right;">${incomeValue}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error(err);
        alert('Gagal mengambil ringkasan laporan.');
    }
}


// ==========================================
// User CRUD Modal & Submissions (Admin)
// ==========================================
function openUserModal(user = null) {
    const modal = document.getElementById('user-modal-overlay');
    const title = document.getElementById('user-modal-title');
    const form = document.getElementById('form-admin-user');
    const passwordLabel = document.getElementById('user-password-label');
    const passwordInput = document.getElementById('user-password-input');

    form.reset();

    if (user) {
        title.textContent = 'Edit Data Pengguna';
        document.getElementById('user-id-input').value = user.id;
        document.getElementById('user-username-input').value = user.username;
        document.getElementById('user-fullname-input').value = user.full_name;
        document.getElementById('user-phone-input').value = user.phone;
        document.getElementById('user-type-input').value = user.user_type;
        document.getElementById('user-identity-input').value = user.identity_number || '';
        
        passwordLabel.textContent = 'Password (Kosongkan jika tidak diubah)';
        passwordInput.required = false;
    } else {
        title.textContent = 'Tambah Pengguna Baru';
        document.getElementById('user-id-input').value = '';
        
        passwordLabel.textContent = 'Password';
        passwordInput.required = true;
    }

    updateUserIdentityLabel();
    modal.classList.remove('hidden');
}

function closeUserModal() {
    document.getElementById('user-modal-overlay').classList.add('hidden');
}

function updateUserIdentityLabel() {
    const userType = document.getElementById('user-type-input').value;
    const label = document.getElementById('user-identity-label');
    const input = document.getElementById('user-identity-input');

    if (userType === 'mahasiswa') {
        label.innerHTML = 'Nomor Induk Mahasiswa (NIM)';
        input.placeholder = 'Masukkan NIM';
        input.required = true;
    } else if (userType === 'dosen') {
        label.innerHTML = 'Nomor Induk Pegawai (NIP)';
        input.placeholder = 'Masukkan NIP';
        input.required = true;
    } else {
        label.innerHTML = 'Nomor Identitas (KTP)';
        input.placeholder = 'Masukkan KTP';
        input.required = false;
    }
}

async function handleSaveUser(e) {
    e.preventDefault();
    const id = document.getElementById('user-id-input').value;
    const username = document.getElementById('user-username-input').value;
    const fullName = document.getElementById('user-fullname-input').value;
    const password = document.getElementById('user-password-input').value;
    const phone = document.getElementById('user-phone-input').value;
    const userType = document.getElementById('user-type-input').value;
    const identityNumber = document.getElementById('user-identity-input').value;

    const payload = { username, password, fullName, userType, identityNumber, phone };

    try {
        let res;
        if (id) {
            res = await fetch(`/api/users/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
        const data = await res.json();

        if (res.ok) {
            alert(data.message || 'Data pengguna berhasil disimpan.');
            closeUserModal();
            loadAdminUsers();
        } else {
            alert(data.error || 'Gagal menyimpan data pengguna.');
        }
    } catch (err) {
        console.error(err);
        alert('Gagal menghubungi server.');
    }
}

async function deleteUser(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini? Semua data penyewaan terkait akan ikut terhapus.')) return;
    try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            alert(data.message || 'Pengguna berhasil dihapus.');
            loadAdminUsers();
        } else {
            alert(data.error || 'Gagal menghapus pengguna.');
        }
    } catch (err) {
        console.error(err);
        alert('Server error.');
    }
}

// ==========================================
// Booking Reschedule / Edit Modal & Actions
// ==========================================
function openBookingModal(booking) {
    const modal = document.getElementById('booking-modal-overlay');
    document.getElementById('edit-booking-id-input').value = booking.id;
    document.getElementById('edit-book-field').value = booking.field_id;
    document.getElementById('edit-book-date').value = booking.booking_date;
    document.getElementById('edit-book-start').value = booking.start_time;
    document.getElementById('edit-book-end').value = booking.end_time;

    updateEditPriceEstimator();
    modal.classList.remove('hidden');
}

function closeBookingModal() {
    document.getElementById('booking-modal-overlay').classList.add('hidden');
}

function updateEditPriceEstimator() {
    const fieldId = document.getElementById('edit-book-field').value;
    const startHour = parseInt(document.getElementById('edit-book-start').value);
    const endHour = parseInt(document.getElementById('edit-book-end').value);

    const estDuration = document.getElementById('edit-est-duration');
    const estRate = document.getElementById('edit-est-rate');
    const estTotal = document.getElementById('edit-est-total');

    if (!fieldId) {
        estDuration.textContent = '0 Jam';
        estRate.textContent = 'Rp 0';
        estTotal.textContent = 'Rp 0';
        return;
    }

    const field = state.fields.find(f => f.id == fieldId);
    if (!field) return;

    estRate.textContent = `${formatRupiah(field.price_per_hour)}`;

    const duration = endHour - startHour;
    if (duration <= 0) {
        estDuration.textContent = 'Durasi tidak valid';
        estTotal.textContent = 'Rp 0';
        return;
    }

    estDuration.textContent = `${duration} Jam`;
    const totalPrice = duration * field.price_per_hour;
    estTotal.textContent = formatRupiah(totalPrice);
}

async function handleSaveEditBooking(e) {
    e.preventDefault();
    const id = document.getElementById('edit-booking-id-input').value;
    const fieldId = document.getElementById('edit-book-field').value;
    const bookingDate = document.getElementById('edit-book-date').value;
    const startTime = document.getElementById('edit-book-start').value;
    const endTime = document.getElementById('edit-book-end').value;

    try {
        const res = await fetch(`/api/bookings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fieldId, bookingDate, startTime, endTime })
        });
        const data = await res.json();

        if (res.ok) {
            alert(data.message || 'Jadwal penyewaan berhasil diubah.');
            closeBookingModal();
            
            // Reload context dashboard
            if (state.activeView === 'view-admin-dashboard') {
                loadAdminBookings();
            } else {
                loadRenterDashboard();
            }
        } else {
            alert(data.error || 'Gagal mengubah jadwal penyewaan.');
        }
    } catch (err) {
        console.error(err);
        alert('Gagal menghubungi server.');
    }
}

async function cancelBooking(id) {
    if (!confirm('Apakah Anda yakin ingin membatalkan pemesanan ini?')) return;
    try {
        const res = await fetch(`/api/bookings/${id}/cancel`, { method: 'PUT' });
        const data = await res.json();
        if (res.ok) {
            alert(data.message || 'Pemesanan dibatalkan.');
            loadRenterDashboard();
        } else {
            alert(data.error || 'Gagal membatalkan pemesanan.');
        }
    } catch (err) {
        console.error(err);
        alert('Server error.');
    }
}

async function deleteBooking(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus data booking ini secara PERMANEN dari database?')) return;
    try {
        const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            alert(data.message || 'Penyewaan berhasil dihapus permanen.');
            loadAdminBookings();
        } else {
            alert(data.error || 'Gagal menghapus penyewaan.');
        }
    } catch (err) {
        console.error(err);
        alert('Server error.');
    }
}

// ==========================================
// 10. INVOICE / RECEIPT GENERATOR MODAL
// ==========================================

function showInvoiceModal(booking) {
    const modal = document.getElementById('invoice-modal-overlay');
    const body = document.getElementById('invoice-modal-body');

    const duration = booking.end_time - booking.start_time;
    const timeRange = `${formatHour(booking.start_time)} - ${formatHour(booking.end_time)}`;
    const isPaid = booking.payment_status === 'paid';
    
    // Construct dynamic invoice HTML
    body.innerHTML = `
        <div class="invoice-header-block">
            <h2>POLINELA MINISOCCER</h2>
            <p style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">Kuitansi Pembayaran Lapangan Resmi</p>
            <div style="margin-top: 15px; font-weight: 700; color: var(--neon-green); font-size: 13px;">
                KODE SEWA: #MS-${booking.id}
            </div>
        </div>

        <div class="invoice-grid-details">
            <div>
                <span class="invoice-row-title">Penyewa</span>
                <span class="invoice-row-val">${booking.full_name}</span>
            </div>
            <div>
                <span class="invoice-row-title">Kategori Pengguna</span>
                <span class="invoice-row-val" style="text-transform: uppercase;">${booking.user_type}</span>
            </div>
            <div>
                <span class="invoice-row-title">No. Identitas</span>
                <span class="invoice-row-val">${booking.identity_number || '-'}</span>
            </div>
            <div>
                <span class="invoice-row-title">No. Telepon / WA</span>
                <span class="invoice-row-val">${booking.phone}</span>
            </div>
            <div>
                <span class="invoice-row-title">Tanggal Booking</span>
                <span class="invoice-row-val">${formatDateIndo(booking.booking_date)}</span>
            </div>
            <div>
                <span class="invoice-row-title">Waktu Sewa</span>
                <span class="invoice-row-val">${timeRange} (${duration} Jam)</span>
            </div>
        </div>

        <table class="invoice-table-charges">
            <thead>
                <tr>
                    <th>Deskripsi Layanan</th>
                    <th style="text-align: right;">Biaya / Jam</th>
                    <th style="text-align: right;">Durasi</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>${booking.field_name}</strong><br><span style="font-size:11px; color:var(--text-secondary);">${booking.field_type}</span></td>
                    <td style="text-align: right;">${formatRupiah(booking.price_per_hour || (booking.total_price/duration))}</td>
                    <td style="text-align: right;">${duration} Jam</td>
                    <td style="text-align: right;">${formatRupiah(booking.total_price)}</td>
                </tr>
                <tr class="total-row">
                    <td colspan="3" style="text-align: right; text-transform: uppercase;">Jumlah Tagihan</td>
                    <td style="text-align: right;">${formatRupiah(booking.total_price)}</td>
                </tr>
            </tbody>
        </table>

        <div style="display:flex; justify-content:space-between; margin-bottom: 20px; font-size:13px;">
            <div>
                <span class="invoice-row-title">Metode Pembayaran</span>
                <span class="invoice-row-val" style="text-transform: uppercase;">${booking.payment_method}</span>
            </div>
            <div style="text-align: right;">
                <span class="invoice-row-title">Status Transaksi</span>
                <span class="invoice-row-val text-neon" style="font-weight: 800; font-size: 16px;">
                    ${isPaid ? 'LUNAS / PAID' : 'PENDING PEMBAYARAN'}
                </span>
            </div>
        </div>

        <div class="invoice-footer-notes">
            <p>Terima kasih telah menyewa lapangan minisoccer Polinela.</p>
            <p style="margin-top: 3px; font-size:10px; color: var(--text-muted);">Simpan kuitansi digital ini sebagai bukti pemesanan yang sah.</p>
        </div>
    `;

    modal.classList.remove('hidden');
}

function closeInvoiceModal() {
    document.getElementById('invoice-modal-overlay').classList.add('hidden');
}


// ==========================================
// 11. APP INITIALIZATION & EVENT BINDING
// ==========================================

function initApp() {
    // Check Active Session
    checkSession();
    
    // Initial fetch
    loadFields();

    // 1. Navigation Bindings
    document.getElementById('nav-brand').addEventListener('click', () => switchView('view-landing'));
    document.getElementById('nav-home').addEventListener('click', () => switchView('view-landing'));
    document.getElementById('nav-schedule').addEventListener('click', () => switchView('view-schedule'));
    document.getElementById('nav-renter-dashboard').addEventListener('click', () => switchView('view-renter-dashboard'));
    document.getElementById('nav-admin-dashboard').addEventListener('click', () => switchView('view-admin-dashboard'));

    document.getElementById('hero-btn-book').addEventListener('click', () => {
        if (state.currentUser) {
            switchView('view-renter-dashboard');
        } else {
            switchView('view-login');
        }
    });

    document.getElementById('hero-btn-schedule').addEventListener('click', () => {
        switchView('view-schedule');
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('sched-date-input').value = today;
        if (state.fields.length > 0) {
            document.getElementById('sched-field-select').value = state.fields[0].id;
        }
        loadScheduleGrid();
    });

    // 2. Auth view redirect links
    document.getElementById('link-go-to-register').addEventListener('click', () => switchView('view-register'));
    document.getElementById('link-go-to-login').addEventListener('click', () => switchView('view-login'));

    // 3. Auth Form Event Listeners
    document.getElementById('form-login').addEventListener('submit', handleLogin);
    document.getElementById('form-register').addEventListener('submit', handleRegister);
    document.getElementById('reg-usertype').addEventListener('change', updateRegisterIdentityLabel);

    // 4. Schedule Checker Filters
    document.getElementById('btn-check-schedule').addEventListener('click', loadScheduleGrid);
    
    // Set default date in Schedule checker to today
    document.getElementById('sched-date-input').value = new Date().toISOString().split('T')[0];

    // 5. Booking Form listeners
    document.getElementById('form-booking').addEventListener('submit', handleNewBooking);
    
    // Populate start/end hours dynamically in the booking form
    const startSelect = document.getElementById('book-start');
    const endSelect = document.getElementById('book-end');
    
    let startOptions = '';
    for (let h = 8; h <= 22; h++) {
        startOptions += `<option value="${h}">${formatHour(h)}</option>`;
    }
    startSelect.innerHTML = startOptions;

    let endOptions = '';
    for (let h = 9; h <= 23; h++) {
        endOptions += `<option value="${h}">${formatHour(h)}</option>`;
    }
    endSelect.innerHTML = endOptions;

    startSelect.addEventListener('change', () => {
        const val = parseInt(startSelect.value);
        // Force end time to be at least start time + 1
        if (parseInt(endSelect.value) <= val) {
            endSelect.value = val + 1;
        }
        updatePriceEstimator();
    });

    endSelect.addEventListener('change', () => {
        const endVal = parseInt(endSelect.value);
        const startVal = parseInt(startSelect.value);
        if (endVal <= startVal) {
            startSelect.value = endVal - 1;
        }
        updatePriceEstimator();
    });

    document.getElementById('book-field').addEventListener('change', updatePriceEstimator);

    // Populate start/end hours in booking edit modal
    const editStartSelect = document.getElementById('edit-book-start');
    const editEndSelect = document.getElementById('edit-book-end');
    editStartSelect.innerHTML = startOptions;
    editEndSelect.innerHTML = endOptions;

    editStartSelect.addEventListener('change', () => {
        const val = parseInt(editStartSelect.value);
        if (parseInt(editEndSelect.value) <= val) {
            editEndSelect.value = val + 1;
        }
        updateEditPriceEstimator();
    });

    editEndSelect.addEventListener('change', () => {
        const endVal = parseInt(editEndSelect.value);
        const startVal = parseInt(editStartSelect.value);
        if (endVal <= startVal) {
            editStartSelect.value = endVal - 1;
        }
        updateEditPriceEstimator();
    });

    document.getElementById('edit-book-field').addEventListener('change', updateEditPriceEstimator);

    // Mobile Navbar Hamburguer Toggle
    document.getElementById('btn-mobile-menu-toggle').addEventListener('click', () => {
        document.getElementById('nav-menu-wrapper').classList.toggle('active');
    });

    // 6. Admin Panel Sidebar Tabs
    document.getElementById('admin-tab-bookings').addEventListener('click', (e) => {
        e.preventDefault();
        switchAdminTab('admin-tab-bookings', 'admin-panel-bookings');
    });
    document.getElementById('admin-tab-fields').addEventListener('click', (e) => {
        e.preventDefault();
        switchAdminTab('admin-tab-fields', 'admin-panel-fields');
    });
    document.getElementById('admin-tab-users').addEventListener('click', (e) => {
        e.preventDefault();
        switchAdminTab('admin-tab-users', 'admin-panel-users');
    });
    document.getElementById('admin-tab-reports').addEventListener('click', (e) => {
        e.preventDefault();
        switchAdminTab('admin-tab-reports', 'admin-panel-reports');
    });

    // 7. Admin Bookings search and reset
    document.getElementById('btn-admin-search').addEventListener('click', loadAdminBookings);
    document.getElementById('btn-admin-reset').addEventListener('click', () => {
        document.getElementById('admin-search-name').value = '';
        document.getElementById('admin-filter-date').value = '';
        document.getElementById('admin-filter-status').value = '';
        loadAdminBookings();
    });

    // 8. Admin Field CRUD triggers
    document.getElementById('btn-admin-add-field').addEventListener('click', () => openFieldModal());
    document.getElementById('btn-close-field-modal').addEventListener('click', closeFieldModal);
    document.getElementById('btn-cancel-field-modal').addEventListener('click', closeFieldModal);
    document.getElementById('form-admin-field').addEventListener('submit', handleSaveField);

    // Admin User CRUD triggers
    document.getElementById('btn-admin-add-user').addEventListener('click', () => openUserModal());
    document.getElementById('btn-close-user-modal').addEventListener('click', closeUserModal);
    document.getElementById('btn-cancel-user-modal').addEventListener('click', closeUserModal);
    document.getElementById('form-admin-user').addEventListener('submit', handleSaveUser);
    document.getElementById('user-type-input').addEventListener('change', updateUserIdentityLabel);

    // Booking Edit Reschedule triggers
    document.getElementById('btn-close-booking-modal').addEventListener('click', closeBookingModal);
    document.getElementById('btn-cancel-booking-modal').addEventListener('click', closeBookingModal);
    document.getElementById('form-edit-booking').addEventListener('submit', handleSaveEditBooking);

    // 9. Admin Reports Filter triggers
    document.getElementById('btn-filter-reports').addEventListener('click', loadReportsSummary);
    document.getElementById('btn-reset-reports').addEventListener('click', () => {
        document.getElementById('report-start-date').value = '';
        document.getElementById('report-end-date').value = '';
        loadReportsSummary();
    });

    // Set printable signatures current date on load
    document.getElementById('print-current-date').textContent = new Date().toLocaleDateString('id-ID', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    document.getElementById('btn-print-report').addEventListener('click', () => {
        window.print();
    });

    // 10. Receipt Invoice Modal close triggers
    document.getElementById('btn-close-invoice-modal').addEventListener('click', closeInvoiceModal);
    document.getElementById('btn-close-invoice-action').addEventListener('click', closeInvoiceModal);
}

// Start client app when DOM loads
document.addEventListener('DOMContentLoaded', initApp);
