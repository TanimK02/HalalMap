import request from 'supertest';
import { app } from '../app.js';

jest.mock('../lib/prisma.js', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const paymentIntentSucceededEvent = {
  type: 'payment_intent.succeeded',
  data: {
    object: {
      id: 'pi_xxx',
      metadata: {
        userId: 'u1',
        restaurantId: 'r1',
        deliveryType: 'DELIVERY',
        deliveryAddressId: 'a1',
        totalPrice: '10',
        feeCents: '0',
        items: '[{"menuItemId":"m1","quantity":1,"priceAtOrder":"10"}]',
      },
    },
  },
};

jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: jest.fn().mockReturnValue(paymentIntentSucceededEvent),
    },
  })),
}));

jest.mock('../lib/config.js', () => ({
  isDeliveryEnabled: jest.fn().mockReturnValue(true),
}));

const { prisma } = require('../lib/prisma.js');
const config = require('../lib/config.js');

describe('POST /webhooks/stripe', () => {
  it('returns 400 when body is missing or not raw', async () => {
    // No body and no Content-Type that triggers raw parser, or body not a Buffer
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('Stripe-Signature', 'sig');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing raw body');
  });

  it('returns 400 when Stripe-Signature header is missing', async () => {
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing Stripe signature');
  });

  it('returns 503 when Stripe webhook not configured', async () => {
    // With body and signature, but STRIPE_WEBHOOK_SECRET is unset and stripe is null (from setupTests)
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', 'sig')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('Stripe webhook not configured');
  });

  it('returns 200 and does not create order when delivery disabled and metadata has deliveryType DELIVERY', async () => {
    jest.resetModules();
    const prevSecret = process.env.STRIPE_SECRET_KEY;
    const prevWebhook = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x';

    const configMod = require('../lib/config.js');
    configMod.isDeliveryEnabled.mockReturnValue(false);

    const { app: testApp } = require('../app.js');
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(testApp)
      .post('/webhooks/stripe')
      .set('Stripe-Signature', 'sig')
      .set('Content-Type', 'application/json')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(200);
    expect(prisma.order.create).not.toHaveBeenCalled();

    process.env.STRIPE_SECRET_KEY = prevSecret;
    process.env.STRIPE_WEBHOOK_SECRET = prevWebhook;
  });
});
