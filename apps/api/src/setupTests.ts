// Set JWT_SECRET before any route/middleware code loads (avoids console.warn in auth)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'a'.repeat(32);
// Unset Stripe so order checkout tests hit the no-Stripe branch (order created directly)
if (process.env.STRIPE_SECRET_KEY === undefined) {
  process.env.STRIPE_SECRET_KEY = '';
}
