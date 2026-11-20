# Product Requirements Document (PRD)
## Project: Clothing Store E-commerce Website

**Version:** 1.0  
**Product type:** Responsive clothing storefront with customer and administrator areas  
**Primary goal:** Allow customers to browse clothing, add products to a cart, place orders, and view their own orders. Allow an administrator to manage products and review customer/order activity.

---

## 1. Product vision

Build a visually polished, easy-to-use clothing store website. The public landing page should feel like a real fashion brand rather than a generic admin template. Shopping functionality should remain simple and understandable.

The first release is a basic e-commerce application, not a full commercial commerce platform.

## 2. Goals

1. Present the clothing brand through a landing page.
2. Let visitors browse a product catalogue and view product details.
3. Let users register, log in and log out.
4. Let authenticated users manage a cart and place orders.
5. Let users view their own order history and order details.
6. Let admins create, read, update and delete products.
7. Let admins view users, orders and basic store activity.
8. Enforce role-based access on the backend.

## 3. Out of scope

Do not implement:
- Online payment gateways, wallets or payment processing.
- External APIs, third-party authentication or social login.
- Email/SMS notifications.
- Shipping-provider integrations or live tracking.
- Coupons, discounts, loyalty points or gift cards.
- Product reviews, ratings, wishlists or recommendations.
- AI/chatbots, analytics integrations or tracking pixels.
- Real-time sockets or live notifications.
- Multi-vendor functionality.
- Complex inventory forecasting.
- Microservices or a separate mobile application.

Orders use a simple **Cash on Delivery (COD)** payment method. COD is a selected order method, not an online payment integration. If the owner prefers not to include payment method selection, store `paymentMethod: "COD"` as the default.

## 4. User roles

### 4.1 Guest
- View the landing page.
- Browse the product catalogue.
- View product details.
- Register or log in.
- Must log in before placing an order.

### 4.2 Customer
- All guest capabilities.
- Add products to cart.
- Change cart quantities and remove cart items.
- Place an order with delivery/contact details.
- View their own orders and order details.
- View their own account profile.
- Log out.

### 4.3 Admin
- Access the admin dashboard.
- View summary counts for products, users and orders.
- View all orders and their details.
- Update an order's status.
- View registered customers.
- Create, view, edit and delete products.
- View basic activity records such as order placement and order status changes.
- Log out.

Admin access must be assigned securely. Do not provide a public admin registration page or allow a user to choose the `admin` role during signup. Create the first admin through a documented seed script or a controlled manual database operation.

## 5. Core pages and requirements

### Public storefront
1. **Landing page (`/`)**
   - Header with brand logo/name, navigation, shop link, login/account link and cart link.
   - Hero area with fashion-focused headline, supporting text, primary Shop Now action and a large clothing/lifestyle image.
   - Featured/new-arrival product section populated from the database.
   - Category or collection tiles only if categories exist in the database.
   - Brand/story or short value proposition section.
   - Footer with navigation and basic store information.
   - No fake claims, fake testimonials or fabricated ratings.

2. **Shop (`/shop`)**
   - Product grid.
   - Product image, name, price and category.
   - Basic category filter if category data is available.
   - Empty state when no products exist.
   - No advanced search or complex filtering required.

3. **Product details (`/products/:id`)**
   - Product image(s) or primary image.
   - Name, price, description, category, available sizes and stock quantity/status.
   - Quantity selector bounded by available stock.
   - Add to Cart action.
   - Clear unavailable/out-of-stock state.

4. **Authentication**
   - Register (`/register`): name, email, password and optional phone.
   - Login (`/login`): email and password.
   - Clear validation and error messages.
   - Password must never be returned by the API.

### Customer area
5. **Cart (`/cart`)**
   - Product, selected size, unit price, quantity and line total.
   - Update quantity, remove item and show subtotal.
   - Prevent quantity above available stock.
   - Empty-cart state.
   - Cart contents must be associated with the logged-in user. A guest cart is not required.

6. **Checkout (`/checkout`)**
   - Require authentication.
   - Collect recipient name, phone and delivery address.
   - Show order summary and total.
   - COD only.
   - Confirm order action.
   - Validate stock again on the server before creating the order.
   - On success, clear the user's cart and show an order confirmation.

7. **My Orders (`/my-orders`)**
   - List only the authenticated user's orders.
   - Show order number/ID, date, total and status.
   - Link to order details.

8. **Order details (`/my-orders/:id`)**
   - Items, quantities, selected sizes, prices at purchase time, delivery details, total, payment method and status.
   - Customer can only access their own order.

9. **Account (`/account`)**
   - Show basic name, email and phone.
   - Allow editing name and phone only if implemented within the basic scope.
   - Email changes and password reset flows are not required.

