# Technical Architecture
## MERN Clothing Store

## 1. Architecture overview

Use a simple client-server architecture:

`React browser app → Express REST API → Mongoose models → MongoDB`

The React app must not connect directly to MongoDB. All data operations go through the Express backend.

### Frontend
- React with functional components and hooks.
- React Router for page routing.
- Plain CSS or CSS modules.
- Fetch or Axios for calls to the application's own backend. Choose one and use it consistently.
- A small authentication context for current user/token state.
- A cart context or straightforward cart state that syncs with backend endpoints.

### Backend
- Node.js and Express.
- Mongoose for MongoDB models.
- bcryptjs for password hashing.
- jsonwebtoken for JWT creation and verification.
- dotenv for environment configuration.
- cors configured for the local frontend origin.
- Express built-in JSON parsing.
- Optional small validation library is not necessary; validate request bodies explicitly or use a lightweight schema validator only with approval.

### Database
- MongoDB.
- Mongoose schemas and indexes.
- No external database service requirement beyond a MongoDB connection. Local MongoDB or a MongoDB instance chosen by the developer is acceptable.

## 2. Suggested repository structure

```text
clothing-store/
├── client/
│   ├── public/
│   │   └── images/
│   └── src/
│       ├── assets/
│       ├── components/
│       │   ├── common/
│       │   ├── layout/
│       │   ├── products/
│       │   ├── cart/
│       │   └── admin/
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   └── CartContext.jsx
│       ├── pages/
│       │   ├── public/
│       │   ├── auth/
│       │   ├── customer/
│       │   └── admin/
│       ├── routes/
│       ├── services/
│       │   └── api.js
│       ├── styles/
│       ├── utils/
│       ├── App.jsx
│       └── main.jsx
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── controllers/
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   └── errorMiddleware.js
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── scripts/
│   │   └── createAdmin.js
│   └── .env.example
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DESIGN.md
│   ├── RULES.md
│   ├── BUILD_PLAN.md
│   └── ANTIGRAVITY_PROMPT.md
└── README.md
```

## 3. Data model

### User
```js
{
  name: String,              // required
  email: String,             // required, unique, normalized lowercase
  password: String,          // bcrypt hash, select: false
  phone: String,             // optional
  role: "customer" | "admin",// default customer
  createdAt: Date,
  updatedAt: Date
}
```
Never accept `role` from public registration input. Always assign `customer` on signup. Exclude password from all response objects.

### Product
```js
{
  name: String,              // required
  description: String,       // required
  price: Number,             // required, >= 0
  category: String,          // required
  image: String,             // required URL or local public path
  sizes: [String],           // e.g. ["XS", "S", "M", "L", "XL"]
  stock: Number,             // integer >= 0
  featured: Boolean,         // default false
  active: Boolean,           // default true
  createdAt: Date,
  updatedAt: Date
}
```
Keep image handling simple: use a local static image path or a manually supplied image URL. Do not add an image-hosting API or upload service. Validate image paths/URLs and display a fallback when unavailable.

### Cart
One cart per user.
```js
{
  user: ObjectId,            // required, unique
  items: [{
    product: ObjectId,
    size: String,
    quantity: Number         // positive integer
  }],
  createdAt: Date,
  updatedAt: Date
}
```
Do not store trusted prices or totals in the cart. Populate product data when reading; recalculate prices from Product during checkout.

### Order
```js
{
  user: ObjectId,            // customer
  items: [{
    product: ObjectId,      // reference may remain after product deletion
    productName: String,    // snapshot
    image: String,          // snapshot
    size: String,
    unitPrice: Number,      // snapshot at purchase
    quantity: Number
  }],
  subtotal: Number,
  total: Number,
  delivery: {
    recipientName: String,
    phone: String,
    address: String
  },
  paymentMethod: "COD",
  status: "Pending" | "Confirmed" | "Processing" |
          "Shipped" | "Delivered" | "Cancelled",
  createdAt: Date,
  updatedAt: Date
}
```
Order records must remain readable if a product is later edited or deleted. The snapshot fields provide historical display data.

### Activity
```js
{
  actor: ObjectId,           // user/admin who performed the action
  actorName: String,         // snapshot for readable history
  action: String,            // e.g. ORDER_PLACED, ORDER_STATUS_UPDATED
  targetType: String,        // "Order" | "Product"
  targetId: ObjectId,
  description: String,
  createdAt: Date
}
```
Do not log passwords, JWTs, full payment details or other secrets. Keep activity records append-only through the application.

## 4. API design

Base URL in development: `http://localhost:5000/api`

Use JSON request/response bodies. Use consistent response structure:
```json
{ "success": true, "message": "Optional message", "data": {} }
```
Errors:
```json
{ "success": false, "message": "Human-readable error" }
```

### Authentication
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Create customer account |
| POST | `/auth/login` | Public | Verify credentials and issue JWT |
| GET | `/auth/me` | Logged in | Get current user's safe profile |

