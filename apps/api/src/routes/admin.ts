import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.js';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireRole('ADMIN'));

// List restaurants (pending first)
adminRouter.get(
  '/restaurants',
  [query('approved').optional().isIn(['true', 'false']), query('pending').optional().isIn(['true'])],
  async (req: Request, res: Response) => {
    const approved = req.query.approved;
    const pending = req.query.pending === 'true';
    const where: { approved?: boolean } = {};
    if (approved !== undefined) where.approved = approved === 'true';
    if (pending) where.approved = false;

    const restaurants = await prisma.restaurant.findMany({
      where,
      include: { owner: { select: { id: true, name: true, email: true } } },
      orderBy: [{ approved: 'asc' }, { createdAt: 'desc' }],
    });
    return res.json(restaurants);
  }
);

adminRouter.get('/restaurants/:id', param('id').isString(), async (req: Request, res: Response) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: req.params.id as string },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      menuCategories: { include: { items: true } },
    },
  });
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
  return res.json(restaurant);
});

adminRouter.patch(
  '/restaurants/:id/approve',
  param('id').isString(),
  body('approved').isBoolean(),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const restaurant = await prisma.restaurant.update({
      where: { id: req.params.id as string },
      data: { approved: req.body.approved },
      include: { owner: { select: { id: true, name: true, email: true } } },
    });
    return res.json(restaurant);
  }
);

// List users
adminRouter.get('/users', async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(users);
});

// List all orders
adminRouter.get(
  '/orders',
  [
    query('status').optional().isIn(['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']),
    query('restaurantId').optional().trim(),
  ],
  async (req: Request, res: Response) => {
    const where: { status?: import('@prisma/client').OrderStatus; restaurantId?: string } = {};
    if (req.query.status) where.status = req.query.status as import('@prisma/client').OrderStatus;
    if (req.query.restaurantId) where.restaurantId = req.query.restaurantId as string;
    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        restaurant: { select: { id: true, name: true } },
        items: { include: { menuItem: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return res.json(orders);
  }
);

// Refund order
adminRouter.post(
  '/orders/:orderId/refund',
  param('orderId').isString(),
  [body('reason').optional().trim()],
  async (req: Request, res: Response) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId as string },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (!order.stripePaymentIntentId) {
      return res.status(400).json({ error: 'Order has no payment to refund' });
    }
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });

    const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
    const chargeId = paymentIntent.latest_charge;
    if (!chargeId || typeof chargeId !== 'string') {
      return res.status(400).json({ error: 'No charge found for this order' });
    }

    await stripe.refunds.create({
      charge: chargeId,
      reason: req.body.reason ? 'requested_by_customer' : undefined,
    });

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
      include: {
        user: { select: { id: true, name: true } },
        restaurant: { select: { id: true, name: true } },
      },
    });
    return res.json(updated);
  }
);

// Platform analytics
adminRouter.get('/analytics', async (_req: Request, res: Response) => {
  const [totalOrders, totalRevenue, restaurantCount, pendingRestaurants] = await Promise.all([
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.order.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { totalPrice: true },
    }),
    prisma.restaurant.count({ where: { approved: true } }),
    prisma.restaurant.count({ where: { approved: false } }),
  ]);

  const recentOrders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      restaurant: { select: { name: true } },
      user: { select: { name: true } },
    },
  });

  return res.json({
    totalOrders,
    totalRevenue: totalRevenue._sum.totalPrice ?? 0,
    restaurantCount,
    pendingRestaurants,
    recentOrders,
  });
});
