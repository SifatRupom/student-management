const API_URL = '/api';

// DOM Elements
const pages = document.querySelectorAll('.page-section');
const navLinks = document.querySelectorAll('.nav-links li');
const dateDisplay = document.getElementById('current-date');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toast-msg');
const mainApp = document.getElementById('main-app');
const authOverlay = document.getElementById('auth-overlay');

// Auth DOM
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authDesc = document.getElementById('auth-desc');
const toggleAuth = document.getElementById('toggle-auth');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const displayUsername = document.getElementById('display-username');

// Form Elements
const formAddStudent = document.getElementById('add-student-form');
const formAddPayment = document.getElementById('add-payment-form');

let isLoginMode = true;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    updateDate();
    checkAuth();

    // Toggle between Login & Register
    toggleAuth.addEventListener('click', () => {
        setAuthMode(!isLoginMode);
    });

    authForm.addEventListener('submit', handleAuthSubmit);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    // Profile Picture Upload
    const profileImg = document.getElementById('profile-img');
    const profileUpload = document.getElementById('profile-upload');
    const imgContainer = document.querySelector('.profile-img-container');

    if (imgContainer) {
        imgContainer.addEventListener('click', () => profileUpload.click());
    }

    if (profileUpload) {
        profileUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target.result;

                    // 1. Update UI
                    profileImg.src = base64;

                    // 2. Save to Server
                    const user = JSON.parse(localStorage.getItem('scholar_user'));
                    if (user) {
                        fetch(`${API_URL}/user/profile-pic`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username: user.username, profilePic: base64 })
                        })
                            .then(res => res.json())
                            .then(data => {
                                if (data.success) {
                                    user.profilePic = base64;
                                    localStorage.setItem('scholar_user', JSON.stringify(user));
                                    showToast('Profile picture saved permanently!');
                                }
                            })
                            .catch(err => showToast('Error saving profile pic', true));
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Navigation setup
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.getElementById('btn-menu-toggle');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }

    // Student Detail Edit Logic
    const btnEdit = document.getElementById('btn-edit-student');
    const btnSaveEdit = document.getElementById('btn-save-edit');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    const detViewMode = document.getElementById('det-view-mode');
    const detEditMode = document.getElementById('det-edit-mode');
    const detAvatarContainer = document.getElementById('det-avatar-container');
    const detPhotoUpload = document.getElementById('det-photo-upload');
    const detProfileImg = document.getElementById('det-profile-img');

    if (btnEdit) {
        btnEdit.addEventListener('click', () => {
            detViewMode.classList.add('hidden');
            detEditMode.classList.remove('hidden');
            // Pre-fill edit fields
            document.getElementById('edit-name').value = document.getElementById('det-name').innerText;
            document.getElementById('edit-guardian').value = document.getElementById('det-guardian').innerText;
            document.getElementById('edit-phone').value = document.getElementById('det-phone').innerText;
            document.getElementById('edit-batch').value = document.getElementById('det-batch').innerText;
            document.getElementById('edit-address').value = document.getElementById('det-address').innerText;
        });
    }

    if (btnCancelEdit) {
        btnCancelEdit.addEventListener('click', () => {
            detViewMode.classList.remove('hidden');
            detEditMode.classList.add('hidden');
        });
    }

    if (btnSaveEdit) {
        btnSaveEdit.addEventListener('click', handleSaveStudentEdit);
    }

    if (detAvatarContainer) {
        detAvatarContainer.addEventListener('click', () => detPhotoUpload.click());
    }

    if (detPhotoUpload) {
        detPhotoUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const base64 = event.target.result;
                    detProfileImg.src = base64;
                    const id = document.getElementById('det-id').innerText;

                    try {
                        const res = await fetch(`${API_URL}/students/${id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ profile_pic: base64 })
                        });
                        if (res.ok) showToast('Student photo updated!');
                    } catch (err) { showToast('Error updating photo', true); }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const target = link.dataset.target;
            switchTab(target);
            document.getElementById('page-title').innerText = link.innerText;

            if (target === 'due-payments') {
                loadDuePayments();
            }

            // Close sidebar on mobile after clicking a link
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                sidebarOverlay.classList.remove('active');
            }
        });
    });

    // Attendance sub-tabs
    const btnDaily = document.getElementById('tab-attendance-daily');
    const btnHistory = document.getElementById('tab-attendance-history');
    const viewDaily = document.getElementById('view-attendance-daily');
    const viewHistory = document.getElementById('view-attendance-history');

    if (btnDaily) {
        btnDaily.addEventListener('click', () => {
            btnDaily.classList.add('active');
            btnHistory.classList.remove('active');
            viewDaily.classList.remove('hidden');
            viewHistory.classList.add('hidden');
        });
    }

    if (btnHistory) {
        btnHistory.addEventListener('click', () => {
            btnHistory.classList.add('active');
            btnDaily.classList.remove('active');
            viewHistory.classList.remove('hidden');
            viewDaily.classList.add('hidden');
            loadAttendanceHistory();
        });
    }

    if (document.getElementById('btn-fetch-history')) {
        document.getElementById('btn-fetch-history').addEventListener('click', loadAttendanceHistory);
    }

    // Form Submits
    if (formAddStudent) formAddStudent.addEventListener('submit', handleAddStudent);
    if (formAddPayment) formAddPayment.addEventListener('submit', handleAddPayment);

    // Search
    document.getElementById('btn-search-id').addEventListener('click', handleSearchStudent);
    document.getElementById('filter-students').addEventListener('input', filterStudents);

    document.getElementById('btn-back').addEventListener('click', () => {
        navLinks.forEach(l => l.classList.remove('active'));
        document.querySelector('[data-target="dashboard"]').classList.add('active');
        switchTab('dashboard');
        document.getElementById('page-title').innerText = 'Dashboard';
    });

    const bellBtn = document.getElementById('bell-btn');
    if (bellBtn) {
        bellBtn.addEventListener('click', () => {
            showToast('You have no new notifications');
        });
    }

    const setBtn = document.getElementById('settings-btn');
    if (setBtn) {
        setBtn.addEventListener('click', () => {
            showToast('Settings access restricted to Admin');
        });
    }

    // Initial Data Loads
    loadStudents('active');
    initTheme();

    // Theme Toggle
    document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);

    // Export Buttons
    document.getElementById('btn-export-recent')?.addEventListener('click', () => exportData('recent'));
    document.getElementById('btn-export-list')?.addEventListener('click', () => exportData('active'));
    document.getElementById('btn-export-alumni')?.addEventListener('click', () => exportData('old'));

    // Refresh Due Payments (with Toast)
    const btnRefreshDue = document.getElementById('btn-refresh-due');
    if (btnRefreshDue) {
        btnRefreshDue.addEventListener('click', () => {
            showToast('Refreshing Due Payments...');
            loadDuePayments();
        });
    }

    // Attendance
    document.getElementById('attendance-date').valueAsDate = new Date();
    document.getElementById('attendance-date').addEventListener('change', (e) => loadAttendanceForDate(e.target.value));
    document.getElementById('btn-save-attendance').addEventListener('click', saveAttendance);
});

function setAuthMode(isLogin) {
    isLoginMode = isLogin;
    authTitle.innerText = isLoginMode ? 'Sign In' : 'Sign Up';
    authDesc.innerText = isLoginMode ? 'Welcome back! Please enter your details.' : 'Create an account to access the system.';
    authSubmitBtn.innerText = isLoginMode ? 'Login to System' : 'Create Account';
    toggleAuth.innerText = isLoginMode ? "Don't have an account? Register" : "Already have an account? Sign In";
}

function updateDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.innerText = new Date().toLocaleDateString('en-US', options);
}

function switchTab(targetId) {
    const backBtn = document.getElementById('btn-back');
    pages.forEach(page => page.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');

    // Handle Back Button Visibility
    if (backBtn) {
        if (targetId === 'dashboard') {
            backBtn.classList.add('hidden');
        } else {
            backBtn.classList.remove('hidden');
        }
    }

    // Trigger loads based on tab
    if (targetId === 'dashboard') loadDashboardStats();
    if (targetId === 'student-list') loadStudents('active');
    if (targetId === 'old-students') loadStudents('old');
    if (targetId === 'attendance') loadAttendanceForDate(document.getElementById('attendance-date').value);
}

let toastTimeout;
function showToast(message, isError = false) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastMsg.innerText = message;
    toast.className = `toast ${isError ? 'error-toast' : ''}`;
    toast.classList.remove('hidden');
    toastTimeout = setTimeout(() => { toast.classList.add('hidden'); }, 4000);
}

// --- API Calls ---

async function loadDashboardStats() {
    try {
        // Fetch real stats
        const statsRes = await fetch(`${API_URL}/stats`);
        const stats = await statsRes.json();

        // Fetch recent students for the table
        const studentsRes = await fetch(`${API_URL}/students?status=active`);
        const studentsData = await studentsRes.json();

        // Update DOM
        document.getElementById('stat-total-students').innerText = stats.totalActive || 0;
        document.getElementById('stat-old-students').innerText = stats.totalAlumni || 0;
        document.getElementById('stat-total-payments').innerText = stats.totalPayments || 0;

        // Populate recent table (taking first 5)
        const tbody = document.querySelector('#recent-students-table tbody');
        tbody.innerHTML = '';
        studentsData.students.slice(0, 5).forEach(s => {
            tbody.innerHTML += `
                <tr>
                    <td><span class="badge">${s.id}</span></td>
                    <td>${s.name}</td>
                    <td>${s.batch || '-'}</td>
                    <td>${new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
            `;
        });

    } catch (err) {
        console.error("Dashboard error:", err);
    }
}

async function handleAddStudent(e) {
    if (e) e.preventDefault();

    const photoUpload = document.getElementById('stu-photo-upload');
    let profile_pic = null;

    if (photoUpload && photoUpload.files && photoUpload.files[0]) {
        const file = photoUpload.files[0];
        profile_pic = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsDataURL(file);
        });
    }

    const payload = {
        id: document.getElementById('stu-id').value,
        name: document.getElementById('stu-name').value,
        guardian_name: document.getElementById('stu-guardian').value,
        phone: document.getElementById('stu-phone').value,
        address: document.getElementById('stu-address').value,
        batch: document.getElementById('stu-batch').value,
        profile_pic: profile_pic
    };

    try {
        const res = await fetch(`${API_URL}/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) {
            showToast('Student registered successfully!');
            formAddStudent.reset();
            loadDashboardStats();
            loadStudents('active');
            switchTab('dashboard');
        } else {
            showToast(data.error || 'Failed to add student', true);
        }
    } catch (err) { showToast('Connection Error', true); }
}

async function handleSaveStudentEdit() {
    const id = document.getElementById('det-id').innerText;
    const name = document.getElementById('edit-name').value;
    const guardian_name = document.getElementById('edit-guardian').value;
    const phone = document.getElementById('edit-phone').value;
    const batch = document.getElementById('edit-batch').value;
    const address = document.getElementById('edit-address').value;

    try {
        const res = await fetch(`${API_URL}/students/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, guardian_name, phone, address, batch })
        });
        if (res.ok) {
            showToast('Student details updated!');
            detViewMode.classList.remove('hidden');
            detEditMode.classList.add('hidden');
            handleSearchStudent(); // Refresh view
        } else {
            const data = await res.json();
            showToast(data.error, true);
        }
    } catch (err) { showToast('Error saving changes', true); }
}

async function loadDuePayments() {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const now = new Date();
    const currentMonth = months[now.getMonth()];
    const currentYear = now.getFullYear().toString();

    const titleEl = document.getElementById('due-month-title');
    if (titleEl) titleEl.innerText = `Students who haven't paid for ${currentMonth}, ${currentYear}`;

    try {
        const res = await fetch(`${API_URL}/payments/due?month=${currentMonth}&year=${currentYear}`);
        const data = await res.json();

        const tbody = document.querySelector('#due-students-table tbody');
        tbody.innerHTML = '';

        if (!data.due_students || data.due_students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px; color: var(--text-muted);">All active students have paid for this month! 🎊</td></tr>';
            return;
        }

        data.due_students.forEach(s => {
            const statusLabel = s.manual_status || 'due';
            const isClear = statusLabel === 'clear';

            tbody.innerHTML += `
                <tr>
                    <td><span class="badge">${s.id}</span></td>
                    <td><strong>${s.name}</strong></td>
                    <td>${s.phone || '-'}</td>
                    <td>${s.batch || '-'}</td>
                    <td>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn glass-btn-green ${isClear ? 'active' : ''}" onclick="toggleDueStatus('${s.id}', 'clear')">
                                <i class='bx bx-check'></i> Paid
                            </button>
                            <button class="btn glass-btn-red ${!isClear ? 'active' : ''}" onclick="toggleDueStatus('${s.id}', 'due')">
                                <i class='bx bx-x'></i> Due
                            </button>
                        </div>
                    </td>
                </tr>

            `;
        });
    } catch (err) {
        console.error('Load due error:', err);
        showToast('Error loading due payments', true);
    }
}

window.toggleDueStatus = async function (studentId, status) {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const now = new Date();
    const month = months[now.getMonth()];
    const year = now.getFullYear().toString();

    try {
        const res = await fetch(`${API_URL}/payments/due/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId, month, year, status })
        });
        if (res.ok) {
            loadDuePayments();
        } else {
            showToast('Failed to update status', true);
        }
    } catch (err) { showToast('Error updating status', true); }
};

window.payDue = function (id) {
    navLinks.forEach(l => l.classList.remove('active'));
    document.querySelector('[data-target="payments"]').classList.add('active');
    switchTab('payments');
    document.getElementById('page-title').innerText = 'Payments';
    document.getElementById('pay-stu-id').value = id;
}

async function loadStudents(status) {
    try {
        const res = await fetch(`${API_URL}/students?status=${status}`);
        const data = await res.json();

        const tableId = status === 'active' ? 'all-students-table' : 'old-students-table';
        const tbody = document.querySelector(`#${tableId} tbody`);
        tbody.innerHTML = '';

        data.students.forEach(s => {
            const actions = status === 'active' ? `
                <button class="btn btn-small btn-outline" onclick="goToSearch('${s.id}')">View</button>
            ` : `
                <button class="btn btn-small btn-outline" onclick="goToSearch('${s.id}')">View</button>
            `;

            tbody.innerHTML += `
                <tr class="student-row" data-name="${s.name.toLowerCase()}" data-id="${s.id.toLowerCase()}">
                    <td><span class="badge">${s.id}</span></td>
                    <td><strong>${s.name}</strong></td>
                    <td>${s.phone || '-'}</td>
                    <td>${s.batch || '-'}</td>
                    <td>${actions}</td>
                </tr>
            `;
        });
    } catch (err) { console.error('Load students error:', err); }
}

function filterStudents(e) {
    const term = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('.student-row');
    rows.forEach(row => {
        const match = row.dataset.name.includes(term) || row.dataset.id.includes(term);
        row.style.display = match ? '' : 'none';
    });
}

// Global scope definition for onclick handlers
window.goToSearch = function (id) {
    navLinks.forEach(l => l.classList.remove('active'));
    document.querySelector('[data-target="search-student"]').classList.add('active');
    switchTab('search-student');
    document.getElementById('page-title').innerText = 'Search ID';

    document.getElementById('search-input-id').value = id;
    handleSearchStudent();
}

async function handleSearchStudent() {
    const id = document.getElementById('search-input-id').value.trim();
    if (!id) return;

    try {
        const res = await fetch(`${API_URL}/students/${id}`);
        const data = await res.json();

        if (res.ok) {
            document.getElementById('search-result-container').classList.remove('hidden');

            // Populate Details
            document.getElementById('det-name').innerText = data.student.name;
            document.getElementById('det-id').innerText = data.student.id;
            document.getElementById('det-guardian').innerText = data.student.guardian_name || '-';
            document.getElementById('det-phone').innerText = data.student.phone || '-';
            document.getElementById('det-batch').innerText = data.student.batch || '-';
            document.getElementById('det-address').innerText = data.student.address || '-';

            // Profile Picture
            const detProfileImg = document.getElementById('det-profile-img');
            if (data.student.profile_pic) {
                detProfileImg.src = data.student.profile_pic;
            } else {
                detProfileImg.src = `https://ui-avatars.com/api/?name=${data.student.name}&background=random`;
            }

            // Reset view mode
            document.getElementById('det-view-mode').classList.remove('hidden');
            document.getElementById('det-edit-mode').classList.add('hidden');

            // Setup buttons
            const btnMarkOld = document.getElementById('btn-mark-old');
            if (data.student.status === 'old') {
                btnMarkOld.innerText = "Restore Active";
                btnMarkOld.onclick = () => updateStatus(id, 'active');
            } else {
                btnMarkOld.innerText = "Mark as Alumni";
                btnMarkOld.onclick = () => updateStatus(id, 'old');
            }

            document.getElementById('btn-delete').onclick = () => deleteStudent(id);

            // Populate Payments
            const ptbody = document.getElementById('det-payments-body');
            ptbody.innerHTML = '';

            if (data.payments.length === 0) {
                ptbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted)">No payment records found.</td></tr>';
            } else {
                data.payments.forEach(p => {
                    ptbody.innerHTML += `
                        <tr>
                            <td>${p.date}</td>
                            <td>${p.month} ${p.year}</td>
                            <td style="color:var(--success)">৳ ${p.amount}</td>
                            <td>
                                <button class="btn btn-small btn-outline" onclick='downloadReceipt(${JSON.stringify(p)}, "${data.student.name}")' title="Download Receipt">
                                    <i class='bx bx-printer'></i>
                                </button>
                                ${p.note || '-'}
                            </td>
                        </tr>
                    `;
                });
            }

        } else {
            showToast('Student not found!', true);
            document.getElementById('search-result-container').classList.add('hidden');
        }
    } catch (err) { showToast('Connection Error', true); }
}

async function handleAddPayment(e) {
    e.preventDefault();
    const payload = {
        student_id: document.getElementById('pay-stu-id').value,
        amount: document.getElementById('pay-amount').value,
        date: document.getElementById('pay-date').value,
        month: document.getElementById('pay-month').value,
        year: document.getElementById('pay-year').value,
        note: document.getElementById('pay-note').value
    };

    try {
        const res = await fetch(`${API_URL}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) {
            showToast('Payment Added Successfully!');
            formAddPayment.reset();
        } else {
            showToast(data.error || 'Failed to add payment', true);
        }
    } catch (err) { showToast('Connection Error', true); }
}

async function updateStatus(id, newStatus) {
    if (!confirm(`Are you sure you want to mark this student as ${newStatus}?`)) return;
    try {
        const res = await fetch(`${API_URL}/students/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
            showToast(`Student updated to ${newStatus}`);
            handleSearchStudent(); // refresh
        }
    } catch (err) { showToast('Error updating status', true); }
}

async function deleteStudent(id) {
    if (!confirm("WARNING! This will permanently delete the student and all their payment records. Continue?")) return;
    try {
        const res = await fetch(`${API_URL}/students/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            showToast("Student deleted permanently");
            document.getElementById('search-result-container').classList.add('hidden');
        } else {
            showToast(data.error, true);
        }
    } catch (err) { showToast('Error deleting student', true); }
}

// --- Auth Functions ---

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('scholar_user'));
    if (user) {
        authOverlay.style.display = 'none';
        mainApp.classList.remove('hidden');
        displayUsername.innerText = user.username;
        if (user.profilePic) {
            document.getElementById('profile-img').src = user.profilePic;
        }
        loadDashboardStats();
        loadStudents('active');
    } else {
        authOverlay.style.display = 'flex';
        mainApp.classList.add('hidden');
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('auth-username').value;
    const password = document.getElementById('auth-password').value;
    const endpoint = isLoginMode ? '/login' : '/register';

    console.log(`[AUTH] Attempting ${isLoginMode ? 'Login' : 'Registration'} for: ${username}`);

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        console.log(`[AUTH] Server responded with:`, data);

        if (res.ok) {
            if (isLoginMode) {
                localStorage.setItem('scholar_user', JSON.stringify(data.user));
                showToast('Login Successful!');
                checkAuth();
            } else {
                showToast('Registration successful! Please login.');
                setAuthMode(true);
            }
            authForm.reset();
        } else {
            showToast(data.error || 'Auth failed', true);
        }
    } catch (err) {
        console.error(`[AUTH] Frontend error:`, err);
        showToast('Authentication Error', true);
    }
}

function handleLogout() {
    localStorage.removeItem('scholar_user');
    showToast('Logged out successfully');
    checkAuth();
}

// --- PHASE 2 FUNCTIONS ---

// 1. ATTENDANCE LOGIC
async function loadAttendanceForDate(date) {
    if (!date) return;
    try {
        const studentsRes = await fetch(`${API_URL}/students?status=active`);
        const { students } = await studentsRes.json();

        const attendRes = await fetch(`${API_URL}/attendance?date=${date}`);
        const { attendance } = await attendRes.json();

        renderAttendanceTable(students, attendance);
    } catch (err) { console.error('Load attendance error:', err); }
}

function renderAttendanceTable(students, existingRecords) {
    const tbody = document.querySelector('#attendance-table tbody');
    tbody.innerHTML = '';

    students.forEach(s => {
        const record = existingRecords.find(r => r.student_id === s.id);
        const status = record ? record.status : 'present'; // default present
        const note = record ? record.note : '';

        tbody.innerHTML += `
            <tr data-student-id="${s.id}">
                <td>
                    <div class="user-info">
                        <strong>${s.name}</strong>
                        <small style="display:block; color:var(--text-muted)">${s.id}</small>
                    </div>
                </td>
                <td>
                    <div class="status-toggle">
                        <button class="status-btn present ${status === 'present' ? 'active' : ''}" onclick="setStatus(this, 'present')">P</button>
                        <button class="status-btn absent ${status === 'absent' ? 'active' : ''}" onclick="setStatus(this, 'absent')">A</button>
                    </div>
                </td>
                <td>
                    <input type="text" class="attendance-note" placeholder="Note..." value="${note}">
                </td>
            </tr>
        `;
    });
}

window.setStatus = function (btn, status) {
    const parent = btn.parentElement;
    parent.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

async function saveAttendance() {
    const date = document.getElementById('attendance-date').value;
    const rows = document.querySelectorAll('#attendance-table tbody tr');
    const records = [];

    rows.forEach(row => {
        const student_id = row.dataset.studentId;
        const status = row.querySelector('.status-btn.active').classList.contains('present') ? 'present' : 'absent';
        const note = row.querySelector('.attendance-note').value;
        records.push({ student_id, status, note });
    });

    try {
        const res = await fetch(`${API_URL}/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, records })
        });
        if (res.ok) showToast('Attendance saved successfully!');
    } catch (err) { showToast('Error saving attendance', true); }
}