JWT should contain a user ID and role only (plus standard issued/expiry claims). Use a secret from environment variables and a reasonable expiry, e.g. 1 day. Do not put passwords or personal details in the token.

### Products
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/products` | Public | List active products |
| GET | `/products/featured` | Public | List featured active products |
| GET | `/products/:id` | Public | Product detail |
| POST | `/products` | Admin | Create product |
| PUT | `/products/:id` | Admin | Update product |
| DELETE | `/products/:id` | Admin | Delete product |

For deletion, use actual deletion only if it does not break order history. Because orders store snapshots, hard delete is acceptable; alternatively set `active=false` for safer catalogue removal. Choose one behavior and document it. Prefer deactivation for products referenced by existing orders.

### Cart
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/cart` | Customer | Get current user's cart |
| POST | `/cart/items` | Customer | Add item or increase matching item |
| PUT | `/cart/items/:itemId` | Customer | Update quantity/size if supported |
| DELETE | `/cart/items/:itemId` | Customer | Remove item |
| DELETE | `/cart` | Customer | Clear cart |

Cart item identity should account for both product and size. Reject invalid product IDs, inactive products, unavailable sizes and quantities exceeding stock.

### Orders
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/orders` | Customer | Create order from cart |
| GET | `/orders/my` | Customer | List current user's orders |
| GET | `/orders/my/:id` | Customer | Get own order |
| GET | `/orders` | Admin | List all orders |
| GET | `/orders/:id` | Admin | Get any order |
| PATCH | `/orders/:id/status` | Admin | Update order status |

The checkout request should contain delivery details only (and optionally payment method fixed to COD). It must not contain authoritative prices, subtotal or total. The server reads the cart, fetches current products, validates stock, calculates totals and creates the order.

### Admin users, dashboard and activity
| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/admin/dashboard` | Admin | Summary counts and recent orders |
| GET | `/admin/users` | Admin | List customers, safe fields only |
| GET | `/admin/activity` | Admin | Read recent activity |

Do not implement admin user creation through a public endpoint. Use a seed script.

## 5. Authentication and authorization flow

1. User submits email and password.
2. Backend normalizes email and finds the user.
3. Backend compares submitted password with stored bcrypt hash using `bcrypt.compare`.
4. If valid, backend signs JWT using `JWT_SECRET`.
5. Frontend stores token using the simplest consistent approach. For a beginner project, a token in memory/localStorage is straightforward, but localStorage is exposed to JavaScript and therefore to XSS. If using localStorage, explain this tradeoff and avoid unsafe HTML rendering. A more secure production approach is an HttpOnly, Secure, SameSite cookie with CSRF protections.
6. Frontend sends `Authorization: Bearer <token>` on protected API requests.
7. `authMiddleware` verifies token and loads/attaches the authenticated user.
8. `adminMiddleware` checks `req.user.role === "admin"`.

Frontend route guards improve navigation but are not security boundaries. Every protected backend route must enforce authorization.

## 6. Backend request lifecycle

`Request → route → authentication/role middleware → controller → model/service → MongoDB → JSON response`

- Keep route files focused on endpoint definitions.
- Controllers validate request data and coordinate operations.
- Put checkout/order creation logic in a service because it involves multiple database changes.
- Centralize error handling.
- Use async error handling consistently.
- Return correct HTTP codes: 200, 201, 400, 401, 403, 404, 409 and 500 as appropriate.

## 7. Security baseline

- Hash passwords with bcryptjs using a suitable work factor (e.g. 10–12).
- Never store plaintext passwords.
- Never return password hashes.
- Never allow public signup to set admin role.
- Validate ObjectIds, numeric values, enums and required fields.
- Enforce ownership checks for cart and customer order endpoints.
- Recalculate totals and verify stock on the backend.
- Keep JWT secret and MongoDB URI in `.env`.
- Configure CORS to the known frontend origin in development.
- Do not log credentials, tokens or passwords.
- Use generic login failure messages.
- Add basic rate limiting only if explicitly approved; do not introduce a broad security framework without need.
- Use HTTPS in deployment.

## 8. Environment variables

`server/.env.example`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/clothing_store
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173
```
Never commit the real `.env`.

## 9. Development scripts

Backend:
- `npm run dev` — start server with a development watcher.
- `npm start` — start server normally.
- `npm run seed:admin` — create the first admin from environment-provided credentials, refusing to overwrite an existing account.

Frontend:
- `npm run dev` — start React development server.
- `npm run build` — production build.

Use separate package files in `client` and `server`, unless a root workspace is explicitly agreed.

## 10. Deployment note

Deployment is not part of the required build. If deployed later, the frontend and backend must use configured origins, secrets must be set in the host environment, and MongoDB must be reachable securely. Do not hardcode localhost URLs into production code; use a frontend environment variable for the backend base URL.
