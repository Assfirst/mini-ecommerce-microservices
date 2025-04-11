// app.js (Corrected Login Fetch Options)

const API_BASE_URL = 'http://localhost:3000';

// Auth Elements
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const authStatusSpan = document.getElementById('auth-status');
const logoutButton = document.getElementById('logout-button');
const registerSection = document.getElementById('register-section');
const loginSection = document.getElementById('login-section');
const welcomeSection = document.getElementById('welcome-section');
const welcomeMessageP = document.getElementById('welcome-message');
const viewProductsButtonNav = document.getElementById('view-products-button');
const viewProductsButtonMain = document.getElementById('view-products-button-main');
const adminButtonWelcome = document.getElementById('admin-panel-button-welcome');
const showRegisterLink = document.getElementById('show-register-link');
const showLoginLink = document.getElementById('show-login-link');

// --- ฟังก์ชันสลับฟอร์ม ---
function showLoginForm() {
    if (loginSection) loginSection.classList.remove('hidden');
    if (registerSection) registerSection.classList.add('hidden');
    if (welcomeSection) welcomeSection.classList.add('hidden');
    if (registerForm) registerForm.reset();
}

function showRegisterForm() {
    if (loginSection) loginSection.classList.add('hidden');
    if (registerSection) registerSection.classList.remove('hidden');
    if (welcomeSection) welcomeSection.classList.add('hidden');
    if (loginForm) loginForm.reset();
}

function showWelcomeArea() {
     if (loginSection) loginSection.classList.add('hidden');
    if (registerSection) registerSection.classList.add('hidden');
    if (welcomeSection) welcomeSection.classList.remove('hidden');
}

// --- ฟังก์ชันจัดการสถานะ UI ตอน Login/Logout ---
function updateAuthUI() {
    const token = localStorage.getItem('authToken');
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');

    // จัดการปุ่ม Admin ใน Navbar
    let adminBtnNav = document.getElementById('admin-panel-button-nav');
    if (token && userRole === 'admin') {
        if (!adminBtnNav) {
            adminBtnNav = document.createElement('a');
            adminBtnNav.id = 'admin-panel-button-nav';
            adminBtnNav.href = 'admin.html';
            adminBtnNav.textContent = 'แอดมิน';
            adminBtnNav.className = 'btn btn-xs btn-outline btn-secondary ml-2';
             if (logoutButton) logoutButton.insertAdjacentElement('beforebegin', adminBtnNav);
             else if (viewProductsButtonNav) viewProductsButtonNav.insertAdjacentElement('afterend', adminBtnNav);
             else if (authStatusSpan) authStatusSpan.insertAdjacentElement('afterend', adminBtnNav);
        }
        if (adminBtnNav) adminBtnNav.classList.remove('hidden'); // ตรวจสอบอีกครั้งก่อน remove
    } else if (adminBtnNav) {
        adminBtnNav.classList.add('hidden');
    }


    if (token) {
        // --- ถ้ามี Token (ล็อกอินอยู่) ---
        authStatusSpan.textContent = `สวัสดี, ${userName || 'ผู้ใช้'}!`;
        if (logoutButton) logoutButton.classList.remove('hidden');
        if (viewProductsButtonNav) viewProductsButtonNav.classList.remove('hidden');
        showWelcomeArea(); // แสดง Welcome Area
        if (userRole === 'admin' && adminButtonWelcome) {
            adminButtonWelcome.classList.remove('hidden');
        } else if (adminButtonWelcome) {
            adminButtonWelcome.classList.add('hidden');
        }
        if (welcomeMessageP) {
             welcomeMessageP.textContent = `คุณเข้าสู่ระบบเรียบร้อยแล้ว${userName ? ', ' + userName : ''}! (${userRole || 'customer'})`;
        }

    } else {
        // --- ถ้าไม่มี Token (ยังไม่ล็อกอิน) ---
        authStatusSpan.textContent = 'ยังไม่ได้เข้าสู่ระบบ';
        if (logoutButton) logoutButton.classList.add('hidden');
        if (viewProductsButtonNav) viewProductsButtonNav.classList.add('hidden');
        showLoginForm(); // แสดง Login Form เป็น Default
        if (adminButtonWelcome) adminButtonWelcome.classList.add('hidden');
    }
}


// --- Event Listener สำหรับฟอร์มสมัครสมาชิก ---
if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const name = document.getElementById('reg-name').value;
        console.log('Attempting registration for:', email);
        try {
            // --- ตรวจสอบว่า fetch register มี method POST ถูกต้อง ---
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST', // <<< ต้องเป็น POST
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name: name || undefined }),
            });
            const result = await response.json();
            if (response.ok) {
                console.log('Registration successful:', result);
                Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: 'สมัครสมาชิกเรียบร้อย กรุณาเข้าสู่ระบบ', timer: 2500, showConfirmButton: false });
                registerForm.reset();
                showLoginForm();
            } else {
                console.error('Registration failed:', result);
                Swal.fire({ icon: 'error', title: 'ผิดพลาด!', text: `สมัครล้มเหลว: ${result.error || response.statusText || 'ไม่ทราบสาเหตุ'}` });
            }
        } catch (error) {
            console.error('Network or JSON error during registration:', error);
            Swal.fire({ icon: 'error', title: 'ผิดพลาด', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ' });
        }
    });
}


