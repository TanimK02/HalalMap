import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { restaurantsRouter } from './routes/restaurants.js';
import { ordersRouter } from './routes/orders.js';
import { adminRouter } from './routes/admin.js';

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

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests' },
});
app.use(limiter);

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/restaurants', restaurantsRouter);
app.use('/orders', ordersRouter);
app.use('/admin', adminRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
