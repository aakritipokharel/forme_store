# Visual Design Specification
## Fashion-first clothing storefront

## 1. Design direction

Create a modern, editorial clothing-store aesthetic. It should look like a curated fashion brand: spacious, image-led, confident typography, restrained colors and clean product presentation.

Avoid the appearance of:
- A generic SaaS dashboard used as the storefront.
- A crowded marketplace with too many badges and colors.
- A default Bootstrap/Material UI template.
- Excessive gradients, glassmorphism, shadows or rounded cards everywhere.

The storefront should feel premium but approachable. The admin area can be more functional and restrained while sharing the same typography and color system.

## 2. Brand system

Use a temporary brand name such as **FORME** until the owner supplies a final name. Keep the brand name in one reusable configuration/component so it can be changed easily.

### Color palette
| Token | Suggested value | Usage |
|---|---|---|
| Ink | `#191919` | Main text, primary buttons |
| Warm white | `#FAF9F6` | Main page background |
| Soft sand | `#E9E4DC` | Secondary surfaces |
| Muted taupe | `#8A8178` | Secondary text |
| Clay | `#B56F52` | Small accent details |
| White | `#FFFFFF` | Cards and contrast surfaces |
| Border | `#E5E1DB` | Dividers and input borders |

Use CSS variables. Do not introduce extra accent colors without a reason.

### Typography
- Headings: an elegant editorial serif such as `Playfair Display` or `Cormorant Garamond`.
- Body/UI: a clean sans-serif such as `Inter` or system sans-serif.
- Use local/system fallbacks. If external font loading is disallowed by the strict no-external-service requirement, use system serif/sans fonts instead of fetching Google Fonts.
- Large hero heading, clear hierarchy, comfortable line-height.
- Avoid tiny text for important product details.

### Layout principles
- Generous whitespace.
- Consistent max-width container (approximately 1200–1320px).
- Strong alignment and consistent spacing scale.
- Large fashion imagery with consistent crop ratios.
- Subtle borders; minimal shadows.
- Buttons and links have visible hover/focus states.
- Use consistent spacing tokens rather than arbitrary values.

## 3. Storefront layout

### Header
- Slim announcement strip only if useful; do not invent shipping promises.
- Main header with wordmark on left, navigation centered or nearby, account/cart actions on right.
- Navigation: Home, Shop, optional category links.
- Mobile: compact menu button and accessible navigation panel.
- Sticky header is optional; avoid layout jumps.

### Landing page
1. **Hero**
   - Large editorial image or split layout.
   - Short headline, e.g. “Everyday pieces. Considered style.”
   - One sentence of supporting copy.
   - Primary CTA: “Shop the collection”.
   - Secondary CTA optional.
   - Do not put text over a busy image unless contrast is guaranteed.

2. **Featured collection**
   - Section heading and a small “View all” link.
   - Product cards in a responsive grid.
   - 4 columns on wide desktop, 3 on medium desktop, 2 on mobile.
   - Image ratio around 3:4.
   - Product name, price and optional category.
   - Avoid rating stars, fake sale prices and fabricated badges.

3. **Collection/category feature**
   - Two or three large image tiles only when real categories/products exist.
   - Each tile links to the shop/category view.

4. **Brand story**
   - Short text and supporting image or restrained color block.
   - Keep copy editable and do not invent sustainability or ethical claims.

5. **Footer**
   - Brand name, simple navigation, contact/store details only when provided.
   - No dead social links or fake contact information.

### Shop page
- Page title and short description.
- Optional simple category selector.
- Responsive product grid.
- Product cards should have consistent image dimensions and spacing.
- Clear empty state.

### Product detail page
- Two-column desktop layout: image area and product information.
- Stacked layout on mobile.
- Clear name, price, description, size selector, quantity selector and Add to Cart button.
- Size choices must come from the product record.
- Show stock/out-of-stock status without exposing internal inventory details unnecessarily.
- Avoid oversized decorative elements that push the purchase controls below the fold.

### Cart and checkout
- Simple, uncluttered layout.
- Cart rows show image, name, selected size, price, quantity and remove action.
- Order summary is visually distinct but not overdesigned.
- Checkout form uses clear labels and validation messages.
- COD is clearly stated.
- Confirmation page summarizes the placed order.

### Authentication pages
- Minimal branded form layout.
- Clear labels, password visibility toggle only if simple and accessible.
- Inline validation and server error feedback.
- Provide links between login and registration.

## 4. Admin design

Admin pages should prioritize clarity and task completion:
- Sidebar navigation on desktop; compact navigation on mobile.
- Top bar with page title and current admin account/logout.
- Dashboard summary cards with restrained styling.
- Tables with readable column spacing and clear empty/loading/error states.
- Product create/edit forms with labels and grouped fields.
- Confirm before destructive deletion.
- Status displayed as text with restrained neutral status pills.
- Avoid charts and analytics features; simple counts and lists are enough.

Admin navigation:
- Dashboard
- Products
- Orders
- Customers
- Activity
- Storefront
- Logout

## 5. Responsive behavior

Design and test at these approximate widths:
- Mobile: 360–430px.
- Tablet: 768px.
- Desktop: 1024–1440px.

Rules:
- No horizontal overflow.
- Product grid: 2 columns on mobile, 2–3 on tablet, 3–4 on desktop.
- Tables may become stacked cards or use a controlled horizontal scroll container on small screens.
- Navigation collapses cleanly on mobile.
- Buttons have comfortable touch targets (about 44px minimum height).
- Forms use full width on mobile.
- Images use `object-fit: cover` and consistent aspect ratios.

## 6. Interaction states

Every interactive element must have:
- Default state.
- Hover state where relevant.
- Keyboard focus-visible state.
- Disabled state.
- Loading state for async actions.
- Error and success feedback where relevant.

Do not use browser alerts for normal application feedback. Use a small reusable inline message/toast component if needed; no external toast library is required.

## 7. Reusable components

Suggested:
- `Header`
- `MobileNav`
- `Footer`
- `PageContainer`
- `SectionHeading`
- `ProductCard`
- `ProductGrid`
- `Price`
- `SizeSelector`
- `QuantitySelector`
- `FormField`
- `Button`
- `EmptyState`
- `LoadingState`
- `ErrorMessage`
- `AdminLayout`
- `AdminSidebar`
- `AdminTable`
- `StatusLabel`
- `ConfirmDialog`

Do not create abstractions for one-off elements without a clear reuse benefit.

## 8. Image policy

- Use local project assets where possible.
- Use image paths stored in product documents.
- Do not call image search APIs, image-generation APIs, remote stock-photo APIs or upload services from the app.
- The developer may manually add licensed images to `client/public/images`.
- Use sensible placeholders when no product image exists.
- Ensure the hero image and product images are visually consistent in tone and crop.

## 9. CSS conventions

- Use CSS variables for colors, spacing, typography and radii.
- Prefer class names that describe components and purpose.
- Avoid global selectors that unintentionally affect components.
- Avoid `!important` except for a documented exceptional case.
- Keep styles near their feature or in clearly named CSS files.
- Use a small, consistent radius scale; the design should not look like a dashboard template.