// --- Event Listener สำหรับฟอร์มล็อกอิน (<<< แก้ไขตรง fetch options ให้ถูกต้อง!) ---
if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        console.log('Attempting login for:', email); // Log ก่อนส่ง

        try {
            // --- จุดแก้ไขสำคัญ! ต้องใส่ method, headers, body ให้ครบ! ---
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST', // <<<---- ต้องมีอันนี้!!!
                headers: {
                    'Content-Type': 'application/json' // <<< บอกว่าเป็น JSON
                },
                body: JSON.stringify({ email, password }) // <<< ส่งข้อมูล email, password เป็น JSON string
            });
            // --- จบจุดแก้ไขสำคัญ ---

            let result;
            try {
                 result = await response.json(); // พยายามอ่าน JSON
            } catch (jsonError) {
                 console.error("Failed to parse JSON response:", jsonError);
                 const textResponse = await response.text(); // ลองอ่านเป็น text ถ้าอ่าน JSON ไม่ได้
                 console.error("Response text:", textResponse);
                 // โยน Error บอกว่า Server ตอบกลับไม่ถูกต้อง พร้อม Status
                 throw new Error(`การตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง (Status: ${response.status})`);
            }

            // เช็ค response status และข้อมูลที่จำเป็น
            if (response.ok && result.token && result.user) {
                console.log('Login successful:', result);
                localStorage.setItem('authToken', result.token);
                localStorage.setItem('userRole', result.user.role);
                if (result.user.name) localStorage.setItem('userName', result.user.name);
                else localStorage.removeItem('userName');

                // แสดง SweetAlert และ Redirect
                Swal.fire({
                    icon: 'success',
                    title: 'เข้าสู่ระบบสำเร็จ!',
                    text: 'กำลังพาไปหน้าต่อไป...',
                    timer: 1500,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    willClose: () => {
                        if (result.user.role === 'admin') {
                            window.location.href = 'admin.html';
                        } else {
                            window.location.href = 'products.html';
                        }
                    }
                });
                loginForm.reset();

            } else { // ถ้า response ไม่ ok หรือข้อมูลไม่ครบ
                console.error('Login failed:', result);
                const errorMessage = result.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือเกิดข้อผิดพลาด';
                Swal.fire({
                    icon: 'error',
                    title: 'เข้าสู่ระบบล้มเหลว',
                    text: errorMessage
                });
                localStorage.removeItem('authToken');
                localStorage.removeItem('userName');
                localStorage.removeItem('userRole');
                // ไม่ต้องเรียก updateAuthUI() เพราะยังอยู่ในหน้า Login
            }
        } catch (error) { // จับ Network error หรือ Error ที่โยนมาจาก json parsing
            console.error('Network or processing error during login:', error);
            Swal.fire({
                icon: 'error',
                title: 'ผิดพลาด',
                text: `เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้'}`
            });
            localStorage.removeItem('authToken');
            localStorage.removeItem('userName');
            localStorage.removeItem('userRole');
            // ไม่ต้องเรียก updateAuthUI()
        }
    });
}


// --- Event Listener สำหรับปุ่ม Logout ---
if (logoutButton) {
    logoutButton.addEventListener('click', () => {
        Swal.fire({ title: 'ออกจากระบบ?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#3085d6', cancelButtonColor: '#d33', confirmButtonText: 'ใช่, ออกเลย!', cancelButtonText: 'ยกเลิก'
        }).then((result) => {
            if (result.isConfirmed) {
                console.log('Logging out...');
                localStorage.clear();
                window.location.href = 'index.html';
            }
        });
    });
}


// --- Event Listener สำหรับปุ่ม "ดูสินค้า" ---
function goToProductsStore() { window.location.href = 'products.html'; }
if(viewProductsButtonNav) viewProductsButtonNav.addEventListener('click', goToProductsStore);
if(viewProductsButtonMain) viewProductsButtonMain.addEventListener('click', goToProductsStore);

// --- Event Listener สำหรับปุ่ม "Admin Panel" ใน Welcome Area ---
if(adminButtonWelcome) {
    adminButtonWelcome.addEventListener('click', () => { window.location.href = 'admin.html'; });
}

// --- Event Listener สำหรับสลับฟอร์ม ---
if (showRegisterLink) {
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterForm();
    });
}

if (showLoginLink) {
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });
}


// --- โค้ดที่รันตอนเริ่ม ---
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
});