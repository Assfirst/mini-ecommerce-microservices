// cart-service/database.js
const sqlite3 = require('sqlite3').verbose();
const DB_SOURCE = "cart.db"; // ใช้ DB แยกสำหรับ Cart

const db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) {
        console.error("Error connecting to cart database:", err.message);
        throw err;
    } else {
        console.log('Connected to the SQLite cart database.');
        // สร้างตาราง cart_items ถ้ายังไม่มี
        db.run(`CREATE TABLE IF NOT EXISTS cart_items (
            cart_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,       -- ID ของ User เจ้าของตะกร้า
            product_id INTEGER NOT NULL,    -- ID ของสินค้า
            quantity INTEGER NOT NULL DEFAULT 1, -- จำนวนสินค้า
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- เวลาที่เพิ่ม (เผื่อใช้)
            -- UNIQUE constraint เพื่อป้องกันการมีสินค้าชนิดเดียวกันซ้ำแถวในตะกร้าของ user คนเดียว
            -- ถ้ามีซ้ำ ให้ใช้วิธีอัปเดต quantity แทน
            , UNIQUE(user_id, product_id)
        )`, (err) => {
            if (err) {
                console.error("Error creating cart_items table:", err.message);
            } else {
                console.log("Cart_items table is ready.");
            }
        });
    }
});

module.exports = db;