### Admin area
10. **Admin dashboard (`/admin`)**
    - Summary cards: total products, total customers, total orders and pending orders.
    - Recent orders table/list.
    - Basic recent activity list.
    - Values must come from backend data, not hardcoded placeholders.

11. **Product management (`/admin/products`)**
    - Read product list.
    - Create product.
    - Edit product.
    - Delete product after confirmation.
    - Fields: name, description, price, category, image URL/path, available sizes, stock quantity, featured flag and active flag.
    - Validate fields and show success/error states.

12. **Order management (`/admin/orders`)**
    - Read all orders.
    - View order details and customer/delivery information.
    - Update status: `Pending`, `Confirmed`, `Processing`, `Shipped`, `Delivered`, `Cancelled`.
    - Do not allow arbitrary status strings.
    - Record status changes in activity history.

13. **Customer management (`/admin/users`)**
    - Read registered customer list and basic account information.
    - Admin may view user details.
    - Do not expose password hashes.
    - User deletion/suspension is not required for version 1.

14. **Activity (`/admin/activity`)**
    - Read a simple chronological activity feed.
    - Minimum events: order placed, order status changed, product created, product updated and product deleted.
    - Each event stores actor, action, target type/ID, short description and timestamp.
    - This is an audit list, not a real-time notification system.

## 6. Main user journeys

### Guest to customer
1. Visitor opens landing page.
2. Visitor browses shop and product details.
3. Visitor registers or logs in.
4. Customer adds a product and size to cart.
5. Customer opens cart and adjusts quantities.
6. Customer proceeds to checkout and submits delivery details.
7. Backend validates stock and creates order.
8. Customer sees confirmation and can view the order in My Orders.

### Admin product management
1. Admin logs in using an admin account.
2. Admin opens dashboard.
3. Admin opens product management.
4. Admin creates, edits or deletes a product.
5. Storefront reflects the latest active product data.

### Admin order review
1. Customer places an order.
2. Admin sees it in the order list and dashboard.
3. Admin opens order details.
4. Admin updates order status.
5. The change is recorded in the activity feed.
6. Customer sees the updated status in My Orders.

## 7. Business rules

- Prices are stored as numbers in one configured currency. Choose the store currency before implementation; use NPR by default if the store targets Nepal.
- Store prices as numeric values, not formatted strings.
- An order stores a snapshot of product name, image, selected size, unit price and quantity. Later product edits must not change historical order contents.
- Cart items reference products, but checkout must use current server-side product prices.
- The backend calculates all totals. Never trust totals sent by the browser.
- The backend validates product existence, active status, selected size and stock before accepting an order.
- Stock is reduced only when an order is successfully created, using an atomic/transaction-safe approach where supported by the MongoDB deployment. If transactions are unavailable, implement careful conditional stock updates and rollback/error handling.
- Cancelled orders do not automatically restock in version 1 unless a clear, tested restock rule is implemented. Document the chosen behavior.
- Customers can read only their own cart and orders.
- Admin routes require both a valid JWT and the admin role.
- Inactive products are hidden from the public storefront.

## 8. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Public landing page and navigation | Must |
| FR-02 | Product catalogue and product detail | Must |
| FR-03 | Customer registration/login/logout | Must |
| FR-04 | Password hashing using bcryptjs | Must |
| FR-05 | JWT authentication | Must |
| FR-06 | Role-based admin protection | Must |
| FR-07 | Customer cart CRUD | Must |
| FR-08 | Place order with COD | Must |
| FR-09 | Customer order history/details | Must |
| FR-10 | Admin product CRUD | Must |
| FR-11 | Admin view/update orders | Must |
| FR-12 | Admin view customer list | Must |
| FR-13 | Basic activity log | Must |
| FR-14 | Responsive design | Must |
| FR-15 | Basic form validation and error states | Must |

## 9. Non-functional requirements

- Responsive at mobile, tablet and desktop widths.
- Accessible labels, keyboard focus states and sensible color contrast.
- Passwords hashed with bcryptjs and never logged or returned.
- Validate and sanitize user input on the server.
- Use environment variables for secrets and database connection strings.
- Use consistent HTTP status codes and JSON response shapes.
- Show loading, empty, success and error states.
- Keep components and backend modules organized and maintainable.
- Do not commit `.env` files or credentials.

## 10. Acceptance criteria

The project is acceptable when:
- A visitor can load the landing page and browse active products.
- A customer can register and log in.
- Stored passwords are bcrypt hashes.
- A customer can add/remove/update cart items.
- A customer can place a COD order and see it in their order history.
- The backend recalculates totals and validates stock.
- A customer cannot access another customer's cart or orders by changing an ID.
- An admin can create, read, update and delete products.
- A non-admin cannot access admin endpoints even if they manually enter an admin URL.
- An admin can view all orders, update allowed statuses and see activity records.
- The UI works at mobile and desktop sizes.
- No external API or unapproved service is used.
