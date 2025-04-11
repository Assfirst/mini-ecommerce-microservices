// product-service/server.js (Full Latest Version - Includes CRUD for Products & Banners with Auth)

const express = require('express');
const db = require('./database.js'); // Assumes database.js defines both products and banners tables
const verifyAdmin = require('./middleware/authMiddleware'); // Import the admin verification middleware
const jwt = require('jsonwebtoken'); // Import jwt here if authMiddleware needs it (if not checking DB directly)

const app = express();
const PORT = 3001; // Port for the Product Service

// Middleware to parse JSON request bodies (needed for POST/PUT)
app.use(express.json());

// --- Routes for Products ---

// GET /products (Public - No login required)
app.get("/products", (req, res) => {
    console.log("Product Service: Received GET /products request");
    const sql = "SELECT * FROM products ORDER BY product_id ASC"; // Added default ordering
    const params = [];
    db.all(sql, params, (err, rows) => {
        if (err) {
          console.error("Product Service: Error fetching products:", err.message);
          res.status(500).json({"error": "Database error fetching products"});
          return;
        }
        console.log(`Product Service: Sending ${rows.length} products.`);
        res.json({
            "message": "success",
            "data": rows
        });
      });
});

// GET /products/:id (Public - No login required)
app.get("/products/:id", (req, res) => {
    const productId = req.params.id;
    console.log(`Product Service: Received GET /products/${productId} request`);
    const sql = "SELECT * FROM products WHERE product_id = ?";
    const params = [productId];
    db.get(sql, params, (err, row) => {
        if (err) {
          console.error(`Product Service: Error fetching product ${productId}:`, err.message);
          res.status(500).json({"error": "Database error fetching product"});
          return;
        }
        if (row) {
            console.log(`Product Service: Sending product ${productId}.`);
            res.json({
                "message": "success",
                "data": row
            });
        } else {
            console.log(`Product Service: Product ${productId} not found.`);
            res.status(404).json({"message": `Product with id ${productId} not found`});
        }
      });
});

// POST /products (Admin Only - Requires valid Admin JWT)
app.post("/products", verifyAdmin, (req, res) => { // Use verifyAdmin middleware
    const { name, description, price, image_url } = req.body;
    console.log("Product Service: Received POST /products request by Admin:", req.user.id); // Log admin user ID

    // Basic Validation
    if (!name || price === undefined || price === null) {
        return res.status(400).json({ "error": "Missing required fields: name and price" });
    }
    if (typeof price !== 'number' || price < 0) {
         return res.status(400).json({ "error": "Invalid price: must be a non-negative number" });
    }

    const sql = 'INSERT INTO products (name, description, price, image_url) VALUES (?,?,?,?)';
    const params = [name, description || null, parseFloat(price), image_url || null]; // Ensure price is float

    db.run(sql, params, function (err) {
        if (err) {
            console.error("Product Service: Error creating product:", err.message);
            return res.status(500).json({ "error": "Database error creating product" });
        }
        const newProductId = this.lastID;
        console.log(`Product Service: Product created with ID: ${newProductId} by Admin: ${req.user.id}`);
        // Fetch the newly created product to return it
        db.get("SELECT * FROM products WHERE product_id = ?", [newProductId], (getErr, newProduct) => {
             if (getErr) {
                 console.error("Product Service: Error fetching newly created product:", getErr.message);
                 // Still return success, but maybe without the full data
                 return res.status(201).json({ message: "Product created successfully, but failed to fetch details", id: newProductId });
             }
             res.status(201).json({
                message: "Product created successfully",
                data: newProduct // Return the complete new product data
            });
        });
    });
});

// PUT /products/:id (Admin Only - Requires valid Admin JWT)
app.put("/products/:id", verifyAdmin, (req, res) => { // Use verifyAdmin middleware
    const productId = req.params.id;
    const { name, description, price, image_url } = req.body;
    console.log(`Product Service: Received PUT /products/${productId} request by Admin: ${req.user.id}`);

    // Basic Validation
    if (!name || price === undefined || price === null) {
        return res.status(400).json({ "error": "Missing required fields: name and price" });
    }
     if (typeof price !== 'number' || price < 0) {
         return res.status(400).json({ "error": "Invalid price: must be a non-negative number" });
    }

    // Update query (Ensure correct field types)
    const sql = `UPDATE products SET
                    name = ?,
                    description = ?,
                    price = ?,
                    image_url = ?
                 WHERE product_id = ?`;
    const params = [name, description || null, parseFloat(price), image_url || null, productId];

    db.run(sql, params, function (err) {
        if (err) {
            console.error(`Product Service: Error updating product ${productId}:`, err.message);
            return res.status(500).json({ "error": "Database error updating product" });
        }
        if (this.changes === 0) {
            console.log(`Product Service: Product ${productId} not found for update.`);
             return res.status(404).json({ "message": `Product with id ${productId} not found` });
        }
        console.log(`Product Service: Product ${productId} updated successfully by Admin: ${req.user.id}.`);
        // Fetch the updated product to return it
         db.get("SELECT * FROM products WHERE product_id = ?", [productId], (getErr, updatedProduct) => {
            if (getErr) {
                 console.error("Product Service: Error fetching updated product:", getErr.message);
                 return res.status(200).json({ message: "Product updated successfully, but failed to fetch details" });
            }
             res.json({
                message: "Product updated successfully",
                data: updatedProduct
            });
        });
    });
});

