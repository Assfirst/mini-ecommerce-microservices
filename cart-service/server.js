// cart-service/server.js
const express = require('express');
const cors = require('cors');
const db = require('./database.js');
const verifyToken = require('./middleware/authMiddleware'); // Import Middleware

const app = express();
const PORT = 3003; // <<< ใช้ Port ใหม่!

app.use(cors()); // เปิด CORS
app.use(express.json()); // เปิดรับ JSON Body

// --- Routes ---

// Middleware verifyToken จะถูกใช้กับทุก Route ของ /cart ข้างล่างนี้
// เพื่อให้แน่ใจว่าทุก Request ต้องมี Token และเราจะรู้ userId
app.use('/cart', verifyToken); // <<< ใช้ Middleware กับทุก path ที่ขึ้นต้นด้วย /cart

// GET /cart - ดึงรายการสินค้าในตะกร้าของผู้ใช้ปัจจุบัน
app.get('/cart', (req, res) => {
    const userId = req.user.id; // <<< ดึง userId จาก Middleware
    console.log(`Cart Service: GET /cart request for user ID: ${userId}`);

    const sql = `
        SELECT ci.cart_item_id, ci.product_id, ci.quantity
        FROM cart_items ci
        WHERE ci.user_id = ?
        ORDER BY ci.added_at DESC`; // เรียงตามเวลาที่เพิ่มล่าสุดขึ้นก่อน
        // หมายเหตุ: เราไม่ได้ JOIN กับตาราง products ที่นี่
        // Frontend ต้องเอา product_id ไป fetch รายละเอียดสินค้าเอง

    db.all(sql, [userId], (err, rows) => {
        if (err) {
            console.error(`Cart Service: Error fetching cart for user ${userId}:`, err.message);
            return res.status(500).json({ error: "Database error fetching cart" });
        }
        console.log(`Cart Service: Found ${rows.length} items for user ${userId}.`);
        res.json({ message: "success", data: rows });
    });
});

// POST /cart - เพิ่มสินค้าลงตะกร้า (หรืออัปเดตจำนวนถ้ามีอยู่แล้ว)
app.post('/cart', (req, res) => {
    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body; // รับ productId และ quantity (default เป็น 1)
    console.log(`Cart Service: POST /cart request for user ID: ${userId}, Product ID: ${productId}, Quantity: ${quantity}`);

    // --- Validation ---
    if (!productId || typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
        return res.status(400).json({ error: "Invalid input: productId (number) and quantity (positive integer) are required." });
    }

    // --- Logic: เพิ่มหรืออัปเดต ---
    // เราใช้ UNIQUE constraint ดังนั้น INSERT จะ error ถ้ามี (userId, productId) ซ้ำ
    // เราจะใช้ INSERT OR IGNORE แล้วตามด้วย UPDATE หรือ INSERT ... ON CONFLICT (SQLite 3.24+)
    // วิธีที่ใช้ได้ทั่วไปคือ INSERT OR IGNORE แล้ว UPDATE
    // (วิธีที่ดีกว่าคือ SELECT ก่อน แล้วค่อย INSERT หรือ UPDATE แต่จะช้ากว่านิดหน่อย)

    const insertSql = `INSERT OR IGNORE INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)`;
    db.run(insertSql, [userId, productId, quantity], function(err) {
        if (err) {
            console.error(`Cart Service: Error during INSERT OR IGNORE for user ${userId}, product ${productId}:`, err.message);
            return res.status(500).json({ error: "Database error adding to cart (step 1)" });
        }

        // ถ้า this.changes เป็น 0 แสดงว่า IGNORE ทำงาน (มีแถวอยู่แล้ว) -> ต้อง UPDATE
        if (this.changes === 0) {
            console.log(`Cart Service: Item exists, updating quantity for user ${userId}, product ${productId}`);
            const updateSql = `UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?`;
            db.run(updateSql, [quantity, userId, productId], function(updateErr) {
                if (updateErr) {
                     console.error(`Cart Service: Error during UPDATE quantity for user ${userId}, product ${productId}:`, updateErr.message);
                    // Note: อาจจะเกิด race condition ถ้า user กดเร็วๆ แต่ไม่น่าห่วงมากสำหรับตอนนี้
                    return res.status(500).json({ error: "Database error updating cart quantity" });
                }
                 if (this.changes === 0) {
                     // ไม่ควรเกิด ถ้า INSERT OR IGNORE ถูก
                     console.error(`Cart Service: Failed to update quantity for existing item user ${userId}, product ${productId}`);
                     return res.status(500).json({ error: "Failed to update quantity" });
                 }
                 console.log(`Cart Service: Quantity updated for user ${userId}, product ${productId}`);
                 res.status(200).json({ message: "Item quantity updated in cart" }); // ตอบ 200 OK เพราะเป็นการอัปเดต
            });
        } else {
            // ถ้า this.changes เป็น 1 แสดงว่า INSERT สำเร็จ
            const newItemId = this.lastID;
            console.log(`Cart Service: Item added to cart with ID: ${newItemId} for user ${userId}`);
            res.status(201).json({ message: "Item added to cart", data: { cart_item_id: newItemId, productId, quantity } }); // ตอบ 201 Created
        }
    });
});

