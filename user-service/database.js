// user-service/database.js (Updated with role)
const sqlite3 = require('sqlite3').verbose();
const DB_SOURCE = "users.db";

const db = new sqlite3.Database(DB_SOURCE, (err) => {
    if (err) {
        console.error("Error connecting to users database:", err.message);
        throw err;
    } else {
        console.log('Connected to the SQLite users database.');
        // เพิ่มคอลัมน์ role ถ้ายังไม่มี (ทำครั้งเดียว)
        // ใช้ PRAGMA table_info เพื่อเช็คว่ามีคอลัมน์หรือยัง
        db.all(`PRAGMA table_info(users)`, (err, columns) => {
            if (err) {
                console.error("Error checking users table columns:", err.message);
                return;
            }
            const hasRoleColumn = columns.some(col => col.name === 'role');
            if (!hasRoleColumn) {
                console.log("Adding 'role' column to users table...");
                db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer'", (alterErr) => {
                    if (alterErr) {
                        console.error("Error adding role column:", alterErr.message);
                    } else {
                        console.log("'role' column added successfully.");
                        createUsersTable(); // สร้างตาราง (ถ้ายังไม่มี) หลังเพิ่มคอลัมน์เสร็จ
                    }
                });
            } else {
                 createUsersTable(); // ถ้ามีคอลัมน์แล้ว ก็ไปสร้างตารางเลย
            }
        });
    }
});

function createUsersTable() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        role TEXT NOT NULL DEFAULT 'customer' -- <<< เพิ่ม role และกำหนดค่าเริ่มต้น
    )`, (err) => {
        if (err) {
            console.error("Error creating users table:", err.message);
        } else {
            console.log("Users table is ready (with role column).");
        }
    });
}

module.exports = db;