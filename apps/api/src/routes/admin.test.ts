import request from 'supertest';
import { app } from '../app.js';

jest.mock('../lib/prisma.js', () => ({
  prisma: {
    $transaction: jest.fn(),
    restaurant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    restaurantTagDraft: {
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    restaurantPublishedTag: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  },
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

const { prisma } = require('../lib/prisma.js');
const jwt = require('jsonwebtoken') as jest.Mocked<typeof import('jsonwebtoken')>;

const adminToken = 'admin-token';
const customerToken = 'valid-token';
const auth = (token: string = adminToken) => ({ Authorization: `Bearer ${token}` });

beforeAll(() => {
  process.env.JWT_SECRET = 'a'.repeat(32);
});

beforeEach(() => {
  jest.clearAllMocks();
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
  (jwt.verify as jest.Mock).mockImplementation((token: string) => {
    if (token === adminToken) {
      return { userId: 'admin-1', email: 'admin@example.com', role: 'ADMIN' };
    }
    if (token === customerToken) {
      return { userId: 'user-123', email: 'u@example.com', role: 'CUSTOMER' };
    }
    throw new Error('invalid');
  });
});

describe('Admin routes require ADMIN role', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app).get('/admin/restaurants');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('returns 403 when user is CUSTOMER', async () => {
    const res = await request(app).get('/admin/restaurants').set(auth(customerToken));
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });
});

describe('GET /admin/restaurants', () => {
  it('returns 200 with restaurants when ADMIN', async () => {
    (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([
      { id: 'r1', name: 'R1', approved: false, owner: { id: 'o1', name: 'O', email: 'o@x.com' } },
    ]);

    const res = await request(app).get('/admin/restaurants').set(auth());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({ id: 'r1', name: 'R1' });
  });
});

describe('GET /admin/restaurants/:id', () => {
  it('returns 404 when restaurant not found', async () => {
    (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/admin/restaurants/nonexistent').set(auth());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Restaurant not found');
  });

  it('returns 200 with restaurant when found', async () => {
    (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1',
      name: 'R1',
      hasPendingTagChanges: false,
      owner: { id: 'o1', name: 'O', email: 'o@x.com' },
      menuCategories: [],
      publishedTags: [],
      tagDrafts: [],
    });

    const res = await request(app).get('/admin/restaurants/r1').set(auth());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'r1', name: 'R1' });
    expect(res.body.publishedTags).toEqual([]);
    expect(res.body.draftTags).toEqual([]);
  });
});

describe('GET /admin/tags', () => {
  it('returns 200 with tags', async () => {
    (prisma.tag.findMany as jest.Mock).mockResolvedValue([
      { id: 't1', slug: 'a', label: 'A', sortOrder: 0, active: true, createdAt: new Date(), updatedAt: new Date() },
    ]);

    const res = await request(app).get('/admin/tags').set(auth());

    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ id: 't1', slug: 'a', label: 'A' });
  });
});

describe('POST /admin/restaurants/:id/tags/approve', () => {
  it('returns 400 when no pending tag changes', async () => {
    (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1',
      hasPendingTagChanges: false,
    });

    const res = await request(app).post('/admin/restaurants/r1/tags/approve').set(auth());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No pending tag changes');
  });

  it('returns 200 after approving draft tags', async () => {
    (prisma.restaurant.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'r1',
        hasPendingTagChanges: true,
      })
      .mockResolvedValueOnce({
        id: 'r1',
        name: 'R1',
        hasPendingTagChanges: false,
        owner: { id: 'o1', name: 'O', email: 'o@x.com' },
        menuCategories: [],
        publishedTags: [
          { tag: { id: 't1', slug: 'a', label: 'A', sortOrder: 0, active: true } },
        ],
        tagDrafts: [],
      });
    (prisma.restaurantTagDraft.findMany as jest.Mock).mockResolvedValue([{ tagId: 't1' }]);
    (prisma.restaurantPublishedTag.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.restaurantPublishedTag.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.restaurantTagDraft.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.restaurant.update as jest.Mock).mockResolvedValue({});

    const res = await request(app).post('/admin/restaurants/r1/tags/approve').set(auth());

    expect(res.status).toBe(200);
    expect(res.body.hasPendingTagChanges).toBe(false);
  });
});

