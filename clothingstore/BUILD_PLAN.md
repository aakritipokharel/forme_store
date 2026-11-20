# Implementation Plan and Test Checklist

Build in this order. Do not generate the entire application in one uncontrolled pass.

## Phase 0 — Repository inspection and setup
- Inspect repository, existing files and assets.
- Confirm whether this is a new project or an existing design/codebase.
- Create `client` and `server` structure if needed.
- Initialize React and Express projects.
- Add `.env.example`, `.gitignore` and root README.
- Confirm frontend and backend start independently.

**Verify:** React page loads; Express health route responds; MongoDB connection succeeds.

## Phase 1 — Backend foundation and database models
- Configure MongoDB/Mongoose connection.
- Create User, Product, Cart, Order and Activity models.
- Add centralized error handling and not-found handling.
- Add product seed data only if clearly labelled development seed data.
- Add a health endpoint.

**Verify:** server starts, database connects, models validate expected fields.

## Phase 2 — Authentication and roles
- Register customer.
- Login with bcryptjs comparison.
- JWT creation and verification.
- `/auth/me`.
- Auth middleware and admin middleware.
- Admin seed script.
- Frontend login/register forms and protected route handling.

**Verify:** password is hashed; login works; invalid token returns 401; customer cannot access admin endpoints; admin can.

## Phase 3 — Public storefront and product catalogue
- Build header, footer and landing page.
- Connect featured products to backend.
- Build shop listing and product detail.
- Build responsive product cards and empty/loading/error states.
- Add local image assets/placeholders.

**Verify:** products are database-backed; inactive products are not shown publicly; layout works on mobile and desktop.

## Phase 4 — Customer cart
- Implement cart read/add/update/remove/clear endpoints.
- Build cart context or service state.
- Connect product detail Add to Cart.
- Build cart page and quantity validation.

**Verify:** cart persists in database for the user; another user cannot read it; stock and size constraints are enforced.

## Phase 5 — Checkout and orders
- Build checkout form for recipient name, phone and address.
- Create order service that validates cart/products/stock.
- Recalculate prices and totals on server.
- Save order snapshots.
- Clear cart after successful order.
- Build order confirmation, My Orders and order detail pages.

**Verify:** customer can place COD order; totals cannot be manipulated from browser; insufficient stock prevents order; users cannot read another user's order.

## Phase 6 — Admin product CRUD
- Build admin layout/sidebar.
- Build dashboard summary cards.
- Build product list/create/edit/delete pages.
- Connect to admin-only product endpoints.
- Add delete confirmation and form validation.

**Verify:** admin can perform all product CRUD operations; customer cannot access admin APIs; storefront reflects product changes.

## Phase 7 — Admin orders, customers and activity
- Build all-orders list and order details.
- Add allowed order status update.
- Record order placement and status changes.
- Record product create/update/delete.
- Build customer list and activity feed.
- Connect dashboard recent orders/activity.

**Verify:** admin sees all orders; customer sees only own orders; status updates persist; activity records appear with correct actor and time.

## Phase 8 — Responsive polish and final verification
- Check mobile/tablet/desktop layouts.
- Check keyboard navigation and focus styles.
- Check form errors and empty states.
- Check browser console and backend logs.
- Run frontend production build.
- Test every API endpoint and role restriction.
- Update README with install/run/seed instructions.

## Manual test checklist

### Authentication
- [ ] Register with valid data.
- [ ] Duplicate email is rejected.
- [ ] Invalid email/password is rejected.
- [ ] Password is stored as a bcrypt hash.
- [ ] Public registration cannot create an admin.
- [ ] Logout clears frontend auth state.
- [ ] Expired/invalid JWT is rejected.

### Storefront
- [ ] Landing page loads.
- [ ] Product list loads from MongoDB.
- [ ] Product detail loads for valid ID.
- [ ] Invalid product ID shows a friendly not-found state.
- [ ] Inactive product is not publicly visible.
- [ ] Responsive layout has no horizontal overflow.

### Cart and order
- [ ] Add product and size to cart.
- [ ] Same product/size increments the correct line.
- [ ] Different sizes create distinct lines.
- [ ] Update quantity.
- [ ] Remove item.
- [ ] Quantity above stock is rejected.
- [ ] Checkout requires login.
- [ ] Server calculates total.
- [ ] Order snapshot remains stable if product changes.
- [ ] Cart clears after successful order.
- [ ] Customer cannot access another customer's order.

### Admin
- [ ] Admin dashboard counts are real.
- [ ] Admin can create product.
- [ ] Admin can read product list/details.
- [ ] Admin can update product.
- [ ] Admin can delete/deactivate product.
- [ ] Admin can view all orders.
- [ ] Admin can update only allowed statuses.
- [ ] Admin can view customers without password hashes.
- [ ] Activity feed records supported actions.
- [ ] Customer receives 403 for admin-only endpoints.

## Definition of done

All Must requirements in `PRD.md` pass, the test checklist is completed, and no prohibited technology or unapproved feature has been introduced.
