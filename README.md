ได้เลยเพื่อน จัดให้! นี่คือเอกสารข้อกำหนดคุณสมบัติ (Feature Specification Document) สำหรับโปรเจกต์ร้านค้าออนไลน์ Microservices ของเรา เขียนแบบทางการ สุภาพ ตามที่ขอเลยนะ

เอกสารข้อกำหนดคุณสมบัติ (Feature Specification Document)
โครงการ: ระบบร้านค้าออนไลน์ขนาดเล็ก (Mini E-commerce Microservices)
เวอร์ชัน: 1.0
วันที่: 24 พฤษภาคม 2567

1. บทนำ (Introduction)

เอกสารฉบับนี้จัดทำขึ้นเพื่อระบุข้อกำหนดและคุณสมบัติของระบบร้านค้าออนไลน์ขนาดเล็ก (Mini E-commerce) ซึ่งได้รับการออกแบบและพัฒนาโดยใช้สถาปัตยกรรมแบบไมโครเซอร์วิส (Microservices Architecture) ระบบนี้มีวัตถุประสงค์เพื่อเป็นแพลตฟอร์มสำหรับการซื้อขายสินค้าออนไลน์เบื้องต้น รองรับการทำงานของผู้ใช้งานทั่วไป (ลูกค้า) และผู้ดูแลระบบ (แอดมิน)

2. วัตถุประสงค์ของระบบ (System Objectives)

พัฒนาแพลตฟอร์ม E-commerce พื้นฐานที่สามารถแสดงรายการสินค้า, จัดการผู้ใช้งาน, ระบบตะกร้าสินค้า และการสั่งซื้อเบื้องต้นได้

ใช้สถาปัตยกรรมแบบไมโครเซอร์วิสเพื่อส่งเสริมความยืดหยุ่น (Flexibility), ความสามารถในการขยายระบบ (Scalability), และการบำรุงรักษาที่ง่ายขึ้น (Maintainability) โดยแยกส่วนการทำงานหลักออกจากกัน

มอบประสบการณ์การใช้งานพื้นฐานที่ราบรื่นสำหรับลูกค้าในการเลือกดูสินค้า, เพิ่มสินค้าลงตะกร้า, และดำเนินการสั่งซื้อ (จำลองการชำระเงิน)

จัดเตรียมส่วนการจัดการสำหรับผู้ดูแลระบบในการเพิ่ม, แก้ไข, และลบข้อมูลสินค้าและแบนเนอร์โปรโมชั่น

ประยุกต์ใช้หลักการด้านความปลอดภัยเบื้องต้น เช่น การป้องกัน SQL Injection, XSS, การเข้ารหัสรหัสผ่าน และการยืนยันตัวตนด้วย JWT

3. ภาพรวมสถาปัตยกรรม (Architecture Overview)

ระบบนี้ใช้สถาปัตยกรรมแบบไมโครเซอร์วิส ประกอบด้วย Service ย่อยๆ ที่ทำงานเป็นอิสระต่อกัน แต่ละ Service มีหน้าที่รับผิดชอบเฉพาะ และมีฐานข้อมูลเป็นของตัวเอง (SQLite) การสื่อสารระหว่าง Frontend และ Backend Services จะผ่านตัวกลางที่เรียกว่า API Gateway ซึ่งทำหน้าที่เป็น Single Point of Entry และจัดการเส้นทาง (Routing) ไปยัง Service ที่เหมาะสม

4. เทคโนโลยีที่ใช้ (Technology Stack)

Backend:

Runtime: Node.js

Framework: Express.js

Database: SQLite (แยกไฟล์สำหรับแต่ละ Service ที่ต้องการ Persistence)

Authentication/Authorization: JSON Web Tokens (JWT), bcrypt (สำหรับ Password Hashing)

API Communication (Inter-service): Axios

Middleware: Cors, (Auth Middleware ที่พัฒนาขึ้นเอง)

Frontend:

Structure: HTML5

Styling: Tailwind CSS (ผ่าน CDN), DaisyUI (Component Library & Themes - ผ่าน CDN)

Interactivity: JavaScript (Vanilla JS), Fetch API

Notifications: SweetAlert2 (ผ่าน CDN)

Development Tools:

Version Control: Git, GitHub

Server Auto-reload: nodemon

API Testing: Postman (หรือเครื่องมือ tương tự)

5. ข้อกำหนดคุณสมบัติของแต่ละ Service (Service Specifications)

