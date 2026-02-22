---
name: ""
overview: ""
todos: []
isProject: false
---

# Cart: Add address (with shared form) + pickup/delivery per order

## Your choices

- **Add address in cart** even when the user already has addresses (after tapping “Change address”, show list + “+ Add new address”).
- **Shared AddressForm component** used by both Profile and Cart to avoid duplication.

## Pickup vs delivery per order — already supported

Yes. The app already supports different fulfillment per order:

- **Cart is single-restaurant**: One cart holds items from one restaurant ([CartContext.tsx](apps/mobile/src/context/CartContext.tsx)). Adding items from another restaurant replaces the cart.
- **Each checkout is one order** with its own `deliveryType` and `deliveryAddressId` ([orders.ts](apps/api/src/routes/orders.ts)). So:
  - Order from restaurant A: you can choose **Pickup** (pick up at A).
  - Order from restaurant B: you can choose **Delivery** and pick an address.
- The API validates that the restaurant supports the chosen type (`offersPickup` / `offersDelivery`). No backend or cart-model change needed for “different addresses for different restaurant orders” — it’s already per order.

---

## Implementation plan

### 1. Shared AddressForm component

- **New file**: [apps/mobile/src/components/AddressForm.tsx](apps/mobile/src/components/AddressForm.tsx)
- **Props**: `onSaved(address)`, `onCancel()`, optional `submitLabel` (e.g. "Save" / "Use this address").
- **Content**: Same fields as current Profile form — label (optional), street, city, state (optional), postal code, "Set as default" — plus Cancel and Submit. Validation: street, city, postal code required. On submit: `POST /users/addresses` with existing API shape; on success call `onSaved(createdAddress)`; on error show Alert.
- **Styling**: Reuse or mirror Profile form styles (inputs, checkbox, buttons) so it looks consistent.

### 2. Profile screen

- **File**: [apps/mobile/src/screens/Profile.tsx](apps/mobile/src/screens/Profile.tsx)
- Replace the inline address form block with `<AddressForm onSaved={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />` when `showForm` is true. Remove local form state and `handleAddAddress`; keep `load()` and the "Saved addresses" list + "+ Add address" toggle.

### 3. Cart screen — delivery address UX

- **File**: [apps/mobile/src/screens/Cart.tsx](apps/mobile/src/screens/Cart.tsx)
- **When Delivery is selected and user is logged in**, the Delivery address section has three mutually exclusive states (only one visible at a time):
  1. **Address form** — when `showAddAddressForm` is true (any number of addresses).
  2. **Collapsed (has addresses)** — selected address + “Change address”; when `addresses.length > 0` and `showAddressList` is false and form is hidden.
  3. **Expanded (has addresses)** — full list + “+ Add new address”; when `addresses.length > 0` and `showAddressList` is true.
- **A. No addresses**  
  - Show **“Add delivery address”** (single button).  
  - Tap → set `showAddAddressForm = true`, show `<AddressForm>`. On `onSaved(addr)`: append to `addresses`, set `deliveryAddressId` to `addr.id`, set `showAddAddressForm = false`. User then sees the collapsed view (new address + “Change address”) per B.
- **B. User has addresses (default pre-selected)**  
  - **Collapsed**: Show only the **selected address** (one row) and **“Change address”**.  
  - Tap **“Change address”** → set `showAddressList = true`: show **full list** (tappable to select) and **“+ Add new address”**. Include a **“Done”** (or “Back”) control to set `showAddressList = false` and collapse without changing selection.  
  - Tapping an address in the list sets `deliveryAddressId` and sets `showAddressList = false` (collapse).  
  - Tap **“+ Add new address”** → set `showAddAddressForm = true` (form replaces list). On save: append address, set `deliveryAddressId`, set `showAddAddressForm = false` and `showAddressList = false`, show collapsed view with new address.
- **State**:  
  - `showAddAddressForm`: when true, show `AddressForm` (overrides collapsed/expanded).  
  - `showAddressList`: when true and not showing form, show full list + “+ Add new address”; when false, show selected address + “Change address”.
- **Reset when leaving Delivery**: When `deliveryType` is not `'DELIVERY'` or `token` is falsy, set `showAddressList = false` and `showAddAddressForm = false` (e.g. in the same effect that clears `deliveryAddressId`) so toggling back to Delivery doesn’t show a stale expanded/form state.
- **Refetch after add**: Append the returned address from `onSaved` to local state; no extra refetch.

### 4. Implementation order

1. **Shared type** — Add `Address` type (e.g. in `types/address.ts`) including `state` (Cart’s current inline type omits it; API returns it).
2. **AddressForm** — New component; used by Profile and Cart.
3. **Profile** — Swap inline form for `AddressForm`; remove local form state and `handleAddAddress`.
4. **Cart** — Add `showAddAddressForm`, `showAddressList`; implement no-address vs collapsed vs expanded UI and reset behavior.

### 5. No API or schema changes

- Continue using `GET /users/addresses` and `POST /users/addresses`. No backend changes.

---

## Implementation details (from earlier plan)

- **AddressForm loading state**: Form should own `saving` state; disable Submit and show "Saving..." (or spinner) while `POST` is in flight so users don’t double-tap.
- **Submit button label**: Use optional `submitLabel` prop — Profile: "Save"; Cart: "Use this address" or "Save and use" so intent is clear in checkout.
- **Shared Address type**: Define a single `Address` type (e.g. in `apps/mobile/src/types/address.ts` or exported from the form) with `id`, `label`, `street`, `city`, `state`, `postalCode`, `isDefault` so Profile and Cart share the same shape and don’t drift.
- **Cart “no addresses”**: Show “Add delivery address” by default; tap → show form. (No “Change address” — that appears only when there is at least one address.)

---

## Decided: guest (not signed in) + Delivery

- **No** special message for guests. When Delivery is selected and the user isn’t signed in, keep current behavior (no explicit “Sign in to add a delivery address”); same empty/no-address state as today.

---

## Summary


| Item                      | Action                                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Pickup/delivery per order | No change — already per order; order A = pickup at A, order B = delivery to chosen address.                                                   |
| Shared form               | Add `AddressForm.tsx`; use in Profile and Cart.                                                                                               |
| Profile                   | Use `AddressForm` when adding address; remove duplicated form code.                                                                           |
| Cart — no addresses       | Show “Add delivery address” by default; tap → show form.                                                                                      |
| Cart — has addresses      | Default: show selected address + “Change address”. Tap “Change address” → show full list + “+ Add new address”; select or add, then collapse. |


