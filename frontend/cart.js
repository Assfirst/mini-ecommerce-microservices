// cart.js (Full Latest - Logic for the shopping cart page)

const API_BASE_URL = 'http://localhost:3000'; // Gateway URL

// --- Element References ---
const cartItemsContainer = document.getElementById('cart-items-container');
const cartLoading = document.getElementById('cart-loading');
const cartEmptyMessage = document.getElementById('cart-empty-message');
const summaryItemCount = document.getElementById('summary-item-count');
const summarySubtotal = document.getElementById('summary-subtotal');
const summaryShipping = document.getElementById('summary-shipping');
const summaryTotal = document.getElementById('summary-total');
const checkoutButton = document.getElementById('checkout-button');
// Navbar elements
const userInfoSpan = document.getElementById('user-info');
const logoutButton = document.getElementById('logout-button'); // Use common ID
const adminLink = document.getElementById('admin-link');

// --- Helper Function: Get Auth Token ---
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// --- Helper Function: API Calls with Auth (for Cart Page) ---
async function fetchWithAuthCart(url, options = {}) {
    const token = getAuthToken();
    // If no token, redirect immediately as cart page requires login
    if (!token) {
        console.error("No auth token found. Redirecting to login from cart page.");
        // Use Swal for a slightly better UX than immediate redirect
        Swal.fire({
            icon: 'warning',
            title: 'ไม่ได้เข้าสู่ระบบ',
            text: 'กรุณาเข้าสู่ระบบเพื่อดูหรือจัดการตะกร้าสินค้า',
            confirmButtonText: 'ไปหน้าเข้าสู่ระบบ',
            allowOutsideClick: false
        }).then(() => {
            window.location.href = 'index.html';
        });
        // Throw an error to stop the function that called this helper
        throw new Error("Unauthorized");
    }

    const defaultHeaders = { 'Authorization': `Bearer ${token}` };
    const fetchOptions = { ...options, headers: { ...defaultHeaders, ...options.headers } };

     if (fetchOptions.body && !(fetchOptions.body instanceof FormData) && typeof fetchOptions.body !== 'string') {
        fetchOptions.headers['Content-Type'] = 'application/json';
        fetchOptions.body = JSON.stringify(fetchOptions.body);
    }

    console.log(`Making API call from cart page: ${fetchOptions.method || 'GET'} ${url}`);
    try {
        const response = await fetch(url, fetchOptions);
        if (response.status === 204) return null; // Handle No Content
        let responseData;
        try { responseData = await response.json(); }
        catch (e) { responseData = { error: await response.text() }; }

        if (!response.ok) {
            const errorMessage = responseData.error || responseData.message || `Request failed ${response.status}`;
            console.error(`API Error (${response.status}):`, responseData);
            const error = new Error(errorMessage); error.status = response.status; error.data = responseData;
            // Handle specific errors like 401 (maybe token expired)
            if (response.status === 401) {
                 Swal.fire({ icon: 'error', title: 'เซสชั่นหมดอายุ', text: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง', confirmButtonText: 'ตกลง' })
                 .then(() => { localStorage.clear(); window.location.href = 'index.html'; });
            }
            throw error; // Re-throw for the calling function to handle UI
        }
        return responseData;
    } catch (networkError) {
        console.error('Fetch failed:', networkError);
        // Show a generic network error to the user
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง', 'error');
        throw networkError; // Re-throw
    }
}

// --- Function: Fetch Product Details (Needed for cart display) ---
async function fetchProductDetails(productId) {
    try {
        // Use public endpoint (or fetchWithAuthCart if needed later)
        const result = await fetchWithAuthCart(`${API_BASE_URL}/products/${productId}`);
        if (result && result.message === 'success') {
            return result.data;
        } else {
            console.warn(`Could not fetch details for product ID ${productId}`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching details for product ${productId}:`, error);
        // Return null but maybe log the specific product ID that failed
        return { product_id: productId, name: `(สินค้า ID ${productId} ไม่พร้อมใช้งาน)`, price: 0, image_url: null, unavailable: true }; // Return placeholder
    }
}

// --- Function: Display Cart Items ---
let currentCombinedItems = []; // Store combined data globally for summary updates

async function displayCart() {
    if (!cartItemsContainer || !cartLoading || !cartEmptyMessage) return;
    console.log("Displaying cart...");
    cartLoading.style.display = 'block';
    cartItemsContainer.innerHTML = '';
    cartItemsContainer.appendChild(cartLoading);
    cartEmptyMessage.classList.add('hidden');
    if(checkoutButton) checkoutButton.disabled = true;

    try {
        const cartResult = await fetchWithAuthCart(`${API_BASE_URL}/cart`);

        if (!cartResult || !cartResult.data || cartResult.data.length === 0) {
            console.log("Cart is empty.");
            cartLoading.style.display = 'none';
            cartEmptyMessage.classList.remove('hidden');
            currentCombinedItems = []; // Reset global items
            updateCartSummary(currentCombinedItems);
            return;
        }

        const cartItems = cartResult.data;
        const productDetailPromises = cartItems.map(item => fetchProductDetails(item.product_id));
        const productDetailsArray = await Promise.all(productDetailPromises);

        cartLoading.style.display = 'none';
        cartItemsContainer.innerHTML = '';
        currentCombinedItems = []; // Reset before populating

        cartItems.forEach((item, index) => {
            const product = productDetailsArray[index];
            // Ensure product exists and is not marked as unavailable from fetchProductDetails placeholder
            if (product && !product.unavailable) {
                const subtotal = product.price * item.quantity;
                currentCombinedItems.push({ ...item, ...product, subtotal }); // Store combined data

                const itemDiv = document.createElement('div');
                itemDiv.className = 'cart-item flex flex-col sm:flex-row items-center border-b border-base-300 py-3 gap-3 sm:gap-4';
                itemDiv.dataset.itemId = item.cart_item_id;

                itemDiv.innerHTML = `
                    <img src="${product.image_url || 'https://via.placeholder.com/80?text=N/A'}" alt="${product.name}" class="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded flex-shrink-0">
                    <div class="flex-grow text-center sm:text-left">
                        <h3 class="font-semibold text-sm sm:text-base">${product.name}</h3>
                        <p class="text-xs sm:text-sm text-base-content/70">ราคา: ฿${product.price.toFixed(2)}</p>
                    </div>
                    <div class="flex items-center gap-1 sm:gap-2">
                        <button class="btn btn-xs btn-outline btn-square quantity-decrease" data-item-id="${item.cart_item_id}" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                        <span class="font-semibold w-8 text-center quantity-value">${item.quantity}</span>
                        <button class="btn btn-xs btn-outline btn-square quantity-increase" data-item-id="${item.cart_item_id}">+</button>
                    </div>
                    <p class="font-semibold w-20 sm:w-24 text-right text-sm sm:text-base item-subtotal">฿${subtotal.toFixed(2)}</p>
                    <button class="btn btn-xs sm:btn-sm btn-ghost btn-circle text-error delete-item-btn" data-item-id="${item.cart_item_id}" data-product-name="${product.name}" title="ลบรายการนี้">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                `;
                cartItemsContainer.appendChild(itemDiv);
            } else {
                // Display a row indicating the item is unavailable but still in cart
                const unavailableDiv = document.createElement('div');
                unavailableDiv.className = 'cart-item flex items-center border-b border-base-300 py-3 gap-3 sm:gap-4 opacity-50';
                 unavailableDiv.dataset.itemId = item.cart_item_id;
                 unavailableDiv.innerHTML = `
                    <div class="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">?</div>
                    <div class="flex-grow text-center sm:text-left">
                        <h3 class="font-semibold text-sm sm:text-base text-error">(สินค้า ID ${item.product_id} ไม่พร้อมใช้งาน)</h3>
                        <p class="text-xs sm:text-sm text-base-content/70">จำนวน: ${item.quantity}</p>
                    </div>
                    <div class="w-20 sm:w-24"></div> {/* Placeholder for price */}
                    <button class="btn btn-xs sm:btn-sm btn-ghost btn-circle text-error delete-item-btn" data-item-id="${item.cart_item_id}" data-product-name="สินค้านี้" title="ลบรายการนี้">
                         <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                 `;
                cartItemsContainer.appendChild(unavailableDiv);
                console.warn(`Product ID ${item.product_id} details not available, showing placeholder.`);
            }
        });

        addCartItemEventListeners();
        updateCartSummary(currentCombinedItems); // Use the globally stored combined items
        if(checkoutButton && currentCombinedItems.length > 0) checkoutButton.disabled = false; // Enable checkout only if there are valid items

    } catch (error) {
        console.error("Error displaying cart:", error);
        if (cartLoading) cartLoading.style.display = 'none';
        if (cartEmptyMessage) cartEmptyMessage.classList.add('hidden');
        if (cartItemsContainer) cartItemsContainer.innerHTML = `<p class="text-center text-error font-semibold py-10">เกิดข้อผิดพลาดในการโหลดตะกร้า: ${error.message}</p>`;
        updateCartSummary([]); // Reset summary on error
        // Specific handling for 401 was moved to fetchWithAuthCart
    }
}

// --- Function: Add Event Listeners for Cart Items ---
function addCartItemEventListeners() {
    document.querySelectorAll('.quantity-decrease').forEach(btn => {
        btn.removeEventListener('click', handleQuantityChange); // Prevent duplicates
        btn.addEventListener('click', handleQuantityChange);
    });
    document.querySelectorAll('.quantity-increase').forEach(btn => {
        btn.removeEventListener('click', handleQuantityChange);
        btn.addEventListener('click', handleQuantityChange);
    });
    document.querySelectorAll('.delete-item-btn').forEach(btn => {
        btn.removeEventListener('click', handleDeleteItemClick);
        btn.addEventListener('click', handleDeleteItemClick);
    });
}

// --- Event Handler: Quantity Change (+/- buttons) ---
async function handleQuantityChange(event) {
    const button = event.target.closest('button');
    const itemId = button.dataset.itemId;
    const itemDiv = button.closest('.cart-item');
    if (!itemDiv) return; // Should not happen
    const quantitySpan = itemDiv.querySelector('.quantity-value');
    if (!quantitySpan) return; // Should not happen
    let currentQuantity = parseInt(quantitySpan.textContent, 10);
    let newQuantity;

    if (button.classList.contains('quantity-increase')) {
        newQuantity = currentQuantity + 1;
    } else if (button.classList.contains('quantity-decrease')) {
        newQuantity = currentQuantity - 1;
    } else { return; } // Should not happen

    // Add temporary loading state to the buttons/quantity area
    const controls = itemDiv.querySelector('.flex.items-center.gap-1');
    if (controls) controls.classList.add('opacity-50'); // Dim the controls

    if (newQuantity >= 1) {
        await updateQuantity(itemId, newQuantity);
    } else if (newQuantity === 0) {
        const productName = itemDiv.querySelector('h3')?.textContent || 'สินค้านี้';
        await deleteCartItem(itemId, productName); // Call delete directly
    }

    if (controls) controls.classList.remove('opacity-50'); // Remove dimming
}

// --- Function: Update Item Quantity via API ---
async function updateQuantity(itemId, newQuantity) {
    console.log(`Updating item ${itemId} quantity to ${newQuantity}`);
    try {
        await fetchWithAuthCart(`${API_BASE_URL}/cart/item/${itemId}`, {
            method: 'PUT',
            body: { quantity: newQuantity }
        });
        console.log(`Item ${itemId} quantity updated successfully.`);
        // Refresh the whole cart for simplicity and consistency
        await displayCart();
        Swal.fire({ icon: 'success', title: 'อัปเดตจำนวนแล้ว', toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
    } catch (error) {
        console.error(`Error updating quantity for item ${itemId}:`, error);
         const errorMessage = error.data?.error || error.message || 'เกิดข้อผิดพลาด';
         Swal.fire('ผิดพลาด!', `ไม่สามารถอัปเดตจำนวนได้: ${errorMessage}`, 'error');
         // Refresh cart to show original state on error
         await displayCart();
    }
}

// --- Event Handler: Delete Item Button Click ---
function handleDeleteItemClick(event) {
    const button = event.target.closest('button');
    if (!button) return;
    const itemId = button.dataset.itemId;
    const productName = button.dataset.productName || 'สินค้านี้';
    deleteCartItem(itemId, productName);
}

// --- Function: Delete Cart Item via API ---
async function deleteCartItem(itemId, productName) {
    const result = await Swal.fire({
        title: `ลบ "${productName}"?`,
        text: "ต้องการลบสินค้ารายการนี้ออกจากตะกร้าใช่ไหม?",
        icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33',
        cancelButtonColor: '#aaa', confirmButtonText: 'ใช่, ลบเลย', cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        console.log(`Deleting cart item ID: ${itemId}`);
        // Add visual feedback for deletion
        const itemDiv = document.querySelector(`.cart-item[data-item-id="${itemId}"]`);
        if (itemDiv) itemDiv.classList.add('opacity-30'); // Dim the item

        try {
            await fetchWithAuthCart(`${API_BASE_URL}/cart/item/${itemId}`, { method: 'DELETE' });
            console.log(`Item ${itemId} deleted successfully.`);
            Swal.fire({ icon: 'success', title: 'ลบรายการแล้ว', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            // Remove item from UI immediately (optional, as displayCart will refresh)
            // if (itemDiv) itemDiv.remove();
            // Refresh the cart display and summary
            await displayCart();
            await updateCartBadge(); // Update navbar badge

        } catch (error) {
            console.error(`Error deleting item ${itemId}:`, error);
            const errorMessage = error.data?.error || error.message || 'เกิดข้อผิดพลาด';
            Swal.fire('ผิดพลาด!', `ไม่สามารถลบรายการได้: ${errorMessage}`, 'error');
            // Remove dimming if deletion failed
            if (itemDiv) itemDiv.classList.remove('opacity-30');
        }
    }
}

// --- Function: Update Cart Summary Display ---
function updateCartSummary(itemsToSummarize) {
    // Ensure elements exist
    if (!summaryItemCount || !summarySubtotal || !summaryTotal) {
         console.error("Summary elements not found!");
         return;
    }

    // Filter out any unavailable items before calculating summary
    const validItems = itemsToSummarize.filter(item => !item.unavailable);

    const itemCount = validItems.length; // Count only available items
    // Calculate subtotal only from available items
    const subtotal = validItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCost = 0; // Assume free shipping for now
    const total = subtotal + shippingCost;

    summaryItemCount.textContent = itemCount;
    summarySubtotal.textContent = `฿${subtotal.toFixed(2)}`;
    if (summaryShipping) summaryShipping.textContent = shippingCost === 0 ? 'ฟรี' : `฿${shippingCost.toFixed(2)}`;
    summaryTotal.textContent = `฿${total.toFixed(2)}`;

    console.log("Cart summary updated:", { itemCount: itemCount, subtotal, total });
}

// --- Function: Update Navbar Cart Badge ---
// (Should be same as in products.js - consider refactoring to shared utility)
async function updateCartBadge() {
    const cartCountSpanNav = document.getElementById('cart-count');
    if (!cartCountSpanNav) return;
    const token = getAuthToken();
    if (!token) { cartCountSpanNav.textContent = '0'; return; }
    try {
        const result = await fetchWithAuthCart(`${API_BASE_URL}/cart`);
        if (result && result.message === 'success' && Array.isArray(result.data)) {
            cartCountSpanNav.textContent = result.data.length.toString();
        } else { cartCountSpanNav.textContent = '0'; }
    } catch (error) { cartCountSpanNav.textContent = '0'; }
}

// --- Function: Setup UI (Navbar, Checkout Button) ---
function setupCartUI() {
    const token = getAuthToken();
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');

    // If not logged in, fetchWithAuthCart will handle redirection
    if (!token) return false;

    // Setup navbar elements if logged in
    if(userInfoSpan) userInfoSpan.textContent = `สวัสดี, ${userName || 'ผู้ใช้'}!`;
    if(logoutButton) logoutButton.classList.remove('hidden');
    if (userRole === 'admin' && adminLink) { adminLink.classList.remove('hidden'); }
    else if (adminLink) { adminLink.classList.add('hidden'); }

    // Logout Button Listener
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
             Swal.fire({ title: 'ออกจากระบบ?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#3085d6', cancelButtonColor: '#d33', confirmButtonText: 'ใช่, ออกเลย!', cancelButtonText: 'ยกเลิก'})
                .then((result) => { if (result.isConfirmed) { localStorage.clear(); window.location.href = 'index.html'; } });
        });
    }

    // Checkout Button Listener
    if (checkoutButton) {
        checkoutButton.addEventListener('click', handleCheckout);
    } else { console.error("Checkout button not found"); }

    return true; // Indicate setup successful
}

// --- Function: Handle Checkout ---
async function handleCheckout() {
    console.log("Initiating checkout process...");
    if(!checkoutButton) return;

    // Check again if cart is actually empty based on current UI state
    if (currentCombinedItems.length === 0) {
         Swal.fire('ตะกร้าว่างเปล่า', 'กรุณาเพิ่มสินค้าลงตะกร้าก่อนดำเนินการสั่งซื้อ', 'info');
         return;
    }

    checkoutButton.disabled = true;
    checkoutButton.innerHTML = `<span class="loading loading-spinner loading-xs"></span> กำลังดำเนินการ...`;

    try {
        // Call POST /orders via Gateway
        const orderResult = await fetchWithAuthCart(`${API_BASE_URL}/orders`, { method: 'POST' });

        console.log("Checkout successful:", orderResult);
        await updateCartBadge(); // Update badge (should be 0 now)

        Swal.fire({
            icon: 'success', title: 'สั่งซื้อสำเร็จ!',
            html: `ขอบคุณสำหรับการสั่งซื้อ!<br>หมายเลขคำสั่งซื้อ: <strong>#${orderResult.orderId}</strong><br>ยอดรวม: ฿${orderResult.totalAmount.toFixed(2)}`,
            confirmButtonText: 'กลับไปหน้าสินค้า', // Changed default action
            // cancelButtonText: 'ดูประวัติ (ยังไม่ทำ)',
            // showCancelButton: true,
            allowOutsideClick: false
        }).then((result) => {
            // Always redirect to products page after confirmation
            window.location.href = 'products.html';
            // if (result.isConfirmed) { // If "ดูประวัติ" exists
            //     window.location.href = 'order-history.html';
            // } else {
            //     window.location.href = 'products.html';
            // }
        });

    } catch (error) {
        console.error("Checkout failed:", error);
        const errorMessage = error.data?.error || error.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ';
         Swal.fire({ icon: 'error', title: 'สั่งซื้อไม่สำเร็จ!', text: `เกิดข้อผิดพลาด: ${errorMessage}` });
        // Re-enable button on failure
        checkoutButton.disabled = (currentCombinedItems.length === 0); // Disable only if cart became empty somehow
        checkoutButton.innerHTML = 'ดำเนินการสั่งซื้อ';
    }
}

// --- Run on Page Load ---
document.addEventListener('DOMContentLoaded', () => {
    // Check login status first, redirect if necessary
    if (setupCartUI()) {
        // If logged in, proceed to display the cart
        displayCart();
    }
});