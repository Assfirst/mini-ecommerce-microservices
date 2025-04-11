// api-gateway/server.js (Full Latest - Cleaned)

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const SERVICE_URLS = {
    PRODUCT_SERVICE: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3001',
    USER_SERVICE:    process.env.USER_SERVICE_URL    || 'http://localhost:3002',
    CART_SERVICE:    process.env.CART_SERVICE_URL    || 'http://localhost:3003',
    ORDER_SERVICE:   process.env.ORDER_SERVICE_URL   || 'http://localhost:3004'
};

app.use((req, res, next) => {
    console.log(`API Gateway: ${new Date().toISOString()} - Received Request: ${req.method} ${req.originalUrl}`);
    next();
});

function handleServiceError(error, res, serviceName = 'Target Service') {
    console.error(`API Gateway: Error during request to ${serviceName}:`, error.message);
    if (error.response) {
        console.error(` -> ${serviceName} Status: ${error.response.status}`);
        console.error(` -> ${serviceName} Data:`, JSON.stringify(error.response.data));
        res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
        console.error(` -> No response received from ${serviceName}.`);
        res.status(503).json({ message: `${serviceName} unavailable`, code: 'SERVICE_UNAVAILABLE' });
    } else {
        console.error(' -> Error setting up request:', error.message);
        res.status(500).json({ message: 'API Gateway internal processing error', code: 'GATEWAY_ERROR' });
    }
}

async function forwardRequest(req, res, targetUrl, method = 'GET', serviceName = 'Target Service') {
    console.log(`API Gateway: Forwarding ${method} ${req.originalUrl} to ${targetUrl}`);
    try {
        const headersToForward = {};
        if (req.headers.authorization) {
            headersToForward['Authorization'] = req.headers.authorization;
        }
        if ((method === 'POST' || method === 'PUT' || method === 'PATCH') && req.headers['content-type']) {
            headersToForward['Content-Type'] = req.headers['content-type'];
        }
        if (req.headers.accept) {
            headersToForward['Accept'] = req.headers.accept;
        }
        if (req.headers['user-agent']) {
            headersToForward['User-Agent'] = req.headers['user-agent'];
        }

        const options = {
            method: method,
            url: targetUrl,
            headers: headersToForward,
            data: (method === 'POST' || method === 'PUT' || method === 'PATCH') && req.body ? req.body : undefined,
            timeout: 5000
        };

         if (options.data && !options.headers['Content-Type'] && !(options.data instanceof FormData)) {
             options.headers['Content-Type'] = 'application/json';
        }

        const response = await axios(options);

        console.log(`API Gateway: Response from ${serviceName} Status: ${response.status}`);
        if (response.status === 204) { return res.status(204).send(); }
        res.status(response.status).json(response.data);

    } catch (error) {
        handleServiceError(error, res, `${serviceName} (${method} ${req.originalUrl})`);
    }
}

// Product Service Routes
app.get('/products',        (req, res) => forwardRequest(req, res, `${SERVICE_URLS.PRODUCT_SERVICE}/products`, 'GET', 'Product Service'));
app.get('/products/:id',    (req, res) => forwardRequest(req, res, `${SERVICE_URLS.PRODUCT_SERVICE}/products/${req.params.id}`, 'GET', 'Product Service'));
app.get('/banners',         (req, res) => forwardRequest(req, res, `${SERVICE_URLS.PRODUCT_SERVICE}/banners`, 'GET', 'Product Service'));
app.post('/products',       (req, res) => forwardRequest(req, res, `${SERVICE_URLS.PRODUCT_SERVICE}/products`, 'POST', 'Product Service'));
app.put('/products/:id',    (req, res) => forwardRequest(req, res, `${SERVICE_URLS.PRODUCT_SERVICE}/products/${req.params.id}`, 'PUT', 'Product Service'));
app.delete('/products/:id', (req, res) => forwardRequest(req, res, `${SERVICE_URLS.PRODUCT_SERVICE}/products/${req.params.id}`, 'DELETE', 'Product Service'));
app.post('/banners',        (req, res) => forwardRequest(req, res, `${SERVICE_URLS.PRODUCT_SERVICE}/banners`, 'POST', 'Product Service'));
app.put('/banners/:id',     (req, res) => forwardRequest(req, res, `${SERVICE_URLS.PRODUCT_SERVICE}/banners/${req.params.id}`, 'PUT', 'Product Service'));
app.delete('/banners/:id',  (req, res) => forwardRequest(req, res, `${SERVICE_URLS.PRODUCT_SERVICE}/banners/${req.params.id}`, 'DELETE', 'Product Service'));

// User Service Routes
app.post('/register',       (req, res) => forwardRequest(req, res, `${SERVICE_URLS.USER_SERVICE}/register`, 'POST', 'User Service'));
app.post('/login',          (req, res) => forwardRequest(req, res, `${SERVICE_URLS.USER_SERVICE}/login`, 'POST', 'User Service'));
app.get('/users/:id/role', (req, res) => forwardRequest(req, res, `${SERVICE_URLS.USER_SERVICE}/users/${req.params.id}/role`, 'GET', 'User Service'));

// Cart Service Routes
app.get('/cart',            (req, res) => forwardRequest(req, res, `${SERVICE_URLS.CART_SERVICE}/cart`, 'GET', 'Cart Service'));
app.post('/cart',           (req, res) => forwardRequest(req, res, `${SERVICE_URLS.CART_SERVICE}/cart`, 'POST', 'Cart Service'));
app.put('/cart/item/:itemId',(req, res) => forwardRequest(req, res, `${SERVICE_URLS.CART_SERVICE}/cart/item/${req.params.itemId}`, 'PUT', 'Cart Service'));
app.delete('/cart/item/:itemId',(req, res) => forwardRequest(req, res, `${SERVICE_URLS.CART_SERVICE}/cart/item/${req.params.itemId}`, 'DELETE', 'Cart Service'));
app.delete('/cart',         (req, res) => forwardRequest(req, res, `${SERVICE_URLS.CART_SERVICE}/cart`, 'DELETE', 'Cart Service'));

// Order Service Routes
app.post('/orders',         (req, res) => forwardRequest(req, res, `${SERVICE_URLS.ORDER_SERVICE}/orders`, 'POST', 'Order Service'));
// (Optional Order GET routes...)

// Default Route (404 Not Found)
app.use((req, res) => {
    console.warn(`API Gateway: Route not found - ${req.method} ${req.originalUrl}`);
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found on API Gateway!`, code: 'ROUTE_NOT_FOUND' });
});

// Start the Server
app.listen(PORT, () => {
    console.log(`API Gateway running on http://localhost:${PORT}`);
    console.log(` -> Forwarding to Product Service: ${SERVICE_URLS.PRODUCT_SERVICE}`);
    console.log(` -> Forwarding to User Service:    ${SERVICE_URLS.USER_SERVICE}`);
    console.log(` -> Forwarding to Cart Service:    ${SERVICE_URLS.CART_SERVICE}`);
    console.log(` -> Forwarding to Order Service:   ${SERVICE_URLS.ORDER_SERVICE}`);
});