// admin.js (Full Latest - Admin Panel Logic with Product & Banner CRUD)

const API_BASE_URL = 'http://localhost:3000'; // Gateway URL

// --- Element References ---
const adminUserInfoSpan = document.getElementById('admin-user-info');
const logoutButton = document.getElementById('logout-button-admin'); // Using specific ID for admin page logout
const adminContentDiv = document.getElementById('admin-content');
const unauthorizedMessageDiv = document.getElementById('unauthorized-message'); // Though Swal is used now

// Product Management Elements
const addProductButton = document.getElementById('add-product-button');
const productTableBody = document.getElementById('product-table-body');
const productLoadingRow = document.getElementById('product-loading-row');
const productModal = document.getElementById('product_modal');
const productForm = document.getElementById('product-form');
const productModalTitle = document.getElementById('modal-title');
const productIdInput = document.getElementById('product-id');
const saveProductButton = document.getElementById('save-product-button');

// Banner Management Elements
const addBannerButton = document.getElementById('add-banner-button');
const bannerListDiv = document.getElementById('banner-list');
const bannerLoadingPlaceholder = document.getElementById('banner-loading-placeholder');
const bannerModal = document.getElementById('banner_modal');
const bannerForm = document.getElementById('banner-form');
const bannerModalTitle = document.getElementById('banner-modal-title');
const bannerIdInput = document.getElementById('banner-id');
const saveBannerButton = document.getElementById('save-banner-button');


// --- Helper Function: Get Auth Token ---
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// --- Helper Function: API Calls with Auth ---
async function fetchWithAuth(url, options = {}) {
    const token = getAuthToken();
    if (!token) {
        console.error("No auth token found. Redirecting to login.");
        Swal.fire({ icon: 'error', title: 'ไม่ได้เข้าสู่ระบบ', text: 'กรุณาเข้าสู่ระบบก่อน', showConfirmButton: false, timer: 1500, willClose: () => { window.location.href = 'index.html'; }});
        throw new Error("Unauthorized");
    }

    const defaultHeaders = { 'Authorization': `Bearer ${token}` };

    const fetchOptions = { ...options, headers: { ...defaultHeaders, ...options.headers } };

     if (fetchOptions.body && !(fetchOptions.body instanceof FormData) && typeof fetchOptions.body !== 'string') {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(fetchOptions.body);
    }

    console.log(`Making API call: ${fetchOptions.method || 'GET'} ${url}`);
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
        let errorData;
        try { errorData = await response.json(); }
        catch (e) { errorData = { error: await response.text() }; }
        console.error(`API Error (${response.status}):`, errorData);
        const errorMessage = errorData.error || errorData.message || `Request failed with status ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = errorData;
        throw error;
    }

    if (response.status === 204) { return null; } // Handle No Content for DELETE

    try { return await response.json(); } // Parse JSON for other successful responses
    catch (jsonError) { console.error("Failed to parse JSON:", jsonError); throw new Error("Invalid JSON response"); }
}


// --- Product CRUD Functions ---

// Fetch and Display Products
async function fetchAndDisplayProductsAdmin() {
    if (!productTableBody || !productLoadingRow) return;
    console.log("Fetching products for admin panel...");
    productLoadingRow.style.display = '';
    productTableBody.innerHTML = '';
    productTableBody.appendChild(productLoadingRow);

    try {
        const result = await fetchWithAuth(`${API_BASE_URL}/products`);
        productLoadingRow.style.display = 'none';
        productTableBody.innerHTML = '';

        if (result && result.message === 'success' && Array.isArray(result.data)) {
            if (result.data.length === 0) {
                productTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-gray-500 py-4">ยังไม่มีสินค้าในระบบ</td></tr>`; return;
            }
            result.data.forEach(product => {
                const row = productTableBody.insertRow();
                row.innerHTML = `
                    <th>${product.product_id}</th>
                    <td>
                        <div class="avatar">
                            <div class="mask mask-squircle w-10 h-10 sm:w-12 sm:h-12"> 
                                <img src="${product.image_url || 'https://via.placeholder.com/80?text=N/A'}" alt="${product.name || 'Product Image'}" />
                            </div>
                        </div>
                    </td>
                    <td class="font-medium">${product.name || '-'}</td>
                    <td>฿${product.price !== null ? product.price.toFixed(2) : '-'}</td>
                    <td class="hidden md:table-cell whitespace-normal text-xs max-w-xs truncate" title="${product.description || ''}">${product.description || '-'}</td>
                    <td class="space-x-1"> 
                        <button class="btn btn-xs btn-info edit-product-btn" data-product='${JSON.stringify(product)}'>แก้ไข</button>
                        <button class="btn btn-xs btn-error delete-product-btn" data-id="${product.product_id}" data-name="${product.name || 'สินค้านี้'}">ลบ</button>
                    </td>
                `;
            });
            addTableEventListeners();
        } else { throw new Error("Invalid data format"); }
    } catch (error) {
        console.error('Error fetching products:', error);
        productLoadingRow.style.display = 'none';
        productTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-error font-semibold py-4">โหลดข้อมูลสินค้าผิดพลาด: ${error.message}</td></tr>`;
    }
}

