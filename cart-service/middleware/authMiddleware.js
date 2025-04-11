// cart-service/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

// !!! สำคัญ: ใช้ Secret Key เดียวกันกับใน User Service และ Product Service !!!
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-secret-key-here';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('Cart Auth: Missing or invalid Bearer token format');
        return res.status(401).json({ error: 'Unauthorized: Token required' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify token & Extract payload
        const decoded = jwt.verify(token, JWT_SECRET);

        // --- สำคัญ: ดึง userId จาก Payload ของ Token ---
        // เราคาดหวังว่าตอน User Service สร้าง Token มันใส่ userId เข้าไปใน Payload แล้ว
        const userId = decoded.userId;

        if (!userId) {
            console.warn('Cart Auth: Invalid token payload (missing userId)');
            return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
        }

        // ถ้า Token ถูกต้อง และมี userId
        console.log(`Cart Auth: Token verified for user ID: ${userId}`);
        // <<< แนบ userId ไปกับ request object เพื่อให้ route handler ใช้ต่อได้ >>>
        req.user = { id: userId };
        next(); // ไปยัง Route Handler ถัดไป

    } catch (error) {
        console.warn('Cart Auth: Token verification failed:', error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Unauthorized: Token expired' });
        }
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

module.exports = verifyToken;