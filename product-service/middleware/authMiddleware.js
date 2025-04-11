// product-service/middleware/authMiddleware.js (Updated to call User Service API)
const jwt = require('jsonwebtoken');
const axios = require('axios'); // <<< ใช้ axios

// !!! สำคัญ: ใช้ Secret Key เดียวกันกับใน User Service !!!
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-strong-secret-key-here';
// <<< URL ของ User Service >>>
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';

const verifyAdmin = async (req, res, next) => { // <<< เปลี่ยนเป็น async
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('Auth Middleware (Product Service): No or invalid Bearer token');
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid token format' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 1. Verify the token and extract userId
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId;

        if (!userId) {
            console.warn('Auth Middleware (Product Service): Invalid token payload (missing userId)');
            return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
        }

        // 2. Call User Service API to check the role for this userId
        try {
            console.log(`Auth Middleware (Product Service): Calling User Service (${USER_SERVICE_URL}) to check role for user ID: ${userId}`);

            // เรียก GET /users/:id/role ที่ User Service
            // ส่ง Token เดิมไปด้วยใน Header 'Authorization' เพื่อให้ User Service ตรวจสอบสิทธิ์ของ Request นี้
            const response = await axios.get(`${USER_SERVICE_URL}/users/${userId}/role`, {
                headers: { 'Authorization': `Bearer ${token}` } // <<< ส่ง Token ต่อไป
            });

            const userRole = response.data.role; // ดึง role จาก response data

            // 3. Check if the role is 'admin'
            if (userRole !== 'admin') {
                console.warn(`Auth Middleware (Product Service): Access denied via User Service for user ID: ${userId}, Role: ${userRole}`);
                return res.status(403).json({ error: 'Forbidden: Admin access required' }); // 403 Forbidden
            }

            // 4. If admin, grant access and attach user info to request
            console.log(`Auth Middleware (Product Service): Admin access granted via User Service for user ID: ${userId}`);
            req.user = { id: userId, role: userRole }; // เก็บข้อมูล user ไว้ใน req
            next(); // Proceed to the actual route handler

        } catch (apiError) {
            // Handle errors from the User Service API call
            console.error("Auth Middleware (Product Service): Error calling User Service API:", apiError.message);
            if (apiError.response) {
                // If User Service responded with an error status
                 console.error(" -> User Service Response Status:", apiError.response.status);
                 console.error(" -> User Service Response Data:", apiError.response.data);
                 // Forward the status and error message from User Service, or use a generic one
                 return res.status(apiError.response.status || 500).json(
                     apiError.response.data || { error: 'Error verifying user role with User Service' }
                 );
            } else if (apiError.request) {
                 // If the request was made but no response received (User Service down?)
                console.error(" -> No response received from User Service.");
                return res.status(503).json({ error: 'User Service unavailable for role check' }); // 503 Service Unavailable
            } else {
                 // Other errors setting up the request
                 console.error(' -> Error setting up request to User Service:', apiError.message);
                return res.status(500).json({ error: 'Internal error while contacting User Service' });
            }
        }

    } catch (error) {
        // Handle errors during JWT verification itself
         console.warn('Auth Middleware (Product Service): Token verification failed:', error.message);
         if (error.name === 'TokenExpiredError') {
             return res.status(401).json({ error: 'Unauthorized: Token expired' });
         }
         return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};

module.exports = verifyAdmin;