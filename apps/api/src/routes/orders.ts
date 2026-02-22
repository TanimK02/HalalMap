import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.js';
import type { DeliveryType, OrderStatus } from '@halal-map/shared';
import { Decimal } from '@prisma/client/runtime/library';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

export const ordersRouter = Router();

// Customer: checkout -> when Stripe: create PaymentIntent only (order created in webhook); when no Stripe: create order, return order
ordersRouter.post(
  '/',
  requireAuth,
  [
    body('restaurantId').trim().notEmpty(),
    body('deliveryType').isIn(['PICKUP', 'DELIVERY']),
    body('deliveryAddressId').optional().trim(),
    body('items').isArray(),
    body('items.*.menuItemId').trim().notEmpty(),
    body('items.*.quantity').isInt({ min: 1 }),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { restaurantId, deliveryType, deliveryAddressId, items } = req.body as {
      restaurantId: string;
      deliveryType: DeliveryType;
      deliveryAddressId?: string;
      items: { menuItemId: string; quantity: number }[];
    };

    const restaurant = await prisma.restaurant.findFirst({
      where: { id: restaurantId, approved: true },
      include: { menuCategories: { include: { items: true } } },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    if (deliveryType === 'DELIVERY' && !restaurant.offersDelivery) {
      return res.status(400).json({ error: 'Restaurant does not offer delivery' });
    }
    if (deliveryType === 'PICKUP' && !restaurant.offersPickup) {
      return res.status(400).json({ error: 'Restaurant does not offer pickup' });
    }

    if (deliveryType === 'DELIVERY' && !deliveryAddressId) {
      return res.status(400).json({ error: 'Delivery address required for delivery' });
    }

    if (deliveryType === 'DELIVERY' && deliveryAddressId) {
      const addr = await prisma.address.findFirst({
        where: { id: deliveryAddressId, userId: req.userId! },
      });
      if (!addr) return res.status(400).json({ error: 'Invalid delivery address' });
    }

    const allItems = restaurant.menuCategories.flatMap((c) => c.items);
    let totalCents = 0;
    const orderItems: { menuItemId: string; quantity: number; priceAtOrder: Decimal }[] = [];

    for (const line of items) {
      const menuItem = allItems.find((i) => i.id === line.menuItemId);
      if (!menuItem || !menuItem.isAvailable) {
        return res.status(400).json({ error: `Invalid or unavailable item: ${line.menuItemId}` });
      }
      const price = Number(menuItem.price);
      const lineTotal = price * line.quantity;
      totalCents += Math.round(lineTotal * 100);
      orderItems.push({
        menuItemId: menuItem.id,
        quantity: line.quantity,
        priceAtOrder: new Decimal(price),
      });
    }

    if (totalCents <= 0) return res.status(400).json({ error: 'Order total must be positive' });

    const totalPrice = totalCents / 100;

    if (stripe) {
      const itemsPayload = orderItems.map((i) => ({
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        priceAtOrder: String(i.priceAtOrder),
      }));
      let itemsJson = JSON.stringify(itemsPayload);
      const metadata: Record<string, string> = {
        userId: req.userId!,
        restaurantId: restaurant.id,
        deliveryType,
        deliveryAddressId: deliveryType === 'DELIVERY' && deliveryAddressId ? deliveryAddressId : '',
        totalPrice: String(totalPrice),
      };
      const maxMetaVal = 500;
      if (itemsJson.length <= maxMetaVal) {
        metadata.items = itemsJson;
      } else {
        for (let i = 0; i < itemsJson.length; i += maxMetaVal) {
          metadata[`items${Math.floor(i / maxMetaVal)}`] = itemsJson.slice(i, i + maxMetaVal);
        }
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: 'usd',
        metadata,
        automatic_payment_methods: { enabled: true },
      });

      return res.status(201).json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    }

    const order = await prisma.order.create({
      data: {
        userId: req.userId!,
        restaurantId: restaurant.id,
        status: 'PENDING',
        totalPrice: new Decimal(totalPrice),
        deliveryType,
        deliveryAddressId: deliveryType === 'DELIVERY' ? deliveryAddressId : null,
        items: {
          create: orderItems,
        },
      },
      include: { items: true },
    });

    return res.status(201).json({
      order: {
        id: order.id,
        status: order.status,
        totalPrice: Number(order.totalPrice),
        deliveryType: order.deliveryType,
        items: order.items,
        createdAt: order.createdAt,
      },
      clientSecret: null,
    });
  }
);

// Confirm payment (idempotent) - call after client confirms PaymentIntent
ordersRouter.post(
  '/:orderId/confirm-payment',
  requireAuth,
  param('orderId').isString(),
  async (req: AuthRequest, res: Response) => {
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId as string, userId: req.userId! },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status !== 'PENDING') {
      const existing = await prisma.order.findUnique({
        where: { id: order.id },
        include: { items: { include: { menuItem: true } }, restaurant: true },
      });
      return res.json(existing);
    }
    if (order.stripePaymentIntentId && stripe) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
        if (paymentIntent.status === 'succeeded' && !order.paymentConfirmedAt) {
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentConfirmedAt: new Date() },
          });
        }
      } catch {
        // Ignore Stripe errors; webhook remains source of truth
      }
    }
    const updated = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: { include: { menuItem: true } }, restaurant: true },
    });
    return res.json(updated);
  }
);

// Restaurant owner: list orders for my restaurant (must be before /:id)
ordersRouter.get(
  '/restaurant/orders',
  requireAuth,
  requireRole('RESTAURANT_OWNER'),
  [query('status').optional().isIn(['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'])],
  async (req: AuthRequest, res: Response) => {
    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const status = req.query.status as OrderStatus | undefined;
    const orders = await prisma.order.findMany({
      where: {
        restaurantId: restaurant.id,
        paymentConfirmedAt: { not: null },
        ...(status && { status }),
      },
      include: {
        user: { select: { id: true, name: true } },
        items: { include: { menuItem: true } },
        deliveryAddress: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(orders);
  }
);

// Restaurant owner: update order status
ordersRouter.patch(
  '/restaurant/orders/:orderId',
  requireAuth,
  requireRole('RESTAURANT_OWNER'),
  param('orderId').isString(),
  body('status').isIn(['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']),
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId as string, restaurantId: restaurant.id },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: req.body.status },
      include: {
        user: { select: { id: true, name: true } },
        items: { include: { menuItem: true } },
        deliveryAddress: true,
      },
    });
    return res.json(updated);
  }
);

// Customer: my orders
ordersRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.userId! },
    include: {
      restaurant: { select: { id: true, name: true, address: true } },
      items: { include: { menuItem: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return res.json(orders);
});

// Customer: get order by PaymentIntent id (after payment, before webhook may have run)
ordersRouter.get(
  '/by-payment-intent/:paymentIntentId',
  requireAuth,
  param('paymentIntentId').isString(),
  async (req: AuthRequest, res: Response) => {
    const paymentIntentId = req.params.paymentIntentId as string;
    const order = await prisma.order.findFirst({
      where: {
        stripePaymentIntentId: paymentIntentId,
        userId: req.userId!,
      },
      include: {
        restaurant: true,
        items: { include: { menuItem: true } },
        deliveryAddress: true,
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return res.json(order);
  }
);

// Customer: single order
ordersRouter.get('/:id', requireAuth, param('id').isString(), async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id as string, userId: req.userId! },
    include: {
      restaurant: true,
      items: { include: { menuItem: true } },
      deliveryAddress: true,
    },
  });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  return res.json(order);
});