// DELETE /products/:id (Admin Only - Requires valid Admin JWT)
app.delete("/products/:id", verifyAdmin, (req, res) => { // Use verifyAdmin middleware
    const productId = req.params.id;
    console.log(`Product Service: Received DELETE /products/${productId} request by Admin: ${req.user.id}`);

    const sql = 'DELETE FROM products WHERE product_id = ?';
    const params = [productId];

    db.run(sql, params, function (err) {
        if (err) {
            console.error(`Product Service: Error deleting product ${productId}:`, err.message);
            return res.status(500).json({ "error": "Database error deleting product" });
        }
        if (this.changes === 0) {
             console.log(`Product Service: Product ${productId} not found for deletion.`);
             return res.status(404).json({ "message": `Product with id ${productId} not found` });
        }
        console.log(`Product Service: Product ${productId} deleted successfully by Admin: ${req.user.id}.`);
        // Send 204 No Content for successful deletion
        res.status(204).send();
    });
});


// --- Routes for Banners ---

// GET /banners (Public - No login required)
app.get("/banners", (req, res) => {
    console.log("Product Service: Received GET /banners request");
    const sql = "SELECT * FROM banners ORDER BY display_order ASC, banner_id ASC";
    db.all(sql, [], (err, rows) => {
        if (err) {
          console.error("Product Service: Error fetching banners:", err.message);
          res.status(500).json({"error": "Database error fetching banners"});
          return;
        }
        console.log(`Product Service: Sending ${rows.length} banners.`);
        res.json({
            "message": "success",
            "data": rows
        });
      });
});

// POST /banners (Admin Only)
app.post("/banners", verifyAdmin, (req, res) => {
    const { image_url, alt_text, link_url, title, display_order } = req.body;
    console.log("Product Service: Received POST /banners request by Admin:", req.user.id);

    if (!image_url) {
        return res.status(400).json({ "error": "Missing required field: image_url" });
    }

    const sql = 'INSERT INTO banners (image_url, alt_text, link_url, title, display_order) VALUES (?,?,?,?,?)';
    const params = [image_url, alt_text || null, link_url || null, title || null, display_order || 0];

    db.run(sql, params, function (err) {
        if (err) {
            console.error("Product Service: Error creating banner:", err.message);
            return res.status(500).json({ error: "Database error creating banner" });
        }
        const newBannerId = this.lastID;
        console.log(`Product Service: Banner created with ID: ${newBannerId} by Admin: ${req.user.id}`);
         db.get("SELECT * FROM banners WHERE banner_id = ?", [newBannerId], (getErr, newBanner) => {
             if (getErr) {
                 console.error("Product Service: Error fetching newly created banner:", getErr.message);
                 return res.status(201).json({ message: "Banner created successfully, but failed to fetch details", id: newBannerId });
             }
             res.status(201).json({ message: "Banner created successfully", data: newBanner });
         });
    });
});

// PUT /banners/:id (Admin Only)
app.put("/banners/:id", verifyAdmin, (req, res) => {
    const bannerId = req.params.id;
    const { image_url, alt_text, link_url, title, display_order } = req.body;
    console.log(`Product Service: Received PUT /banners/${bannerId} request by Admin: ${req.user.id}`);

     if (!image_url) {
        return res.status(400).json({ "error": "Missing required field: image_url" });
    }

    const sql = `UPDATE banners SET
                    image_url = ?,
                    alt_text = ?,
                    link_url = ?,
                    title = ?,
                    display_order = ?
                 WHERE banner_id = ?`;
    // Send all fields explicitly for update
    const params = [image_url, alt_text || null, link_url || null, title || null, display_order || 0, bannerId];

    db.run(sql, params, function (err) {
         if (err) {
             console.error(`Product Service: Error updating banner ${bannerId}:`, err.message);
             return res.status(500).json({ error: "Database error updating banner" });
         }
         if (this.changes === 0) {
             console.log(`Product Service: Banner ${bannerId} not found for update.`);
             return res.status(404).json({ message: `Banner with id ${bannerId} not found` });
         }
         console.log(`Product Service: Banner ${bannerId} updated successfully by Admin: ${req.user.id}.`);
          db.get("SELECT * FROM banners WHERE banner_id = ?", [bannerId], (getErr, updatedBanner) => {
            if (getErr) {
                 console.error("Product Service: Error fetching updated banner:", getErr.message);
                 return res.status(200).json({ message: "Banner updated successfully, but failed to fetch details" });
            }
             res.json({ message: "Banner updated successfully", data: updatedBanner });
        });
    });
});

// DELETE /banners/:id (Admin Only)
app.delete("/banners/:id", verifyAdmin, (req, res) => {
     const bannerId = req.params.id;
     console.log(`Product Service: Received DELETE /banners/${bannerId} request by Admin: ${req.user.id}`);
     const sql = 'DELETE FROM banners WHERE banner_id = ?';
     db.run(sql, [bannerId], function (err) {
         if (err) {
             console.error(`Product Service: Error deleting banner ${bannerId}:`, err.message);
             return res.status(500).json({ error: "Database error deleting banner" });
         }
         if (this.changes === 0) {
             console.log(`Product Service: Banner ${bannerId} not found for deletion.`);
             return res.status(404).json({ message: `Banner with id ${bannerId} not found` });
         }
         console.log(`Product Service: Banner ${bannerId} deleted successfully by Admin: ${req.user.id}.`);
         res.status(204).send(); // Send 204 No Content
     });
});


// --- Default Route (404 Not Found) ---
app.use((req, res) => {
    console.log(`Product Service: Route not found - ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: "Resource not found on Product Service!" }); // Respond with JSON
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Product Service running on http://localhost:${PORT}`);
});