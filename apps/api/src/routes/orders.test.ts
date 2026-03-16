import request from 'supertest';
import { app } from '../app.js';
import { Decimal } from '@prisma/client/runtime/library';

jest.mock('../lib/prisma.js', () => ({
  prisma: {
    restaurant: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    address: {
      findFirst: jest.fn(),
    },
    order: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

const { prisma } = require('../lib/prisma.js');
const jwt = require('jsonwebtoken') as jest.Mocked<typeof import('jsonwebtoken')>;

const validToken = 'valid-token';
const ownerToken = 'owner-token';
const auth = (token: string = validToken) => ({ Authorization: `Bearer ${token}` });

beforeAll(() => {
  process.env.JWT_SECRET = 'a'.repeat(32);
});

beforeEach(() => {
  jest.clearAllMocks();
  (jwt.verify as jest.Mock).mockImplementation((token: string) => {
    if (token === validToken) {
      return { userId: 'user-123', email: 'u@example.com', role: 'CUSTOMER' };
    }
    if (token === ownerToken) {
      return { userId: 'owner-1', email: 'owner@example.com', role: 'RESTAURANT_OWNER' };
    }
    throw new Error('invalid');
  });
});

describe('POST /orders/', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app)
      .post('/orders/')
      .send({
        restaurantId: 'r1',
        deliveryType: 'PICKUP',
        items: [{ menuItemId: 'm1', quantity: 1 }],
      });
    expect(res.status).toBe(401);
  });

  it('returns 400 when validation fails', async () => {
    const res = await request(app)
      .post('/orders/')
      .set(auth())
      .send({
        restaurantId: '',
        deliveryType: 'PICKUP',
        items: [],
      });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('returns 404 when restaurant not found', async () => {
    (prisma.restaurant.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/orders/')
      .set(auth())
      .send({
        restaurantId: 'nonexistent',
        deliveryType: 'PICKUP',
        items: [{ menuItemId: 'm1', quantity: 1 }],
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Restaurant not found');
  });

  it('returns 400 when deliveryType is DELIVERY and ENABLE_DELIVERY is false', async () => {
    const prev = process.env.ENABLE_DELIVERY;
    process.env.ENABLE_DELIVERY = 'false';
    (prisma.restaurant.findFirst as jest.Mock).mockResolvedValue(null); // not reached

    const res = await request(app)
      .post('/orders/')
      .set(auth())
      .send({
        restaurantId: 'r1',
        deliveryType: 'DELIVERY',
        deliveryAddressId: 'addr-1',
        items: [{ menuItemId: 'm1', quantity: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Delivery is currently unavailable');
    expect(prisma.restaurant.findFirst).not.toHaveBeenCalled();
    process.env.ENABLE_DELIVERY = prev;
  });

  it('returns 201 with order and clientSecret null when Stripe not configured (no-Stripe branch)', async () => {
    const mockMenuItem = {
      id: 'm1',
      name: 'Item',
      price: 10,
      isAvailable: true,
      availableForPickup: true,
      availableForDelivery: true,
    };
    (prisma.restaurant.findFirst as jest.Mock).mockResolvedValue({
      id: 'r1',
      approved: true,
      offersPickup: true,
      offersDelivery: false,
      pickupFeeType: null,
      pickupFeeValue: null,
      deliveryFeeType: null,
      deliveryFeeValue: null,
      menuCategories: [{ items: [mockMenuItem] }],
    });
    (prisma.order.create as jest.Mock).mockResolvedValue({
      id: 'order-1',
      status: 'PENDING',
      totalPrice: new Decimal(10),
      feeCents: 0,
      deliveryType: 'PICKUP',
      deliveryAddressId: null,
      items: [{ menuItemId: 'm1', quantity: 1, priceAtOrder: new Decimal(10) }],
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/orders/')
      .set(auth())
      .send({
        restaurantId: 'r1',
        deliveryType: 'PICKUP',
        items: [{ menuItemId: 'm1', quantity: 1 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.clientSecret).toBeNull();
    expect(res.body.order).toBeDefined();
    expect(res.body.order.id).toBe('order-1');
    expect(res.body.order.status).toBe('PENDING');
    expect(res.body.order.deliveryType).toBe('PICKUP');
    expect(prisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          platformFeeCents: expect.any(Number),
        }),
      })
    );
  });
});

describe('POST /orders/:orderId/confirm-payment', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app).post('/orders/order-1/confirm-payment');
    expect(res.status).toBe(401);
  });

  it('returns 404 when order not found', async () => {
    (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/orders/order-1/confirm-payment')
      .set(auth());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Order not found');
  });

  it('returns 200 with order when order exists and is PENDING', async () => {
    (prisma.order.findFirst as jest.Mock).mockResolvedValue({
      id: 'order-1',
      userId: 'user-123',
      status: 'PENDING',
      stripePaymentIntentId: null,
    });
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      status: 'PENDING',
      items: [{ menuItem: { name: 'Item' } }],
      restaurant: { name: 'R' },
    });

    const res = await request(app)
      .post('/orders/order-1/confirm-payment')
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'order-1');
    expect(res.body).toHaveProperty('restaurant');
    expect(res.body).toHaveProperty('items');
  });
});

describe('GET /orders/', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app).get('/orders/');
    expect(res.status).toBe(401);
  });

  it('returns 200 with orders list when token valid', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'order-1',
        status: 'PENDING',
        restaurant: { id: 'r1', name: 'R' },
        items: [],
      },
    ]);

    const res = await request(app).get('/orders/').set(auth());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({ id: 'order-1', status: 'PENDING' });
  });
});

describe('GET /orders/restaurant/orders', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app).get('/orders/restaurant/orders');
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not RESTAURANT_OWNER', async () => {
    const res = await request(app)
      .get('/orders/restaurant/orders')
      .set(auth(validToken));

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('returns 200 with orders when RESTAURANT_OWNER', async () => {
    (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue({ id: 'r1', ownerId: 'owner-1' });
    (prisma.order.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/orders/restaurant/orders')
      .set(auth(ownerToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /orders/by-payment-intent/:paymentIntentId', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app).get('/orders/by-payment-intent/pi_xxx');
    expect(res.status).toBe(401);
  });

  it('returns 404 when order not found', async () => {
    (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get('/orders/by-payment-intent/pi_xxx')
      .set(auth());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Order not found');
  });
});

describe('GET /orders/:id', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app).get('/orders/order-1');
    expect(res.status).toBe(401);
  });

  it('returns 404 when order not found', async () => {
    (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/orders/order-1').set(auth());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Order not found');
  });

  it('returns 200 with order when found', async () => {
    (prisma.order.findFirst as jest.Mock).mockResolvedValue({
      id: 'order-1',
      userId: 'user-123',
      restaurant: {},
      items: [],
      deliveryAddress: null,
    });

    const res = await request(app).get('/orders/order-1').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('order-1');
  });
});