// Add Listeners for Edit/Delete buttons in Product Table
function addTableEventListeners() {
    document.querySelectorAll('.edit-product-btn').forEach(button => {
        button.removeEventListener('click', handleEditProductClick); // Remove old listener first
        button.addEventListener('click', handleEditProductClick);
    });
    document.querySelectorAll('.delete-product-btn').forEach(button => {
        button.removeEventListener('click', handleDeleteProductClick); // Remove old listener first
        button.addEventListener('click', handleDeleteProductClick);
    });
}
// Handler functions to avoid creating functions inside loop
function handleEditProductClick(e) {
     try {
        const productData = JSON.parse(e.target.dataset.product);
        openProductModal(productData);
    } catch (parseError) { console.error("Error parsing product data:", parseError); Swal.fire('ผิดพลาด', 'ข้อมูลสินค้าไม่ถูกต้อง', 'error'); }
}
function handleDeleteProductClick(e) {
    const productId = e.target.dataset.id;
    const productName = e.target.dataset.name;
    deleteProduct(productId, productName);
}

// Open Product Modal
function openProductModal(product = null) {
    if (!productModal || !productForm || !productModalTitle || !productIdInput) return;
    productForm.reset();
    if (product) { // Edit Mode
        productModalTitle.textContent = `แก้ไขสินค้า: ${product.name}`;
        productIdInput.value = product.product_id;
        document.getElementById('product-name').value = product.name || '';
        document.getElementById('product-description').value = product.description || '';
        document.getElementById('product-price').value = product.price !== null ? product.price.toFixed(2) : '';
        document.getElementById('product-image-url').value = product.image_url || ''; // Back to URL
        saveProductButton.textContent = 'บันทึกการแก้ไข';
    } else { // Add Mode
        productModalTitle.textContent = 'เพิ่มสินค้าใหม่';
        productIdInput.value = '';
        document.getElementById('product-image-url').value = '';
        saveProductButton.textContent = 'เพิ่มสินค้า';
    }
    productModal.showModal();
}

