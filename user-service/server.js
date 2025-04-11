// user-service/server.js (Full Latest - Includes /users/:id/role endpoint)
const express = require('express');
const db = require('./database.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3002;
const saltRounds = 10;
// !!! สำคัญ: ใช้ Secret Key เดียวกันกับใน Product Service Middleware !!!
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-secret-key-here';

app.use(express.json());

// --- Middleware: Verify Token (สำหรับ Endpoint ภายใน หรือเช็คสิทธิ์ตัวเอง) ---
// คล้าย verifyAdmin แต่เช็คแค่ Token ว่าถูกต้องและดึง userId ออกมา
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // เก็บ decoded payload (น่าจะมี userId) ไว้ใน req
        console.log(`User Service: Token verified for user ID: ${req.user.userId}`);
        next();
    } catch (error) {
        console.warn('User Service: Token verification failed:', error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Unauthorized: Token expired' });
        }
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};


// --- Routes ---

// POST /register (เหมือนเดิม)
app.post("/register", async (req, res) => { /* ... โค้ดเดิม ... */ });

// POST /login (เหมือนเดิม - ส่ง role กลับไปด้วย)
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) { /* ... */ }
    const findUserSql = "SELECT user_id, email, password_hash, name, role FROM users WHERE email = ?";
    db.get(findUserSql, [email], async (err, user) => {
        if (err) { /* ... */ return res.status(500).json({ "error": "DB error" }); }
        if (!user) { /* ... */ return res.status(401).json({ "error": "Invalid email or password" }); }
        try {
            const match = await bcrypt.compare(password, user.password_hash);
            if (match) {
                const payload = { userId: user.user_id, email: user.email }; // อาจจะใส่ role ในนี้ด้วยก็ได้
                const options = { expiresIn: '1h' };
                const token = jwt.sign(payload, JWT_SECRET, options);
                res.json({
                    "message": "Login successful",
                    "token": token,
                    "user": {
                        "userId": user.user_id,
                        "email": user.email,
                        "name": user.name,
                        "role": user.role // ส่ง role กลับไป
                    }
                });
            } else {
                 /* ... */ return res.status(401).json({ "error": "Invalid email or password" });
            }
        } catch (compareError) {
             /* ... */ return res.status(500).json({ "error": "Error processing login" });
        }
    });
});

// --- <<< เพิ่ม: Endpoint สำหรับเช็ค Role โดย Product Service >>> ---
// ใช้ verifyToken Middleware เพื่อให้แน่ใจว่า Request มาพร้อม Token ที่ถูกต้อง
app.get('/users/:id/role', verifyToken, (req, res) => {
    const requestedUserId = parseInt(req.params.id, 10); // ID ที่ขอเช็คจาก URL
    const requesterUserId = req.user.userId; // ID จาก Token ที่ Verify แล้ว

    console.log(`User Service: Role check requested for user ${requestedUserId} by user ${requesterUserId}`);

    // --- Security Check (สำคัญ): เช็คว่า ID ที่ขอ ตรงกับ ID ใน Token ไหม? ---
    // เพื่อป้องกันไม่ให้ Service อื่น (ที่อาจจะมี Token User ธรรมดา) มาขอ Role คนอื่นได้
    // หรือจะใช้วิธีอื่นเช่น เช็คว่าเป็น Request มาจาก Service ที่เชื่อถือได้ (ยากกว่า)
    // ตอนนี้เราเช็คแค่ว่า Token นี้เป็นของ User ID เดียวกับที่ขอ Role จริงๆ
    if (requestedUserId !== requesterUserId) {
         console.warn(`User Service: Forbidden attempt - User ${requesterUserId} tried to check role for user ${requestedUserId}`);
         return res.status(403).json({ error: 'Forbidden: Cannot check role for another user' });
    }

    // ถ้า ID ตรงกัน ก็ Query หา Role
    const sql = "SELECT role FROM users WHERE user_id = ?";
    db.get(sql, [requestedUserId], (err, user) => {
        if (err) {
            console.error(`User Service: DB error checking role for user ${requestedUserId}:`, err.message);
            return res.status(500).json({ error: "Database error checking role" });
        }
        if (!user) {
             console.warn(`User Service: User ${requestedUserId} not found for role check.`);
            return res.status(404).json({ error: "User not found" });
        }
        console.log(`User Service: Returning role '${user.role}' for user ${requestedUserId}`);
        res.json({ role: user.role }); // ส่ง Role กลับไป
    });
});


// --- Default Route ---
app.use((req, res) => {
    res.status(404).send("Route not found on User Service!");
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`User Service running on http://localhost:${PORT}`);
});