// user-service/database.js (Updated - เพิ่มตาราง banners)
const sqlite3 = require('sqlite3').verbose();
const DB_SOURCE = "products.db"; // ใช้ DB เดิมของ Product

const db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) { /* ... error handling ... */ throw err; }
    else {
        console.log('Connected to the SQLite products database.');
        // สร้างตาราง products (ถ้ายังไม่มี)
        db.run(`CREATE TABLE IF NOT EXISTS products ( ... โค้ดเดิม ... )`, (err) => {
            if (err) { /* ... error handling ... */ }
            else {
                // ใส่ข้อมูล products ตัวอย่าง (ถ้าต้องการ)
                // ... โค้ดเดิม ...
            }
        });

        // <<< เพิ่ม: สร้างตาราง banners (ถ้ายังไม่มี) >>>
        db.run(`CREATE TABLE IF NOT EXISTS banners (
            banner_id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_url TEXT NOT NULL,
            alt_text TEXT,
            link_url TEXT,      -- ลิงก์ที่จะไปเมื่อคลิก (optional)
            title TEXT,         -- ข้อความบน Banner (optional)
            display_order INTEGER DEFAULT 0 -- ลำดับการแสดงผล
        )`, (err) => {
            if (err) {
                console.error("Error creating banners table:", err.message);
            } else {
                console.log("Banners table is ready.");
                // <<< เพิ่ม: ใส่ข้อมูล Banner ตัวอย่าง (ทำครั้งเดียว) >>>
                 db.get("SELECT COUNT(*) as count FROM banners", [], (err, row) => {
                    if (row && row.count === 0) {
                        console.log("Inserting sample banners...");
                        const insertBannerSql = 'INSERT INTO banners (image_url, alt_text, link_url, title, display_order) VALUES (?,?,?,?,?)';
                        // ใช้รูปจาก DaisyUI เป็นตัวอย่างก่อน
                        db.run(insertBannerSql, ["https://daisyui.com/images/stock/photo-1625726411847-8cbb60cc71e6.jpg", "โปรโมชั่น 1", "#", "🔥 ลดแรง! สินค้าไอทีสุดฮิต 🔥", 1]);
                        db.run(insertBannerSql, ["https://daisyui.com/images/stock/photo-1609621838510-5ad474b7d25d.jpg", "โปรโมชั่น 2", "#", "✨ คอลเลคชั่นใหม่ล่าสุด! ✨", 2]);
                        db.run(insertBannerSql, ["https://daisyui.com/images/stock/photo-1414694762283-acccc27bca85.jpg", "โปรโมชั่น 3", "#", "🎉 ช้อปสนุก ส่งฟรีทั่วไทย 🎉", 3]);
                    }
                });
            }
        });
    }
});

module.exports = db;