**5.1 API Gateway (Port: 3000)**
    *   **วัตถุประสงค์:** เป็นจุดเข้าใช้งานเดียว (Single Entry Point) สำหรับ Frontend, จัดการ Routing ไปยัง Backend Services, จัดการ CORS
    *   **Key APIs (Forwarding):**
        *   `GET /products`, `GET /products/:id`: Forward ไปยัง Product Service
        *   `GET /banners`: Forward ไปยัง Product Service
        *   `POST /products`, `PUT /products/:id`, `DELETE /products/:id`: Forward ไปยัง Product Service (พร้อม Authorization Header)
        *   `POST /banners`, `PUT /banners/:id`, `DELETE /banners/:id`: Forward ไปยัง Product Service (พร้อม Authorization Header)
        *   `POST /register`, `POST /login`: Forward ไปยัง User Service
        *   `GET /users/:id/role`: Forward ไปยัง User Service (พร้อม Authorization Header)
        *   `GET /cart`, `POST /cart`, `PUT /cart/item/:itemId`, `DELETE /cart/item/:itemId`, `DELETE /cart`: Forward ไปยัง Cart Service (พร้อม Authorization Header)
        *   `POST /orders`: Forward ไปยัง Order Service (พร้อม Authorization Header)
        *   (Optional) `GET /orders`, `GET /orders/:id`: Forward ไปยัง Order Service (พร้อม Authorization Header)
    *   **Database:** ไม่มีการใช้ฐานข้อมูลโดยตรง

**5.2 Product Service (Port: 3001)**
    *   **วัตถุประสงค์:** จัดการข้อมูลสินค้าและแบนเนอร์ทั้งหมด
    *   **Key APIs:**
        *   `GET /products`: ดึงรายการสินค้าทั้งหมด
        *   `GET /products/:id`: ดึงรายละเอียดสินค้าเฉพาะชิ้น
        *   `GET /banners`: ดึงรายการแบนเนอร์ทั้งหมด (เรียงตามลำดับ)
        *   `POST /products` (Admin): เพิ่มสินค้าใหม่ (ต้องการ JWT Admin)
        *   `PUT /products/:id` (Admin): แก้ไขข้อมูลสินค้า (ต้องการ JWT Admin)
        *   `DELETE /products/:id` (Admin): ลบสินค้า (ต้องการ JWT Admin)
        *   `POST /banners` (Admin): เพิ่มแบนเนอร์ใหม่ (ต้องการ JWT Admin)
        *   `PUT /banners/:id` (Admin): แก้ไขข้อมูลแบนเนอร์ (ต้องการ JWT Admin)
        *   `DELETE /banners/:id` (Admin): ลบแบนเนอร์ (ต้องการ JWT Admin)
    *   **Database:** `products.db`
        *   ตาราง `products`: `product_id`, `name`, `description`, `price`, `image_url`
        *   ตาราง `banners`: `banner_id`, `image_url`, `alt_text`, `link_url`, `title`, `display_order`

**5.3 User Service (Port: 3002)**
    *   **วัตถุประสงค์:** จัดการข้อมูลผู้ใช้งาน, การสมัครสมาชิก, และการเข้าสู่ระบบ, การตรวจสอบ Role
    *   **Key APIs:**
        *   `POST /register`: สร้างบัญชีผู้ใช้ใหม่ (เข้ารหัสรหัสผ่านด้วย bcrypt)
        *   `POST /login`: ตรวจสอบข้อมูลและสร้าง JWT Token สำหรับผู้ใช้ที่ยืนยันตัวตนสำเร็จ (ส่งข้อมูล User รวมถึง Role กลับไป)
        *   `GET /users/:id/role` (Authenticated): ตรวจสอบ Role ของผู้ใช้งาน (ต้องการ JWT ที่ถูกต้อง และ ID ตรงกับใน Token)
    *   **Database:** `users.db`
        *   ตาราง `users`: `user_id`, `email` (UNIQUE), `password_hash`, `name`, `role` (DEFAULT 'customer')

**5.4 Cart Service (Port: 3003)**
    *   **วัตถุประสงค์:** จัดการข้อมูลตะกร้าสินค้าของผู้ใช้งานแต่ละคน
    *   **Key APIs (Authenticated - ต้องการ JWT):**
        *   `GET /cart`: ดึงรายการสินค้าในตะกร้าของผู้ใช้ปัจจุบัน
        *   `POST /cart`: เพิ่มสินค้าลงตะกร้า (หรือเพิ่มจำนวนถ้ามีอยู่แล้ว)
        *   `PUT /cart/item/:itemId`: อัปเดตจำนวนสินค้าเฉพาะรายการ
        *   `DELETE /cart/item/:itemId`: ลบสินค้าเฉพาะรายการออกจากตะกร้า
        *   `DELETE /cart`: ลบสินค้าทั้งหมดในตะกร้าของผู้ใช้ปัจจุบัน (ถูกเรียกโดย Order Service)
    *   **Database:** `cart.db`
        *   ตาราง `cart_items`: `cart_item_id`, `user_id`, `product_id`, `quantity`, `added_at` (UNIQUE on `user_id`, `product_id`)

