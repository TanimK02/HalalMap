---
name: Pickup/delivery fees + item availability + restaurant extras
overview: Extend the earlier fees plan with per-item pickup/delivery availability (e.g. some items pickup-only) and a short list of other features restaurants often want.
todos: []
isProject: false
---

# Pickup/delivery fees + item availability + restaurant extras

Fees can be **either a flat amount or a percentage** of the order subtotal, with **platform defaults** and optional **per-restaurant overrides**. Below also covers **pickup-only / delivery-only menu items** and other restaurant-facing features.

---

## 0. Fees: amount or percentage, with defaults

**Goal:** Different fees for pickup vs delivery; each fee can be a **flat amount** (e.g. $2.99) or a **percentage** of subtotal (e.g. 10%). **Platform defaults** apply when a restaurant does not set its own; restaurants can **override** with their own flat or percent fee.

### Fee type and value

- **Flat:** fee = fixed amount (stored in cents, e.g. 299 = $2.99).
- **Percentage:** fee = subtotal × (percent / 100), e.g. 10 = 10%. Store as integer (10 for 10%). Round fee to cents for Stripe/Order.

For each of **pickup** and **delivery**, only one of flat or percent is used (enforced by validation).

### Platform defaults (env)

Use env vars so the platform can set defaults without DB changes:

- `DEFAULT_PICKUP_FEE_TYPE` = `flat` | `percent`
- `DEFAULT_PICKUP_FEE_VALUE` = number (cents if flat, e.g. 299; or percent if percent, e.g. 10)
- `DEFAULT_DELIVERY_FEE_TYPE` = `flat` | `percent`
- `DEFAULT_DELIVERY_FEE_VALUE` = number (same meaning)

If unset or invalid, treat as 0 (no fee). This gives defaults for both pickup and delivery, each either flat or percent.

### Per-restaurant overrides (schema)

On **Restaurant**, add optional override fields (null = use platform default):

- `pickupFeeType` String? = `'FLAT'` | `'PERCENT'`
- `pickupFeeValue` Int? = cents (if FLAT) or percent e.g. 10 (if PERCENT)
- `deliveryFeeType` String?
- `deliveryFeeValue` Int?

Validation: if `pickupFeeType` is set, `pickupFeeValue` must be set and non-negative; same for delivery. If type is null, value is ignored (use platform default).

**Effective fee logic:** For a given restaurant and delivery type (PICKUP or DELIVERY), if restaurant has type+value set, use those; else use `DEFAULT_*_FEE_TYPE` and `DEFAULT_*_FEE_VALUE`. Then compute fee in cents: if type is FLAT, feeCents = value; if PERCENT, feeCents = round(subtotalCents * value / 100).

### Order record

- **Order:** add `feeCents Int @default(0)` (the fee applied at order time, in cents). `totalPrice` = subtotal + fee (so total is what the customer pays).
- Store the **computed** fee only (always in cents on the order); no need to store type/percent on the order.

### API and clients

- **POST /orders:** Compute subtotal from items, then effective fee (restaurant override or platform default, flat or percent), then total. Persist `feeCents` and `totalPrice`; Stripe amount = total in cents.
- **GET /restaurants/:id:** Return **effective** fee description so the app can show “Pickup: $2.99” or “Delivery: 10%” without a separate config call. Options: (a) return `pickupFeeCents` and `deliveryFeeCents` as the **precomputed** fee for a $0 subtotal (only correct for flat fees), or (b) return fee **structure**: e.g. `pickupFee: { type: 'flat', valueCents: 299 }` or `{ type: 'percent', valuePercent: 10 }`, and same for delivery (using effective restaurant or default). Option (b) is correct for both flat and percent; client can then compute fee for current cart subtotal.
- **GET /restaurants/me/restaurant** and **PATCH /restaurants/me/restaurant:** Accept and return `pickupFeeType`, `pickupFeeValue`, `deliveryFeeType`, `deliveryFeeValue` (all optional). Dashboard can show “Using platform default” when null.

### Stripe and webhooks

- PaymentIntent amount = total (subtotal + fee) in cents. Metadata continues to include `totalPrice`; add `feeCents` so the webhook and from-payment-intent can persist `feeCents` on the created order.

---

## 1. Some items pickup-only or delivery-only

**Idea:** Restaurants can mark certain menu items as only available for pickup, or only for delivery (e.g. fragile/slow items delivery-only, or “today’s special” pickup-only).

### Schema (MenuItem)

Add to [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma) on `MenuItem`:

- `**availableForPickup Boolean @default(true)`**
- `**availableForDelivery Boolean @default(true)`**

So:

- Both true → item available for both (current behavior).
- Pickup only → `availableForPickup: true`, `availableForDelivery: false`.
- Delivery only → `availableForPickup: false`, `availableForDelivery: true`.
- Both false → effectively hidden for both (or you could treat as “unavailable” and rely on `isAvailable` for that; usually you’d keep at least one true).

### API