describe('PATCH /admin/restaurants/:id/tags', () => {
  it('returns 400 when tag id invalid', async () => {
    (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue({ id: 'r1' });
    (prisma.tag.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .patch('/admin/restaurants/r1/tags')
      .set(auth())
      .send({ tagIds: ['bad'] });

    expect(res.status).toBe(400);
  });
});

describe('PATCH /admin/restaurants/:id/approve', () => {
  it('returns 400 when validation fails', async () => {
    const res = await request(app)
      .patch('/admin/restaurants/r1/approve')
      .set(auth())
      .send({ approved: 'not-a-boolean' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('returns 200 with updated restaurant on success', async () => {
    (prisma.restaurant.update as jest.Mock).mockResolvedValue({
      id: 'r1',
      name: 'R1',
      approved: true,
      owner: { id: 'o1', name: 'O', email: 'o@x.com' },
    });

    const res = await request(app)
      .patch('/admin/restaurants/r1/approve')
      .set(auth())
      .send({ approved: true });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'r1', approved: true });
  });
});

describe('GET /admin/users', () => {
  it('returns 200 with users list when ADMIN', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 'u1', name: 'User', email: 'u@x.com', role: 'CUSTOMER', createdAt: new Date() },
    ]);

    const res = await request(app).get('/admin/users').set(auth());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({ id: 'u1', email: 'u@x.com' });
  });
});

describe('GET /admin/orders', () => {
  it('returns 200 with orders list when ADMIN', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'ord1',
        status: 'PENDING',
        user: { id: 'u1', name: 'U', email: 'u@x.com' },
        restaurant: { id: 'r1', name: 'R' },
        items: [],
      },
    ]);

    const res = await request(app).get('/admin/orders').set(auth());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({ id: 'ord1', status: 'PENDING' });
  });
});

describe('POST /admin/orders/:orderId/refund', () => {
  it('returns 404 when order not found', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/admin/orders/order-1/refund')
      .set(auth());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Order not found');
  });

  it('returns 400 when order has no payment to refund', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      stripePaymentIntentId: null,
    });

    const res = await request(app)
      .post('/admin/orders/order-1/refund')
      .set(auth());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Order has no payment to refund');
  });

  it('returns 503 when Stripe not configured', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue({
      id: 'order-1',
      stripePaymentIntentId: 'pi_xxx',
    });

    const res = await request(app)
      .post('/admin/orders/order-1/refund')
      .set(auth());

    expect(res.status).toBe(503);
    expect(res.body.error).toBe('Stripe not configured');
  });
});

describe('GET /admin/analytics', () => {
  it('returns 200 with analytics when ADMIN', async () => {
    (prisma.order.count as jest.Mock).mockResolvedValue(100);
    (prisma.order.aggregate as jest.Mock)
      .mockResolvedValueOnce({ _sum: { totalPrice: 5000 } })
      .mockResolvedValueOnce({ _sum: { platformFeeCents: 2500 } });
    (prisma.restaurant.count as jest.Mock)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(2);
    (prisma.order.findMany as jest.Mock).mockResolvedValue([
      { id: 'o1', restaurant: { name: 'R' }, user: { name: 'U' } },
    ]);

    const res = await request(app).get('/admin/analytics').set(auth());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalOrders');
    expect(res.body).toHaveProperty('totalRevenue');
    expect(res.body).toHaveProperty('restaurantCount');
    expect(res.body).toHaveProperty('pendingRestaurants');
    expect(res.body).toHaveProperty('recentOrders');
    expect(res.body).toHaveProperty('platformFeeTotal');
    expect(res.body.platformFeeTotal).toBe(2500);
  });
});
