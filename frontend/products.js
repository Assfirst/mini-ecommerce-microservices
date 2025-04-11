// products.js (Full Latest Version - Includes Dynamic Banners, Add to Cart, Cart Badge)

const API_BASE_URL = 'http://localhost:3000'; // Gateway URL

// --- Element References ---
const productListDiv = document.getElementById('product-list');
const loadingProductsP = document.getElementById('loading-products');
const userInfoSpan = document.getElementById('user-info');
const logoutButton = document.getElementById('logout-button'); // Use common ID
const adminLink = document.getElementById('admin-link');
const bannerCarouselDiv = document.getElementById('banner-carousel');
const bannerLoading = document.getElementById('banner-loading');
const cartCountSpan = document.getElementById('cart-count'); // Cart count badge in navbar
const searchIconMobile = document.getElementById('search-icon-mobile');
const searchBarMobile = document.getElementById('search-bar-mobile');
const cartButton = document.getElementById('cart-button'); // Cart icon button in navbar

// --- Helper Function: Get Auth Token ---
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// --- Helper Function: API Calls with Auth (for Product Page) ---
// Handles fetch requests that might require authentication
async function fetchWithAuthProd(url, options = {}) {
    const token = getAuthToken();
    const defaultHeaders = {
        'Authorization': token ? `Bearer ${token}` : '',
    };
    const fetchOptions = { ...options, headers: { ...defaultHeaders, ...options.headers } };
     if (fetchOptions.body && !(fetchOptions.body instanceof FormData) && typeof fetchOptions.body !== 'string') {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(fetchOptions.body);
    }
    console.log(`Making API call from products page: ${fetchOptions.method || 'GET'} ${url}`);
    try {
        const response = await fetch(url, fetchOptions);
        if (response.status === 204) return null; // Handle No Content
        let responseData;
        try { responseData = await response.json(); }
        catch (jsonError) {
            const textResponse = await response.text();
            console.error("Failed to parse JSON response, Response Text:", textResponse);
            if (response.ok) throw new Error("Invalid JSON response from server");
            responseData = { error: textResponse };
        }
        if (!response.ok) {
            console.error(`API Error (${response.status}):`, responseData);
            const errorMessage = responseData.error || responseData.message || `Request failed with status ${response.status}`;
            const error = new Error(errorMessage);
            error.status = response.status; error.data = responseData; throw error;
        }
        return responseData;
    } catch (networkError) { console.error('Fetch failed:', networkError); throw networkError; }
}


// --- Function: Fetch and Display Banners ---
async function fetchAndDisplayBanners() {
    console.log('Fetching banners...');
    if (!bannerCarouselDiv || !bannerLoading) { console.error("Banner elements not found"); return; }
    bannerLoading.style.display = 'block';
    bannerCarouselDiv.innerHTML = ''; // Clear first
    bannerCarouselDiv.appendChild(bannerLoading);

    try {
        const result = await fetchWithAuthProd(`${API_BASE_URL}/banners`);
        bannerLoading.style.display = 'none';
        bannerCarouselDiv.innerHTML = '';

        if (result && result.message === 'success' && Array.isArray(result.data) && result.data.length > 0) {
            const banners = result.data;
            const totalSlides = banners.length;
            banners.forEach((banner, index) => {
                 const slideIndex = index + 1;
                 const prevSlideIndex = (index === 0) ? totalSlides : slideIndex - 1;
                 const nextSlideIndex = (index === totalSlides - 1) ? 1 : slideIndex + 1;
                 const slideDiv = document.createElement('div');
                 slideDiv.id = `slide${slideIndex}`;
                 slideDiv.className = 'carousel-item relative w-full';
                 const linkOrFragment = banner.link_url && banner.link_url !== '#' ? `<a href="${banner.link_url}" target="_blank" rel="noopener noreferrer" class="block w-full h-full">` : '<div class="block w-full h-full">';
                 const linkOrFragmentClose = banner.link_url && banner.link_url !== '#' ? '</a>' : '</div>';
                 // --- ใส่ innerHTML ของ Slide ที่นี่ ---
                 slideDiv.innerHTML = `
                    ${linkOrFragment}
                    <img src="${banner.image_url}" class="w-full h-full object-cover" alt="${banner.alt_text || `โปรโมชั่น ${slideIndex}`}" />
                    ${linkOrFragmentClose}
                    <!-- Navigation Arrows -->
                    <div class="absolute flex justify-between transform -translate-y-1/2 left-2 right-2 sm:left-5 sm:right-5 top-1/2">
                        <a href="#slide${prevSlideIndex}" class="btn btn-circle btn-ghost btn-xs sm:btn-sm text-white opacity-60 hover:opacity-100 focus:opacity-100">❮</a>
                        <a href="#slide${nextSlideIndex}" class="btn btn-circle btn-ghost btn-xs sm:btn-sm text-white opacity-60 hover:opacity-100 focus:opacity-100">❯</a>
                    </div>
                    <!-- Optional Text Overlay -->
                    ${banner.title ? `
                    <div class="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-black bg-opacity-60 text-white p-1 px-2 sm:p-2 rounded text-[10px] sm:text-xs max-w-[70%] sm:max-w-[60%]">
                        ${banner.title}
                    </div>
                    ` : ''}
                `;
                 // --- จบ innerHTML ของ Slide ---
                 bannerCarouselDiv.appendChild(slideDiv);
            });
            console.log(`Displayed ${totalSlides} banners.`);
        } else {
            console.log('No banners found or invalid data format.');
            bannerCarouselDiv.innerHTML = '<p class="text-center text-base-content/50 p-10">ไม่มี Banner โปรโมชั่นในขณะนี้</p>';
        }
    } catch (error) {
        console.error('Error fetching banners:', error);
        if (bannerLoading) bannerLoading.style.display = 'none';
        if (bannerCarouselDiv) bannerCarouselDiv.innerHTML = `<p class="text-center text-error font-semibold p-10">เกิดข้อผิดพลาดในการโหลด Banner: ${error.message}</p>`;
    }
}

