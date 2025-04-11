// order-service/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-secret-key-here'; // <<< ใช้ Secret เดียวกัน!

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized: Token required' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.userId) return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
        req.user = { id: decoded.userId }; // แนบ userId
        console.log(`Order Auth: Token verified for user ID: ${req.user.id}`);
        next();
    } catch (error) {
        console.warn('Order Auth: Token verification failed:', error.message);
        if (error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Unauthorized: Token expired' });
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
module.exports = verifyToken;