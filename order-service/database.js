// order-service/database.js
const sqlite3 = require('sqlite3').verbose();
const DB_SOURCE = "orders.db"; // DB แยกสำหรับ Orders

const db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) { throw err; }
    else {
        console.log('Connected to the SQLite orders database.');
        // สร้างตาราง orders
        db.run(`CREATE TABLE IF NOT EXISTS orders (
            order_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total_amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'shipped', 'cancelled', 'delivered'))
            -- อาจจะมี address_id, payment_method_id ฯลฯ ในอนาคต
        )`, (err) => { if (err) console.error("Error creating orders table:", err.message); else console.log("Orders table ready."); });

        // สร้างตาราง order_items
        db.run(`CREATE TABLE IF NOT EXISTS order_items (
            order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price_at_order REAL NOT NULL, -- <<< ราคา ณ ตอนสั่งซื้อ!
            FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
        )`, (err) => { if (err) console.error("Error creating order_items table:", err.message); else console.log("Order_items table ready."); });
    }
});
module.exports = db;