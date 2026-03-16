import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma.js';
import { isDeliveryEnabled } from '../lib/config.js';
import { Decimal } from '@prisma/client/runtime/library';

const stripe =
  process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

export const webhooksRouter = Router();

interface OrderItemMeta {
  menuItemId: string;
  quantity: number;
  priceAtOrder: string;
}

function parseItemsFromMetadata(metadata: Record<string, string>): OrderItemMeta[] {
  let itemsJson = metadata.items ?? '';
  let i = 0;
  while (metadata[`items${i}`]) {
    itemsJson += metadata[`items${i}`];
    i++;
  }
  if (!itemsJson) return [];
  try {
    return JSON.parse(itemsJson) as OrderItemMeta[];
  } catch {
    return [];
  }
}

webhooksRouter.post('/stripe', async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer | undefined;
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    return res.status(400).json({ error: 'Missing raw body' });
  }
  const signature = req.headers['stripe-signature'];
  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !stripe) {
    return res.status(503).json({ error: 'Stripe webhook not configured' });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    return res.status(400).json({ error: message });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const meta = paymentIntent.metadata ?? {};

    const existing = await prisma.order.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
    });
    if (existing) {
      res.status(200).json({ received: true });
      return;
    }

    const userId = meta.userId;
    const restaurantId = meta.restaurantId;
    const deliveryType = meta.deliveryType as 'PICKUP' | 'DELIVERY' | undefined;
    const deliveryAddressIdRaw = meta.deliveryAddressId;
    const deliveryAddressId =
      deliveryAddressIdRaw && deliveryAddressIdRaw !== '' ? deliveryAddressIdRaw : null;
    const totalPriceStr = meta.totalPrice;
    const feeCentsStr = meta.feeCents;
    const itemsMeta = parseItemsFromMetadata(meta);

    if (
      !userId ||
      !restaurantId ||
      !deliveryType ||
      totalPriceStr === undefined ||
      itemsMeta.length === 0
    ) {
      res.status(200).json({ received: true });
      return;
    }

    if (deliveryType === 'DELIVERY' && !isDeliveryEnabled()) {
      console.warn('[webhook] Skipping order creation: delivery disabled app-wide', { paymentIntentId: paymentIntent.id });
      res.status(200).json({ received: true });
      return;
    }

    const totalPrice = new Decimal(totalPriceStr);
    const feeCents = feeCentsStr != null ? parseInt(feeCentsStr, 10) : 0;
    const orderItems = itemsMeta.map((item) => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      priceAtOrder: new Decimal(item.priceAtOrder),
    }));

    await prisma.order.create({
      data: {
        userId,
        restaurantId,
        status: 'PENDING',
        totalPrice,
        feeCents: Number.isNaN(feeCents) ? 0 : feeCents,
        deliveryType,
        deliveryAddressId,
        stripePaymentIntentId: paymentIntent.id,
        paymentConfirmedAt: new Date(),
        items: {
          create: orderItems,
        },
      },
    });
  }

  res.status(200).json({ received: true });
});