- **GET /restaurants/:id** (public menu): Already filters by `isAvailable: true`. Add a **query or context** for how the menu will be used:
  - Option A: **Query** e.g. `?fulfillment=PICKUP` or `?fulfillment=DELIVERY`. When present, filter items to those where `availableForPickup` (for PICKUP) or `availableForDelivery` (for DELIVERY) is true. So the list changes by fulfillment type.
  - Option B: **No filter** in GET; return both flags on each item. Mobile app filters when showing the menu (e.g. on RestaurantDetail, once user chooses “I’ll pick up” vs “I’ll get delivery”, show only items available for that type). Requires the app to have chosen fulfillment before browsing menu, or to show full menu and grey out / hide unavailable items.
  - **Recommendation:** Option B is simpler (one menu response; client already has deliveryType in cart). Return `availableForPickup` and `availableForDelivery` on each item; mobile hides or disables add-to-cart for items not available for the current fulfillment (e.g. when user has already chosen PICKUP vs DELIVERY on the restaurant screen, or default to “both” and filter when they open cart).
- **POST /orders**: When validating line items, after resolving each `menuItem`, check: if `deliveryType === 'PICKUP'` then require `menuItem.availableForPickup`, else require `menuItem.availableForDelivery`. Return 400 with a clear message if an item is not available for the chosen fulfillment.
- **Owner menu CRUD**: In [apps/api/src/routes/restaurants.ts](apps/api/src/routes/restaurants.ts), add `availableForPickup` and `availableForDelivery` to create/update item payloads (optional, default true).

### Mobile

- **Restaurant detail / menu**: When displaying items, if the app has a chosen fulfillment (e.g. from cart or a selector on the restaurant screen), only show “Add to cart” for items where the corresponding flag is true; optionally show a note like “Pickup only” or “Delivery only” on the item.
- **Cart**: If user switches from Delivery to Pickup (or vice versa), some items might become invalid. Options: (1) Revalidate on checkout and show an error (“X is not available for pickup”); (2) When switching delivery type, remove items that are no longer available and notify the user. (1) is simpler; (2) is smoother UX.

### Dashboard

- **Menu item form**: Add two checkboxes “Available for pickup” and “Available for delivery” (defaults both checked). Map to `availableForPickup` / `availableForDelivery` in API.

---

## 2. More suggestions restaurants often want

Short list you can prioritize later:


| Feature                                    | What it is                                                                                             | Complexity                                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Minimum order**                          | Min amount for order (e.g. $15 delivery minimum). Per restaurant; could differ for pickup vs delivery. | Low: add `minimumOrderCents` (or two fields) on Restaurant; enforce in POST /orders.                                                               |
| **Estimated ready time**                   | “Ready in 25–35 min” so customers know when to come or when to expect delivery.                        | Low: add `estimatedPrepMinutesMin` / `estimatedPrepMinutesMax` on Restaurant, or a single `estimatedPrepMinutes`; show on restaurant/order screen. |
| **Order notes / special instructions**     | Free-text “No onions”, “Leave at door”.                                                                | Low: add `customerNotes String?` on Order; optional field in checkout; show in owner order detail.                                                 |
| **Delivery radius / zones**                | Only deliver within X miles or to certain areas; sometimes different fee by zone.                      | Medium: need distance calc or zone config; validate address in POST /orders.                                                                       |
| **Different hours for pickup vs delivery** | e.g. delivery stops 1 hour before close.                                                               | Low: extend `businessHours` JSON to per-type hours, or add `deliveryHours`; validate at order time.                                                |
| **Tax**                                    | Sales tax (platform default rate or per-restaurant).                                                   | Low: add tax rate and store `taxCents` on Order; total = subtotal + fee + tax.                                                                     |
| **Item modifiers / options**               | “Add cheese +$0.50”, “Spice level: Mild/Medium/Hot”.                                                   | High: new models (ModifierGroup, ModifierOption), cart/order payload and validation.                                                               |
| **Scheduled orders**                       | “Order for pickup at 6pm tomorrow”.                                                                    | Medium: `scheduledFor DateTime?` on Order; availability windows; UI for time picker.                                                               |
| **Allergy / diet tags**                    | “Vegetarian”, “Gluten-free” (fits halal focus).                                                        | Low: add `tags String[]` or similar on MenuItem; filter/search in app.                                                                             |


Suggested **first adds** after fees and pickup/delivery-only items: **minimum order**, **order notes**, and **estimated ready time** — all small schema/API changes and high value.

---

## Summary of what’s in scope in this doc

1. **Fees:** Each fee (pickup / delivery) can be **flat amount** (cents) or **percentage** of subtotal. **Platform defaults** via env (`DEFAULT_PICKUP_FEE_TYPE`, `DEFAULT_PICKUP_FEE_VALUE`, same for delivery). **Per-restaurant overrides** via `pickupFeeType`/`pickupFeeValue`, `deliveryFeeType`/`deliveryFeeValue` (null = use default). Order stores `feeCents`; total = subtotal + fee everywhere (API, Stripe, mobile Cart, order detail).
2. **Per-item fulfillment:** `availableForPickup` / `availableForDelivery` on MenuItem; API validation on order; menu and cart behavior on mobile and dashboard.
3. **Extras:** Minimum order, order notes, estimated ready time, and the table above for later.

No code changes have been made; this is the plan. When you’re ready, implement in this order: (1) fees, (2) item availability flags, then (3) any of the “first adds” you want.