// PUT /cart/item/:itemId - อัปเดตจำนวนสินค้าชิ้นเดียวในตะกร้า
app.put('/cart/item/:itemId', (req, res) => {
    const userId = req.user.id;
    const itemId = parseInt(req.params.itemId, 10); // ID ของแถวในตาราง cart_items
    const { quantity } = req.body;
    console.log(`Cart Service: PUT /cart/item/${itemId} request for user ID: ${userId}, New Quantity: ${quantity}`);


    if (isNaN(itemId) || typeof quantity !== 'number' || quantity <= 0 || !Number.isInteger(quantity)) {
        return res.status(400).json({ error: "Invalid input: itemId (number from URL) and quantity (positive integer in body) are required." });
    }

    const sql = `UPDATE cart_items SET quantity = ? WHERE cart_item_id = ? AND user_id = ?`;
    db.run(sql, [quantity, itemId, userId], function(err) {
        if (err) {
            console.error(`Cart Service: Error updating item ${itemId} for user ${userId}:`, err.message);
            return res.status(500).json({ error: "Database error updating cart item" });
        }
        if (this.changes === 0) {
            // อาจจะเพราะ itemId ไม่ถูกต้อง หรือ itemId นั้นไม่ได้เป็นของ userId คนนี้
            console.warn(`Cart Service: Item ${itemId} not found or not owned by user ${userId} for update.`);
            return res.status(404).json({ error: "Cart item not found or access denied" });
        }
        console.log(`Cart Service: Item ${itemId} quantity updated to ${quantity} for user ${userId}`);
        res.status(200).json({ message: "Cart item quantity updated", data: { cart_item_id: itemId, quantity } });
    });
});

// DELETE /cart/item/:itemId - ลบสินค้าชิ้นเดียวออกจากตะกร้า
app.delete('/cart/item/:itemId', (req, res) => {
    const userId = req.user.id;
    const itemId = parseInt(req.params.itemId, 10);
     console.log(`Cart Service: DELETE /cart/item/${itemId} request for user ID: ${userId}`);

    if (isNaN(itemId)) {
         return res.status(400).json({ error: "Invalid input: itemId (number from URL) is required." });
    }

    const sql = `DELETE FROM cart_items WHERE cart_item_id = ? AND user_id = ?`;
    db.run(sql, [itemId, userId], function(err) {
        if (err) {
             console.error(`Cart Service: Error deleting item ${itemId} for user ${userId}:`, err.message);
             return res.status(500).json({ error: "Database error deleting cart item" });
        }
         if (this.changes === 0) {
            console.warn(`Cart Service: Item ${itemId} not found or not owned by user ${userId} for deletion.`);
             return res.status(404).json({ error: "Cart item not found or access denied" });
        }
        console.log(`Cart Service: Item ${itemId} deleted for user ${userId}`);
        res.status(204).send(); // 204 No Content สำเร็จ ไม่มีอะไรต้องส่งกลับ
    });
});

// DELETE /cart - เคลียร์ตะกร้าทั้งหมดของผู้ใช้ (อาจจะเรียกโดย Order Service)
app.delete('/cart', (req, res) => {
    const userId = req.user.id;
    console.log(`Cart Service: DELETE /cart request (clear cart) for user ID: ${userId}`);

    const sql = `DELETE FROM cart_items WHERE user_id = ?`;
    db.run(sql, [userId], function(err) {
         if (err) {
             console.error(`Cart Service: Error clearing cart for user ${userId}:`, err.message);
             return res.status(500).json({ error: "Database error clearing cart" });
        }
        console.log(`Cart Service: Cart cleared for user ${userId}. Items deleted: ${this.changes}`);
        res.status(204).send(); // 204 No Content
    });
});


// --- Default Route ---
app.use((req, res) => {
    // ถ้า Request มาถึงตรงนี้ แสดงว่าไม่ตรงกับ Route ไหนเลย (และผ่าน verifyToken มาแล้ว ถ้า path เริ่มด้วย /cart)
    console.log(`Cart Service: Route not found - ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: "Route not found on Cart Service!" });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Cart Service running on http://localhost:${PORT}`);
});