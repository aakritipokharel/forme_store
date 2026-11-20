# Initial Antigravity Prompt

You are the lead developer implementing this clothing store project. Read every document in this `docs` folder before writing code:

- `PRD.md`
- `ARCHITECTURE.md`
- `DESIGN.md`
- `RULES.md`
- `BUILD_PLAN.md`

## Your task

Build the clothing store website exactly according to these documents. The public site must look like a polished fashion/clothing brand storefront, with a real landing page. It must include customer authentication, product browsing, cart, COD checkout, customer order history, and a separate admin panel.

## Strict stack

Use only:
- MongoDB
- Express.js
- React
- Node.js
- Mongoose
- CSS
- bcryptjs
- jsonwebtoken
- dotenv
- React Router
- Fetch or Axios for requests to our own backend only

Do not use external APIs, hosted backend platforms, third-party authentication, payment services, CSS frameworks, external image services or additional features. Follow `RULES.md` if there is any uncertainty.

## Important behavior

- Public users can browse products.
- Customers can register/login, add items to cart, place COD orders and view their own orders.
- Admin can manage products with full CRUD, view all orders, update order statuses, view customers and view the basic activity log.
- Public signup must always create a customer role.
- Admin role must be created only through the seed script.
- Enforce authentication, role checks and ownership checks on the backend.
- Recalculate order totals and validate stock on the server.
- Preserve order item snapshots.

## Design direction

Follow `DESIGN.md`. Use an editorial fashion-store visual direction: warm neutral palette, elegant typography, spacious layout, strong clothing photography, polished product cards and responsive layouts. The landing page is a priority. Do not make the public website look like an admin dashboard. Use local assets/placeholders only; do not fetch images from an external API.

## How to work

1. First inspect the current repository. Do not overwrite existing work or assets.
2. Summarize the current structure and identify any conflicts with the documentation.
3. Propose the exact files you will create or modify for Phase 0.
4. Implement Phase 0 only.
5. Run the relevant checks and report results.
6. Wait for my approval before starting Phase 1.
7. Continue phase by phase using `BUILD_PLAN.md`.

Do not generate the whole project in one pass. Do not silently make assumptions that change scope. Ask a concise question if a decision is genuinely required.

At the end of each phase, report:
- Files created/modified.
- Features completed.
- Commands run and their results.
- Tests passed/failed.
- Known limitations.
- Exact next phase proposed.

Do not claim that anything works unless you have run and verified it.