// --- Function: Fetch and Display Products ---
async function fetchAndDisplayProducts() {
    console.log('Fetching products for products page...');
    if (!loadingProductsP || !productListDiv) { console.error("Product list elements not found"); return; }
    loadingProductsP.style.display = 'block';
    productListDiv.innerHTML = '';
    productListDiv.appendChild(loadingProductsP);

    try {
        const result = await fetchWithAuthProd(`${API_BASE_URL}/products`);
        loadingProductsP.style.display = 'none';
        productListDiv.innerHTML = '';

        if (result && result.message === 'success' && Array.isArray(result.data)) {
            if (result.data.length === 0) { productListDiv.innerHTML = '<p class="text-center col-span-full text-gray-500 py-10">ยังไม่มีสินค้าในร้านเลยเพื่อน...</p>'; return; }
            console.log(`Displaying ${result.data.length} products.`);
            result.data.forEach(product => {
                const productCard = document.createElement('div');
                productCard.className = 'card card-compact bg-base-100 shadow hover:shadow-lg transition-shadow duration-200 ease-in-out overflow-hidden group';
                productCard.innerHTML = `
                    <figure class="aspect-square overflow-hidden bg-gray-100">
                        <img src="${product.image_url || 'https://via.placeholder.com/300x300?text=No+Image'}" alt="${product.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </figure>
                    <div class="card-body p-3 md:p-4">
                        <h2 class="card-title text-sm sm:text-base font-semibold truncate" title="${product.name}">${product.name}</h2>
                        <p class="text-xs text-base-content/60 mb-2 min-h-[2.5em] overflow-hidden text-ellipsis" style="-webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical;">${product.description || ''}</p>
                        <div class="flex justify-between items-center mt-1">
                            <p class="text-base sm:text-lg font-bold text-primary">฿${product.price.toFixed(2)}</p>
                            <button class="btn btn-primary btn-xs sm:btn-sm add-to-cart-button" data-product-id="${product.product_id}" title="เพิ่มลงตะกร้า">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            </button>
                        </div>
                    </div>
                `;
                productListDiv.appendChild(productCard);
            });
            // Add event listeners to the new buttons *after* they are in the DOM
            document.querySelectorAll('.add-to-cart-button').forEach(button => {
                button.addEventListener('click', handleAddToCartClick);
            });
        } else { throw new Error('Invalid product data format received'); }
    } catch (error) {
        console.error('Error fetching or displaying products:', error);
        if (loadingProductsP) loadingProductsP.style.display = 'none';
        if (productListDiv) productListDiv.innerHTML = `<p class="text-center col-span-full text-error font-semibold py-10">เกิดข้อผิดพลาดในการโหลดสินค้า: ${error.message} 😭</p>`;
    }
}

// --- Named Handler for Add to Cart Button Click ---
function handleAddToCartClick(event) {
    event.stopPropagation();
    event.preventDefault();
    const button = event.target.closest('button');
    if (button) {
        const productId = button.dataset.productId;
        addToCart(productId); // Call the async function
    }
}

