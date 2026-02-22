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
});
