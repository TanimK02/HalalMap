import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Stripe from 'stripe';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma.js';
import { geocode } from '../lib/geocode.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import type { HalalStatus } from '@halal-map/shared';

const HALAL_STATUS_VALUES: HalalStatus[] = [
  'CERTIFIED_HALAL',
  'MUSLIM_OWNED',
  'HALAL_FRIENDLY',
  'PROCLAIMED_HALAL',
  'SOME_HALAL',
];

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

// Create restaurant owner account + restaurant in one transaction (admin only)
adminRouter.post(
  '/restaurants',
  [
    body('name').trim().isLength({ min: 1 }).withMessage('Owner name required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid owner email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('restaurantName').trim().isLength({ min: 1 }).withMessage('Restaurant name required'),
    body('restaurantAddress').trim().isLength({ min: 1 }).withMessage('Restaurant address required'),
    body('restaurantPhone').optional().trim(),
    body('restaurantDescription').optional().trim(),
    body('restaurantHalalStatuses').isArray().withMessage('Halal statuses required'),
    body('restaurantHalalStatuses')
      .custom((arr) => Array.isArray(arr) && arr.length >= 1)
      .withMessage('At least one halal status required'),
    body('restaurantHalalStatuses.*').isIn(HALAL_STATUS_VALUES).withMessage('Invalid halal status'),
    body('restaurantCertificateUrl').optional().trim(),
    body('restaurantCertificateExpiresAt').optional().isISO8601(),
    body('restaurantOffersPickup').optional().isBoolean(),
    body('restaurantOffersDelivery').optional().isBoolean(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      name,
      email,
      password,
      restaurantName,
      restaurantAddress,
      restaurantPhone,
      restaurantDescription,
      restaurantHalalStatuses,
      restaurantCertificateUrl,
      restaurantCertificateExpiresAt,
      restaurantOffersPickup,
      restaurantOffersDelivery,
    } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const coords = await geocode(restaurantAddress);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name as string,
          email: email as string,
          passwordHash,
          role: 'RESTAURANT_OWNER',
        },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });
      const restaurant = await tx.restaurant.create({
        data: {
          ownerId: user.id,
          name: restaurantName as string,
          description: (restaurantDescription as string) || null,
          phone: (restaurantPhone as string) || null,
          address: restaurantAddress as string,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          halalStatuses: restaurantHalalStatuses as HalalStatus[],
          certificateUrl: (restaurantCertificateUrl as string) || null,
          certificateExpiresAt: restaurantCertificateExpiresAt
            ? new Date(restaurantCertificateExpiresAt as string)
            : null,
          approved: false,
          offersPickup: restaurantOffersPickup ?? true,
          offersDelivery: restaurantOffersDelivery ?? false,
        },
        include: { owner: { select: { id: true, name: true, email: true } } },
      });
      return { user, restaurant };
    });

    return res.status(201).json(result);
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