// --- Function: Add to Cart ---
async function addToCart(productId) {
    const token = getAuthToken();
    if (!token) {
        Swal.fire({ icon: 'warning', title: 'โปรดเข้าสู่ระบบ', text: 'กรุณาเข้าสู่ระบบก่อนหยิบใส่ตะกร้า', showCancelButton: true, confirmButtonText: 'ไปหน้าเข้าสู่ระบบ', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#3085d6', cancelButtonColor: '#aaa' })
            .then((result) => { if (result.isConfirmed) { window.location.href = 'index.html'; } });
        return;
    }
    console.log(`Attempting to add product ${productId} to cart...`);
    try {
        const result = await fetchWithAuthProd(`${API_BASE_URL}/cart`, {
            method: 'POST',
            body: { productId: parseInt(productId, 10), quantity: 1 }
        });
        console.log('Add to cart result:', result);
        Swal.fire({ icon: 'success', title: 'เพิ่มลงตะกร้าแล้ว!', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, timerProgressBar: true });
        updateCartBadge(); // Update badge after successful add
    } catch (error) {
        console.error(`Error adding product ${productId} to cart:`, error);
        const errorMessage = error.data?.error || error.message || 'เกิดข้อผิดพลาด';
        if (error.status === 401) {
             Swal.fire({ icon: 'error', title: 'เซสชั่นหมดอายุ', text: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง', confirmButtonText: 'ตกลง' })
                 .then(() => { localStorage.clear(); window.location.href = 'index.html'; });
        } else { Swal.fire({ icon: 'error', title: 'ผิดพลาด!', text: `ไม่สามารถเพิ่มสินค้า: ${errorMessage}` }); }
    }
}

// --- Function: Update Cart Badge ---
async function updateCartBadge() {
    if (!cartCountSpan) return;
    const token = getAuthToken();
    if (!token) { cartCountSpan.textContent = '0'; return; }
    console.log("Updating cart badge...");
    try {
        const result = await fetchWithAuthProd(`${API_BASE_URL}/cart`);
        if (result && result.message === 'success' && Array.isArray(result.data)) {
            const totalItems = result.data.length; // Count distinct items
            cartCountSpan.textContent = totalItems.toString();
            console.log("Cart badge updated:", totalItems);
        } else { console.warn("Could not get cart items for badge, setting to 0."); cartCountSpan.textContent = '0'; }
    } catch (error) {
        console.error("Error fetching cart for badge update:", error);
        if (error.status === 401 || error.status === 403) { console.log("Token invalid/expired during badge update. Clearing badge."); }
        cartCountSpan.textContent = '0';
    }
}

// --- Function: Setup UI and Event Listeners ---
function setupUI() {
    const token = getAuthToken();
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');

    if (token) {
        if(userInfoSpan) userInfoSpan.textContent = `สวัสดี, ${userName || 'ผู้ใช้'}!`;
        if(logoutButton) logoutButton.classList.remove('hidden');
        if (userRole === 'admin' && adminLink) { adminLink.classList.remove('hidden'); }
        else if (adminLink) { adminLink.classList.add('hidden'); }
    } else {
        if(userInfoSpan) userInfoSpan.textContent = '';
        if(logoutButton) logoutButton.classList.add('hidden');
        if(adminLink) adminLink.classList.add('hidden');
    }

    // Logout Button Listener
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
             Swal.fire({ title: 'ออกจากระบบ?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#3085d6', cancelButtonColor: '#d33', confirmButtonText: 'ใช่, ออกเลย!', cancelButtonText: 'ยกเลิก'})
                .then((result) => { if (result.isConfirmed) { localStorage.clear(); window.location.href = 'index.html'; } });
        });
    }

    // Search Icon Mobile Listener
    if (searchIconMobile && searchBarMobile) {
        searchIconMobile.addEventListener('click', () => {
            searchBarMobile.classList.toggle('hidden');
            if (!searchBarMobile.classList.contains('hidden')) {
                const searchInputMobile = document.getElementById('search-input-mobile');
                if(searchInputMobile) searchInputMobile.focus();
            }
        });
    }

     // Cart Button Listener
     if(cartButton) {
         cartButton.addEventListener('click', () => {
             // TODO: Navigate to cart page
             window.location.href = 'cart.html'; // <<< แก้ให้ไปหน้า cart.html
             // Swal.fire('ตะกร้าสินค้า', 'หน้าตะกร้าสินค้ากำลังมาแรงแซงโค้ง!', 'info');
         });
     }

    updateCartBadge(); // Initial cart badge update
}

// --- Run on Page Load ---
document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    fetchAndDisplayBanners();
    fetchAndDisplayProducts();
});