**5.5 Order Service (Port: 3004)**
    *   **วัตถุประสงค์:** จัดการกระบวนการสั่งซื้อ, บันทึกประวัติการสั่งซื้อ, และ (จำลอง) การชำระเงิน
    *   **Key APIs (Authenticated - ต้องการ JWT):**
        *   `POST /orders`: สร้างคำสั่งซื้อใหม่ (Checkout Process)
            *   ดึงข้อมูลจาก Cart Service
            *   ดึงราคาล่าสุดจาก Product Service
            *   คำนวณยอดรวม
            *   บันทึกข้อมูลในตาราง `orders` และ `order_items` (เก็บราคา ณ ตอนสั่งซื้อ)
            *   เคลียร์ข้อมูลใน Cart Service
            *   ส่งข้อมูล Order ที่สร้างเสร็จกลับไป
        *   (Optional) `GET /orders`: ดึงประวัติการสั่งซื้อของผู้ใช้
        *   (Optional) `GET /orders/:id`: ดึงรายละเอียดคำสั่งซื้อเฉพาะรายการ
    *   **Database:** `orders.db`
        *   ตาราง `orders`: `order_id`, `user_id`, `order_date`, `total_amount`, `status`
        *   ตาราง `order_items`: `order_item_id`, `order_id`, `product_id`, `quantity`, `price_at_order`


6. ข้อกำหนดคุณสมบัติของ Frontend (Frontend Specifications)

**6.1 หน้าหลัก (`index.html`)**
    *   แสดงฟอร์มสำหรับเข้าสู่ระบบ (Login) หรือสมัครสมาชิก (Register)
    *   มีลิงก์/ปุ่มสำหรับสลับระหว่างสองฟอร์ม
    *   หากผู้ใช้ล็อกอินอยู่แล้ว จะแสดงข้อความต้อนรับและปุ่มไปยังหน้าสินค้า/แผงควบคุมแอดมิน
    *   เรียก API `POST /login` หรือ `POST /register` ผ่าน API Gateway
    *   เมื่อ Login สำเร็จ จะเก็บ JWT Token, User Role, User Name ไว้ใน `localStorage` และ Redirect ไปยังหน้าที่เหมาะสม (Products หรือ Admin)

**6.2 หน้าแสดงสินค้า (`products.html`)**
    *   แสดง Banner Slider แบบ Dynamic (ดึงข้อมูลจาก `GET /banners`)
    *   แสดงรายการสินค้าทั้งหมด (ดึงข้อมูลจาก `GET /products`) ในรูปแบบ Card ที่ Responsive
    *   แสดงข้อมูลพื้นฐานของ User ที่ล็อกอินอยู่ และปุ่ม Logout
    *   แสดงไอคอนตะกร้าพร้อมจำนวนสินค้า (ดึงข้อมูลจาก `GET /cart`)
    *   ปุ่ม "หยิบใส่ตะกร้า" ในแต่ละ Card สินค้า:
        *   หากยังไม่ Login จะแสดงข้อความแจ้งเตือนให้ Login ก่อน
        *   หาก Login แล้ว จะเรียก API `POST /cart` ผ่าน Gateway (พร้อมส่ง Token) และอัปเดตจำนวนที่ไอคอนตะกร้า

**6.3 หน้าตะกร้าสินค้า (`cart.html`)**
    *   ต้อง Login ก่อนเข้าใช้งาน (มีการ Redirect ถ้ายังไม่ Login)
    *   แสดงรายการสินค้าในตะกร้า (ดึงข้อมูลจาก `GET /cart` และ `GET /products/:id`)
    *   แสดงรูป, ชื่อ, ราคาต่อหน่วย, จำนวน, และราคารวมย่อยของแต่ละรายการ
    *   มีปุ่ม +/- สำหรับแก้ไขจำนวน (เรียก `PUT /cart/item/:itemId`)
    *   มีปุ่มสำหรับลบรายการสินค้า (เรียก `DELETE /cart/item/:itemId`)
    *   แสดงสรุปยอดรวม (จำนวนชิ้น, ราคารวมย่อย, ค่าส่ง(จำลอง), ยอดรวมสุทธิ)
    *   ปุ่ม "ดำเนินการสั่งซื้อ": เรียก API `POST /orders` ผ่าน Gateway (พร้อมส่ง Token)

