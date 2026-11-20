# Antigravity Implementation Rules
## Read this before creating or modifying code

These are strict project constraints. Follow them throughout implementation.

## 1. Mandatory technology stack

Allowed:
- MongoDB
- Express.js
- React
- Node.js
- Mongoose
- Plain CSS / CSS modules
- bcryptjs
- jsonwebtoken
- dotenv
- React Router
- Fetch or Axios for requests to our own backend only

Do not introduce:
- Next.js, Vue, Angular, Svelte or another frontend framework.
- Firebase, Supabase, Appwrite or another backend/database platform.
- Tailwind, Bootstrap, Material UI, Chakra or another styling framework.
- Passport, Clerk, Auth0 or social login.
- Stripe, PayPal or payment SDKs.
- Cloudinary or other image upload/hosting service.
- External APIs, third-party APIs, AI APIs or remote data services.
- Redux or another state library unless explicitly approved.
- Microservices, GraphQL, WebSockets or serverless functions.
- Unrequested libraries or infrastructure.

Use the smallest dependency set that satisfies the requirements. Ask before adding a dependency not listed here.

## 2. Functional scope

Implement only:
- Landing page.
- Product catalogue and product detail.
- Register, login and logout.
- bcryptjs password hashing.
- JWT authentication.
- Customer cart operations.
- COD order placement.
- Customer order history/details.
- Admin dashboard with basic counts and recent activity.
- Admin product CRUD.
- Admin order viewing/status update.
- Admin customer list.
- Basic activity log.

Do not add wishlist, reviews, ratings, coupons, online payments, chat, notifications, recommendation engines, analytics, advanced filters, delivery integrations or other extras.

## 3. Authentication rules

- Public registration always creates a `customer`.
- Never accept an admin role from the registration request.
- Create the initial admin through a protected seed script.
- Hash passwords with bcryptjs before saving.
- Compare passwords with bcryptjs during login.
- Sign and verify JWT using `JWT_SECRET` from `.env`.
- Never hardcode secrets.
- Never return password or password hash.
- Backend middleware is the source of truth for authorization.
- Frontend route guards are for user experience only.
- Admin endpoints must check both authentication and admin role.
- Customers must only access their own cart and orders.

## 4. CRUD rules

- Product CRUD must be implemented through Express routes and Mongoose.
- Validate required fields, types, numeric ranges and IDs on the server.
- Return clear errors for missing or invalid records.
- Ask for confirmation before deleting a product in the UI.
- Preserve historical order information using order item snapshots.
- Do not silently swallow errors.
- Do not use hardcoded mock data as a replacement for database-backed functionality.

## 5. Cart and order rules

- Cart belongs to the authenticated customer.
- Cart item identity includes product and selected size.
- Quantity must be a positive integer and cannot exceed stock.
- Checkout accepts delivery details, not trusted prices or totals.
- Backend fetches current products and recalculates totals.
- Backend validates product active state, selected size and stock.
- Store product name, image, unit price, size and quantity snapshots in orders.
- COD only; no payment gateway.
- Clear cart only after order creation succeeds.
- Handle stock conflicts and database errors safely.

## 6. Design rules

- Follow `DESIGN.md`.
- Build a fashion storefront, not a generic dashboard as the public landing page.
- Use responsive CSS and reusable components.
- Do not use a CSS framework.
- Do not add remote image APIs or external image services.
- Use local assets or simple placeholders.
- Do not invent brand claims, testimonials, product ratings, prices or contact details.
- Provide loading, empty, error, success, hover, focus and disabled states.

## 7. Code quality rules

- Use readable, beginner-friendly code.
- Use clear names for components, routes, controllers and models.
- Keep frontend and backend separate.
- Keep route definitions, controllers, models and middleware in separate files.
- Avoid giant components and giant controller files.
- Do not duplicate API request logic across components.
- Use one consistent API base URL from environment configuration.
- Use one consistent error response format.
- Remove unused imports and dead code.
- Do not rewrite unrelated files.
- Do not change the chosen stack or project structure without approval.
- Do not add features simply because they are common in e-commerce projects.

## 8. Working with an existing repository

Before changing anything:
1. Inspect the existing repository and identify its current stack and folder structure.
2. Read all project documentation.
3. Identify existing working code and assets.
4. Report conflicts between the repository and these requirements.
5. Preserve existing working code where possible.
6. Do not delete or replace files without explaining why and obtaining approval if the change is destructive.

If this is a new empty repository, create the structure specified in `ARCHITECTURE.md`.

## 9. Implementation workflow

- Implement one phase at a time from `BUILD_PLAN.md`.
- Before each phase, state which files will be created or changed.
- After each phase, summarize what works and what remains.
- Run the relevant checks/build commands.
- Fix errors before proceeding.
- Do not claim a feature is complete unless it has been tested.
- Do not implement later phases prematurely.
- If a requirement is ambiguous, ask one focused question instead of guessing.

## 10. Completion definition

A feature is complete only when:
- Backend endpoint works.
- Validation and authorization are implemented.
- Frontend is connected to the real endpoint.
- Loading, empty and error states are handled.
- The relevant manual test has passed.
- No unrelated functionality has been added.