async function loadAttendanceHistory() {
    const studentId = document.getElementById('history-student-id').value;
    const startDate = document.getElementById('history-start').value;
    const endDate = document.getElementById('history-end').value;

    let url = `${API_URL}/attendance/search?`;
    if (studentId) url += `student_id=${studentId}&`;
    if (startDate) url += `start_date=${startDate}&`;
    if (endDate) url += `end_date=${endDate}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        renderHistoryTable(data.history || []);
    } catch (err) { showToast('Error loading history', true); }
}

function renderHistoryTable(history) {
    const tbody = document.querySelector('#history-table tbody');
    tbody.innerHTML = '';

    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">No records found</td></tr>';
        return;
    }

    history.forEach(h => {
        const dateStr = new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const statusClass = h.status === 'present' ? 'status-present' : 'status-absent';
        tbody.innerHTML += `
            <tr>
                <td>${dateStr}</td>
                <td>
                    <div class="user-info">
                        <strong>${h.student_name}</strong>
                        <small style="display:block; color:var(--text-muted)">${h.student_id}</small>
                    </div>
                </td>
                <td><span class="status-badge ${statusClass}">${h.status.toUpperCase()}</span></td>
                <td>${h.note || '-'}</td>
            </tr>
        `;
    });
}

// 2. CSV EXPORT LOGIC
async function exportData(type) {
    let data = [];
    let filename = `nexus_${type}_export.csv`;

    try {
        if (type === 'recent' || type === 'active') {
            const res = await fetch(`${API_URL}/students?status=active`);
            const d = await res.json();
            data = d.students;
        } else if (type === 'old') {
            const res = await fetch(`${API_URL}/students?status=old`);
            const d = await res.json();
            data = d.students;
        }

        if (data.length === 0) return showToast('No data to export', true);

        // Simple CSV conversion
        const headers = ["ID", "Name", "Guardian", "Phone", "Batch", "Address"];
        const rows = data.map(s => [s.id, s.name, s.guardian_name, s.phone, s.batch, s.address]);

        let csvContent = headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', filename);
        a.click();
        showToast('CSV Download Started!');
    } catch (err) { showToast('Export Failed', true); }
}

// 3. PDF RECEIPT LOGIC
window.downloadReceipt = function (payment, studentName) {
    const receiptHTML = `
        <div style="padding: 40px; font-family: 'Outfit', sans-serif; color: #1a1a2e; border: 15px solid #9d4edd;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #9d4edd; margin: 0;">NEXUS SCHOLAR</h1>
                <p style="margin: 5px 0;">Official Payment Receipt</p>
            </div>
            
            <div style="margin-bottom: 40px; display: flex; justify-content: space-between;">
                <div>
                    <strong>Student Name:</strong> ${studentName}<br>
                    <strong>Student ID:</strong> ${payment.student_id}
                </div>
                <div style="text-align: right;">
                    <strong>Receipt Date:</strong> ${new Date().toLocaleDateString()}<br>
                    <strong>Payment Reference:</strong> PAY-${payment.id || 'N/A'}
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                <thead>
                    <tr style="background: #f0f2f5;">
                        <th style="padding: 15px; text-align: left; border-bottom: 2px solid #9d4edd;">Description</th>
                        <th style="padding: 15px; text-align: right; border-bottom: 2px solid #9d4edd;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 15px; border-bottom: 1px solid #ddd;">Course Fees (${payment.month} ${payment.year})</td>
                        <td style="padding: 15px; text-align: right; border-bottom: 1px solid #ddd;">৳ ${payment.amount}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr>
                        <td style="padding: 15px; text-align: right;"><strong>TOTAL PAID:</strong></td>
                        <td style="padding: 15px; text-align: right; color: #9d4edd; font-size: 20px;"><strong>৳ ${payment.amount}</strong></td>
                    </tr>
                </tfoot>
            </table>

            <div style="margin-top: 50px; text-align: center; font-size: 12px; color: #666;">
                <p>Note: ${payment.note || 'No additional remarks.'}</p>
                <p style="margin-top: 20px;">Thank you for your payment!</p>
                <p style="color: #9d4edd; margin-top: 10px;">Created by Sifat Rupom</p>
            </div>
        </div>
    `;

    const opt = {
        margin: 0.5,
        filename: `receipt_${payment.student_id}_${payment.month}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().from(receiptHTML).set(opt).save();
    showToast('Generating PDF receipt...');
}

// 4. THEME LOGIC
function initTheme() {
    const theme = localStorage.getItem('nexus_theme') || 'dark';
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        document.querySelector('#btn-theme-toggle i').className = 'bx bx-sun';
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    const icon = document.querySelector('#btn-theme-toggle i');
    icon.className = isLight ? 'bx bx-sun' : 'bx bx-moon';
    localStorage.setItem('nexus_theme', isLight ? 'light' : 'dark');
}

// Attach switchTab to window object for inline onclick handlers from HTML
window.switchTab = switchTab;
window.loadDuePayments = loadDuePayments;
