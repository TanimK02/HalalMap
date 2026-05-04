import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { geocode, geocodeSearch } from './lib/geocode.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { restaurantsRouter } from './routes/restaurants.js';
import { ordersRouter } from './routes/orders.js';
import { adminRouter } from './routes/admin.js';
import { tagsRouter } from './routes/tags.js';
import { webhooksRouter } from './routes/webhooks.js';
import { getConfig } from './lib/config.js';

export const app = express();

const allowedOrigins = [
  process.env.CLIENT_ORIGIN_MOBILE,
  process.env.CLIENT_ORIGIN_RESTAURANT,
  process.env.CLIENT_ORIGIN_ADMIN,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:19006',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean);

function isAllowedHostedOrigin(origin: string): boolean {
  // Portfolio-friendly defaults for hosted frontends.
  // Keep explicit env-based allowlist as the main control, but allow common preview domains.
  return (
    origin.endsWith('.vercel.app') ||
    origin.endsWith('.netlify.app') ||
    origin.endsWith('.onrender.com')
  );
}

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin) ||
        isAllowedHostedOrigin(origin)
      ) {
        return cb(null, true);
      }
      cb(null, false);
    },
    credentials: true,
  })
);
// Stripe webhook needs raw body for signature verification (must be before express.json())
app.use('/webhooks', express.raw({ type: 'application/json' }), webhooksRouter);
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests' },
});
app.use(limiter);

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/tags', tagsRouter);
app.use('/restaurants', restaurantsRouter);
app.use('/orders', ordersRouter);
app.use('/admin', adminRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/config', (_req, res) => res.json(getConfig()));

app.get('/geocode', async (req, res) => {
  const address = req.query.address as string | undefined;
  if (!address?.trim()) return res.status(400).json({ error: 'address query required' });
  const limitParam = req.query.limit as string | undefined;
  const parsed = limitParam != null ? parseInt(limitParam, 10) : 1;
  const limit = Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
  if (limit > 1) {
    const suggestions = await geocodeSearch(address.trim(), limit);
    return res.json(suggestions);
  }
  const coords = await geocode(address.trim());
  if (!coords) return res.status(404).json({ error: 'Address not found' });
  return res.json(coords);
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