// Handle Product Form Submit
async function handleProductFormSubmit(event) {
    event.preventDefault();
    if (!productForm || !saveProductButton) return;
    const formData = new FormData(productForm);
    const productData = {
        name: formData.get('name'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')),
        image_url: formData.get('image_url') || null // Get URL
    };
    const productId = formData.get('productId');

    if (!productData.name || isNaN(productData.price) || productData.price < 0) { /* ... validation ... */ }

    console.log('Submitting product data (JSON):', { productId, productData });
    saveProductButton.disabled = true;
    saveProductButton.innerHTML = `<span class="loading loading-spinner loading-xs"></span> กำลังบันทึก...`;
    try {
        const url = productId ? `${API_BASE_URL}/products/${productId}` : `${API_BASE_URL}/products`;
        const method = productId ? 'PUT' : 'POST';
        await fetchWithAuth(url, { method: method, body: productData }); // Send JSON
        productModal.close();
        await fetchAndDisplayProductsAdmin();
        Swal.fire('สำเร็จ!', productId ? 'แก้ไขสินค้าแล้ว!' : 'เพิ่มสินค้าแล้ว!', 'success');
    } catch (error) { /* ... error handling ... */ }
    finally { saveProductButton.disabled = false; saveProductButton.innerHTML = productId ? 'บันทึกการแก้ไข' : 'เพิ่มสินค้า'; }
}

// Delete Product
async function deleteProduct(productId, productName) {
    if (!productId) return;
    const result = await Swal.fire({ title: `ลบสินค้า "${productName}"?`, text: "ไม่สามารถย้อนกลับได้!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ใช่, ลบเลย!', cancelButtonText: 'ยกเลิก'});
    if (result.isConfirmed) {
        console.log(`Attempting delete product ID: ${productId}`);
        try {
            await fetchWithAuth(`${API_BASE_URL}/products/${productId}`, { method: 'DELETE' });
            Swal.fire('ลบแล้ว!', `สินค้า "${productName}" ถูกลบแล้ว`, 'success');
            await fetchAndDisplayProductsAdmin();
        } catch (error) { /* ... error handling ... */ }
    }
}


// --- Banner CRUD Functions ---

// Fetch and Display Banners
async function fetchAndDisplayBannersAdmin() {
    if (!bannerListDiv || !bannerLoadingPlaceholder) return;
    console.log("Fetching banners for admin panel...");
    bannerLoadingPlaceholder.style.display = 'block';
    bannerListDiv.innerHTML = '';
    bannerListDiv.appendChild(bannerLoadingPlaceholder);
    try {
        const result = await fetchWithAuth(`${API_BASE_URL}/banners`);
        bannerLoadingPlaceholder.style.display = 'none';
        bannerListDiv.innerHTML = '';
        if (result && result.message === 'success' && Array.isArray(result.data)) {
            if (result.data.length === 0) { bannerListDiv.innerHTML = `<p class="col-span-full text-center text-gray-500 py-4">ยังไม่มี Banner ในระบบ</p>`; return; }
            result.data.forEach(banner => {
                const bannerCard = document.createElement('div');
                bannerCard.className = 'card card-compact bg-base-200 shadow-md overflow-hidden'; // Added overflow-hidden
                bannerCard.innerHTML = `
                    <figure class="h-32 bg-gray-300"> 
                      <img src="${banner.image_url || 'https://via.placeholder.com/300x100?text=No+Image'}" alt="${banner.alt_text || 'Banner Image'}" class="w-full h-full object-cover"/>
                    </figure>
                    <div class="card-body p-3">
                        <h3 class="card-title text-sm truncate" title="${banner.title || ''}">${banner.title || '(ไม่มีหัวข้อ)'}</h3>
                        <p class="text-xs text-base-content/70">Order: ${banner.display_order}</p>
                        <p class="text-xs text-base-content/70 truncate">Link: ${banner.link_url || '-'}</p>
                        <div class="card-actions justify-end mt-2">
                            <button class="btn btn-xs btn-info edit-banner-btn" data-banner='${JSON.stringify(banner)}'>แก้ไข</button>
                            <button class="btn btn-xs btn-error delete-banner-btn" data-id="${banner.banner_id}" data-title="${banner.title || `ID ${banner.banner_id}`}">ลบ</button>
                        </div>
                    </div>
                `;
                bannerListDiv.appendChild(bannerCard);
            });
            addBannerEventListeners();
        } else { throw new Error("Invalid banner data format"); }
    } catch (error) {
        console.error('Error fetching banners:', error);
        bannerLoadingPlaceholder.style.display = 'none';
        bannerListDiv.innerHTML = `<p class="col-span-full text-center text-error font-semibold py-4">โหลด Banner ผิดพลาด: ${error.message}</p>`;
    }
}

// Add Listeners for Edit/Delete buttons in Banner List
function addBannerEventListeners() {
    document.querySelectorAll('.edit-banner-btn').forEach(button => {
        button.removeEventListener('click', handleEditBannerClick); // Remove old listener
        button.addEventListener('click', handleEditBannerClick);
    });
    document.querySelectorAll('.delete-banner-btn').forEach(button => {
        button.removeEventListener('click', handleDeleteBannerClick); // Remove old listener
        button.addEventListener('click', handleDeleteBannerClick);
    });
}
// Handler functions for Banner buttons
function handleEditBannerClick(e) {
    try {
        const bannerData = JSON.parse(e.target.dataset.banner);
        openBannerModal(bannerData);
    } catch (parseError) { console.error("Error parsing banner data:", parseError); Swal.fire('ผิดพลาด', 'ข้อมูล Banner ไม่ถูกต้อง', 'error'); }
}
function handleDeleteBannerClick(e) {
    const bannerId = e.target.dataset.id;
    const bannerTitle = e.target.dataset.title;
    deleteBanner(bannerId, bannerTitle);
}

// Open Banner Modal
function openBannerModal(banner = null) {
    if (!bannerModal || !bannerForm || !bannerModalTitle || !bannerIdInput) return;
    bannerForm.reset();
    if (banner) { // Edit Mode
        bannerModalTitle.textContent = `แก้ไข Banner: ${banner.title || `ID ${banner.banner_id}`}`;
        bannerIdInput.value = banner.banner_id;
        document.getElementById('banner-image-url').value = banner.image_url || '';
        document.getElementById('banner-alt-text').value = banner.alt_text || '';
        document.getElementById('banner-link-url').value = banner.link_url || '';
        document.getElementById('banner-title').value = banner.title || '';
        document.getElementById('banner-display-order').value = banner.display_order || 0;
        saveBannerButton.textContent = 'บันทึกการแก้ไข';
    } else { // Add Mode
        bannerModalTitle.textContent = 'เพิ่ม Banner ใหม่';
        bannerIdInput.value = '';
        document.getElementById('banner-display-order').value = 0;
        saveBannerButton.textContent = 'เพิ่ม Banner';
    }
    bannerModal.showModal();
}

// Handle Banner Form Submit
async function handleBannerFormSubmit(event) {
    event.preventDefault();
    if (!bannerForm || !saveBannerButton) return;
    const formData = new FormData(bannerForm);
    const bannerData = {
        image_url: formData.get('image_url'),
        alt_text: formData.get('alt_text') || null,
        link_url: formData.get('link_url') || null,
        title: formData.get('title') || null,
        display_order: parseInt(formData.get('display_order') || '0', 10)
    };
    const bannerId = formData.get('bannerId');

    if (!bannerData.image_url) { /* ... validation ... */ }

    console.log('Submitting banner data (JSON):', { bannerId, bannerData });
    saveBannerButton.disabled = true;
    saveBannerButton.innerHTML = `<span class="loading loading-spinner loading-xs"></span> กำลังบันทึก...`;
    try {
        const url = bannerId ? `${API_BASE_URL}/banners/${bannerId}` : `${API_BASE_URL}/banners`;
        const method = bannerId ? 'PUT' : 'POST';
        await fetchWithAuth(url, { method: method, body: bannerData }); // Send JSON
        bannerModal.close();
        await fetchAndDisplayBannersAdmin();
        Swal.fire('สำเร็จ!', bannerId ? 'แก้ไข Banner แล้ว!' : 'เพิ่ม Banner แล้ว!', 'success');
    } catch (error) { /* ... error handling ... */ }
    finally { saveBannerButton.disabled = false; saveBannerButton.innerHTML = bannerId ? 'บันทึกการแก้ไข' : 'เพิ่ม Banner'; }
}

// Delete Banner
async function deleteBanner(bannerId, bannerTitle) {
    if (!bannerId) return;
    const result = await Swal.fire({ title: `ลบ Banner "${bannerTitle}"?`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'ใช่, ลบเลย!', cancelButtonText: 'ยกเลิก'});
    if (result.isConfirmed) {
        console.log(`Attempting delete banner ID: ${bannerId}`);
        try {
            await fetchWithAuth(`${API_BASE_URL}/banners/${bannerId}`, { method: 'DELETE' });
            Swal.fire('ลบแล้ว!', `Banner "${bannerTitle}" ถูกลบแล้ว`, 'success');
            await fetchAndDisplayBannersAdmin();
        } catch (error) { /* ... error handling ... */ }
    }
}


// --- Function: Check Admin Auth and Initialize ---
function checkAdminAuthAndInit() {
    const token = getAuthToken();
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName');

    console.log('Admin Page: Checking auth...', { tokenPresent: !!token, userRole });

    if (token && userRole === 'admin') {
        console.log('Admin access granted.');
        if(adminUserInfoSpan) adminUserInfoSpan.textContent = `Admin: ${userName || 'ผู้ใช้'}`;
        if(adminContentDiv) adminContentDiv.style.display = 'block';
        if(unauthorizedMessageDiv) unauthorizedMessageDiv.style.display = 'none';

        // Setup Logout Button Listener
        if (logoutButton) {
             logoutButton.addEventListener('click', () => {
                 Swal.fire({ title: 'ออกจากระบบ?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#3085d6', cancelButtonColor: '#d33', confirmButtonText: 'ใช่, ออกเลย!', cancelButtonText: 'ยกเลิก'})
                    .then((result) => { if (result.isConfirmed) { localStorage.clear(); window.location.href = 'index.html'; } });
            });
        } else { console.error("Logout button not found"); }

        // Setup Product Event Listeners
        if (addProductButton) addProductButton.addEventListener('click', () => openProductModal());
        else { console.error("Add product button not found"); }
        if (productForm) productForm.addEventListener('submit', handleProductFormSubmit);
        else { console.error("Product form not found"); }

        // Setup Banner Event Listeners
        if (addBannerButton) addBannerButton.addEventListener('click', () => openBannerModal());
        else { console.error("Add banner button not found"); }
        if (bannerForm) bannerForm.addEventListener('submit', handleBannerFormSubmit);
        else { console.error("Banner form not found"); }

        // Initial data load
        fetchAndDisplayProductsAdmin();
        fetchAndDisplayBannersAdmin();

    } else {
        console.log('Admin access denied. Redirecting...');
        if(adminContentDiv) adminContentDiv.style.display = 'none';
        Swal.fire({ icon: 'error', title: 'เข้าถึงไม่ได้!', text: 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้ กำลังพากลับ...', timer: 2500, showConfirmButton: false, allowOutsideClick: false,
            willClose: () => { window.location.href = 'products.html'; }
        });
    }
}

// --- Run on Page Load ---
document.addEventListener('DOMContentLoaded', checkAdminAuthAndInit);