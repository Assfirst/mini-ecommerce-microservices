// order-service/server.js
const express = require('express');
const cors = require('cors');
const db = require('./database.js');
const verifyToken = require('./middleware/authMiddleware');
const axios = require('axios'); // <<< ต้องใช้ axios เรียก Service อื่น

const app = express();
const PORT = 3004; // <<< Port ใหม่!
app.use(cors());
app.use(express.json());

// URLs ของ Service อื่น (ควรใช้ Env Var)
const CART_SERVICE_URL = process.env.CART_SERVICE_URL || 'http://localhost:3003';
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001';

// --- Routes ---
app.use('/orders', verifyToken); // ทุก Route ของ Order ต้องใช้ Token

// POST /orders - สร้าง Order ใหม่ (Checkout Process)
app.post('/orders', async (req, res) => {
    const userId = req.user.id;
    const token = req.headers.authorization; // เอา Token มาใช้เรียก Service อื่นต่อ
    console.log(`Order Service: Received POST /orders request for user ID: ${userId}`);

    let cartItems = [];
    let productDetailsMap = new Map(); // ใช้ Map เก็บรายละเอียดสินค้าที่ดึงมาแล้ว

    try {
        // 1. ดึงข้อมูลตะกร้าจาก Cart Service
        console.log(`Order Service: Fetching cart from ${CART_SERVICE_URL}/cart`);
        const cartResponse = await axios.get(`${CART_SERVICE_URL}/cart`, {
            headers: { 'Authorization': token } // ส่ง Token ไปด้วย
        });
        if (!cartResponse.data || !cartResponse.data.data || cartResponse.data.data.length === 0) {
            console.log(`Order Service: Cart is empty for user ${userId}.`);
            return res.status(400).json({ error: "Cannot create order with an empty cart." });
        }
        cartItems = cartResponse.data.data; // [{ cart_item_id, product_id, quantity }, ...]
        console.log(`Order Service: Fetched ${cartItems.length} item types from cart.`);

        // 2. ดึงรายละเอียดและ *ราคาล่าสุด* ของสินค้าแต่ละชิ้นจาก Product Service
        console.log(`Order Service: Fetching product details from ${PRODUCT_SERVICE_URL}`);
        const productIds = cartItems.map(item => item.product_id);
        // สร้าง Promises สำหรับดึงข้อมูลสินค้าแต่ละชิ้น
        const productPromises = productIds.map(id =>
            axios.get(`${PRODUCT_SERVICE_URL}/products/${id}`)
                 .then(res => res.data.data) // เอาเฉพาะ data object
                 .catch(err => {
                     console.error(` - Error fetching product ${id}: ${err.message}`);
                     return null; // คืนค่า null ถ้าดึงไม่ได้
                 })
        );
        const products = await Promise.all(productPromises);

        // สร้าง Map เพื่อให้เข้าถึงรายละเอียดสินค้าง่ายๆ ด้วย product_id
        products.forEach(p => { if (p) productDetailsMap.set(p.product_id, p); });

        // 3. ตรวจสอบว่าดึงข้อมูลสินค้าได้ครบทุกชิ้นในตะกร้าหรือไม่
        const unavailableProductIds = cartItems
            .filter(item => !productDetailsMap.has(item.product_id))
            .map(item => item.product_id);

        if (unavailableProductIds.length > 0) {
            console.error(`Order Service: Some products are unavailable: ${unavailableProductIds.join(', ')}`);
            return res.status(400).json({
                error: `Some products in your cart are currently unavailable (IDs: ${unavailableProductIds.join(', ')}). Please remove them and try again.`
            });
        }

        // 4. คำนวณ Total Amount และเตรียมข้อมูล Order Items
        let totalAmount = 0;
        const orderItemsData = cartItems.map(item => {
            const product = productDetailsMap.get(item.product_id);
            const priceAtOrder = product.price; // <<< ใช้ราคาล่าสุดจาก Product Service
            totalAmount += priceAtOrder * item.quantity;
            return {
                product_id: item.product_id,
                quantity: item.quantity,
                price_at_order: priceAtOrder
            };
        });
        console.log(`Order Service: Calculated Total Amount: ${totalAmount}`);

        // 5. จำลองการชำระเงิน (สมมติว่าสำเร็จเสมอ)
        console.log("Order Service: Simulating successful payment...");
        const paymentStatus = 'paid'; // สมมติจ่ายสำเร็จ

        // 6. บันทึก Order ลง Database (ใช้ Transaction เพื่อความปลอดภัย)
        db.serialize(() => {
            db.run("BEGIN TRANSACTION;");

            const orderSql = `INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)`;
            db.run(orderSql, [userId, totalAmount, paymentStatus], function(orderErr) {
                if (orderErr) {
                    console.error("Order Service: DB error inserting order:", orderErr.message);
                    db.run("ROLLBACK;"); // Rollback transaction
                    return res.status(500).json({ error: "Database error creating order." });
                }
                const orderId = this.lastID; // <<< ได้ Order ID ใหม่
                console.log(`Order Service: Order ${orderId} created in DB.`);

                // 7. บันทึก Order Items ลง Database
                const itemSql = `INSERT INTO order_items (order_id, product_id, quantity, price_at_order) VALUES (?, ?, ?, ?)`;
                const itemStmt = db.prepare(itemSql);
                let itemInsertError = null;

                orderItemsData.forEach(item => {
                    itemStmt.run([orderId, item.product_id, item.quantity, item.price_at_order], (itemErr) => {
                         if (itemErr) {
                             console.error(`Order Service: DB error inserting order item (p_id: ${item.product_id}):`, itemErr.message);
                             itemInsertError = itemErr; // เก็บ Error ไว้
                         }
                    });
                });

                itemStmt.finalize(async (finalizeErr) => { // รอให้ statement ทำงานเสร็จ
                     if (finalizeErr) console.error("Error finalizing item statement:", finalizeErr); // Log เพิ่มเติม

                     if (itemInsertError) {
                         console.error("Order Service: Rolling back due to item insert error.");
                         db.run("ROLLBACK;");
                         return res.status(500).json({ error: "Database error saving order items." });
                     }

                     // ถ้าทุกอย่างสำเร็จ -> Commit Transaction
                     db.run("COMMIT;", async (commitErr) => {
                        if (commitErr) {
                             console.error("Order Service: Error committing transaction:", commitErr.message);
                             // พยายาม Rollback อีกที (อาจจะไม่สำเร็จ)
                             db.run("ROLLBACK;");
                             return res.status(500).json({ error: "Database error finalizing order." });
                        }

                        console.log(`Order Service: Order ${orderId} committed successfully.`);

                        // 8. (ถ้าสำเร็จ) เคลียร์ตะกร้าใน Cart Service
                        try {
                            console.log(`Order Service: Clearing cart at ${CART_SERVICE_URL}/cart`);
                            await axios.delete(`${CART_SERVICE_URL}/cart`, {
                                headers: { 'Authorization': token }
                            });
                            console.log(`Order Service: Cart cleared successfully for user ${userId}.`);
                        } catch (clearCartError) {
                            // ไม่ควรทำให้ Order ล้มเหลว แค่ Log ไว้ว่าเคลียร์ตะกร้าไม่ได้
                            console.error(`Order Service: Failed to clear cart for user ${userId} after order ${orderId}:`, clearCartError.message);
                            if (clearCartError.response) {
                                console.error(" -> Cart Service Response:", clearCartError.response.data);
                            }
                        }

                        // 9. ส่ง Response ยืนยันกลับไป Frontend
                        res.status(201).json({
                            message: "Order created successfully!",
                            orderId: orderId,
                            totalAmount: totalAmount,
                            items: orderItemsData // ส่งรายการสินค้าที่สั่งไปด้วยก็ได้
                        });
                     });
                });
            });
        }); // End of db.serialize

    } catch (error) {
        console.error("Order Service: Error during checkout process:", error.message);
         if (error.response) { // Error from axios call
            console.error(" -> Service Response Status:", error.response.status);
            console.error(" -> Service Response Data:", error.response.data);
            // ส่งต่อ Error หรือส่ง Error กลางๆ
            res.status(error.response.status || 503).json(error.response.data || { error: 'Error communicating with other services' });
        } else if (error.request) { // No response
             res.status(503).json({ error: 'Could not reach necessary services' });
        } else { // Other errors
            res.status(500).json({ error: 'An internal error occurred during checkout.' });
        }
    }
});

// (Optional) GET /orders - ดึงประวัติการสั่งซื้อ
// (Optional) GET /orders/:order_id - ดึงรายละเอียด Order

// --- Default Route ---
app.use((req, res) => { res.status(404).json({ error: "Route not found on Order Service!" }); });

// --- Start Server ---
app.listen(PORT, () => { console.log(`Order Service running on http://localhost:${PORT}`); });