**6.4 หน้าแผงควบคุมแอดมิน (`admin.html`)**
    *   ต้อง Login เป็น Admin ก่อนเข้าใช้งาน (มีการ Redirect ถ้าไม่ใช่ Admin)
    *   ใช้ Tabs เพื่อแบ่งส่วนการจัดการ (เช่น สินค้า, Banner)
    *   **ส่วนจัดการสินค้า:**
        *   แสดงรายการสินค้าในรูปแบบตาราง พร้อมข้อมูลสำคัญ
        *   ปุ่ม "เพิ่มสินค้าใหม่" -> เปิด Modal พร้อมฟอร์มสำหรับกรอกข้อมูลสินค้า (เรียก `POST /products`)
        *   ปุ่ม "แก้ไข" ในแต่ละแถว -> เปิด Modal เดิม พร้อมข้อมูลสินค้าเดิมสำหรับแก้ไข (เรียก `PUT /products/:id`)
        *   ปุ่ม "ลบ" ในแต่ละแถว -> แสดง SweetAlert ยืนยัน -> เรียก `DELETE /products/:id`
    *   **ส่วนจัดการ Banner:**
        *   แสดงรายการ Banner (อาจจะเป็น Card หรือ List)
        *   ปุ่ม "เพิ่ม Banner ใหม่" -> เปิด Modal พร้อมฟอร์ม (เรียก `POST /banners`)
        *   ปุ่ม "แก้ไข" -> เปิด Modal เดิม พร้อมข้อมูลเดิม (เรียก `PUT /banners/:id`)
        *   ปุ่ม "ลบ" -> แสดง SweetAlert ยืนยัน -> เรียก `DELETE /banners/:id`
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
IGNORE_WHEN_COPYING_END

7. คุณสมบัติหลัก (Key Features)

**7.1 สำหรับลูกค้า (Customer Features):**
    *   การเรียกดูรายการสินค้าและ Banner โปรโมชั่น
    *   การสมัครสมาชิกและเข้าสู่ระบบ
    *   การเพิ่มสินค้าลงในตะกร้าสินค้า
    *   การดูและจัดการรายการสินค้าในตะกร้า (แก้ไขจำนวน, ลบรายการ)
    *   การดำเนินการสั่งซื้อ (จำลองการชำระเงิน) และการเคลียร์ตะกร้าอัตโนมัติ

**7.2 สำหรับผู้ดูแลระบบ (Admin Features):**
    *   การเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ
    *   การจัดการสินค้า (เพิ่ม, ดู, แก้ไข, ลบ)
    *   การจัดการ Banner (เพิ่ม, ดู, แก้ไข, ลบ)
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
IGNORE_WHEN_COPYING_END

8. ข้อควรพิจารณาด้านความปลอดภัย (Security Considerations)

Backend:

ใช้ Prepared Statements (ผ่าน Library sqlite3) เพื่อป้องกัน SQL Injection

เข้ารหัสรหัสผ่านผู้ใช้ด้วย bcrypt ก่อนบันทึกลงฐานข้อมูล

ใช้ JWT สำหรับการยืนยันตัวตน (Authentication) และตรวจสอบสิทธิ์ (Authorization) ผ่าน Middleware ใน Service ที่ต้องการการป้องกัน

เปิดใช้งาน CORS ที่ API Gateway เพื่อควบคุมการเข้าถึงจาก Frontend Origin

Frontend:

ใช้ textContent หรือวิธีการ Escape ที่เหมาะสมเมื่อแสดงผลข้อมูลที่อาจมาจากผู้ใช้ เพื่อป้องกัน Cross-Site Scripting (XSS)

จัดเก็บ JWT Token ใน localStorage (พิจารณา sessionStorage หรือ HttpOnly Cookie หากต้องการความปลอดภัยสูงขึ้นใน Production)

9. การพัฒนาในอนาคต (Future Considerations)

การเชื่อมต่อกับระบบชำระเงินจริง (Payment Gateway Integration)

ระบบจัดการที่อยู่จัดส่ง (Shipping Address Management)

การคำนวณค่าจัดส่งตามเงื่อนไข

ระบบค้นหาสินค้า (Product Search Implementation)

การแบ่งหน้าข้อมูล (Pagination) สำหรับรายการสินค้าและรายการสั่งซื้อ

การจัดการสถานะคำสั่งซื้อที่ละเอียดขึ้น (Shipped, Delivered, Cancelled)

หน้าแสดงประวัติการสั่งซื้อสำหรับลูกค้า

หน้าแดชบอร์ดและรายงานสำหรับผู้ดูแลระบบ (ยอดขาย, สินค้าขายดี)

การปรับปรุง UI/UX เพิ่มเติม

การเขียน Unit Test และ Integration Test

การ Deploy ระบบไปยัง Cloud Environment (เช่น Docker, Kubernetes)

นี่คือภาพรวมสเปคของระบบที่เราสร้างกันมานะเพื่อน ถ้ามีส่วนไหนอยากปรับแก้ หรืออยากให้ลงรายละเอียดเพิ่ม บอกได้เลย! 👍
