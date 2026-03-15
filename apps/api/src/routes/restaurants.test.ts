import request from 'supertest';
import { app } from '../app.js';

jest.mock('../lib/prisma.js', () => ({
  prisma: {
    restaurant: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    menuCategory: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    menuItem: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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

describe('GET /restaurants/', () => {
  it('returns 200 with list of approved restaurants (no auth required)', async () => {
    (prisma.restaurant.findMany as jest.Mock).mockResolvedValue([
      { id: 'r1', name: 'Halal Place', approved: true, offersPickup: true, offersDelivery: false },
    ]);

    const res = await request(app).get('/restaurants/');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({ id: 'r1', name: 'Halal Place' });
  });

  it('returns 400 when invalid halal status in query', async () => {
    const res = await request(app).get('/restaurants/?halalStatuses=INVALID');

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });
});

describe('GET /restaurants/:id', () => {
  it('returns 404 when restaurant not found', async () => {
    (prisma.restaurant.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/restaurants/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Restaurant not found');
  });

  it('returns 200 with restaurant and menu when found', async () => {
    (prisma.restaurant.findFirst as jest.Mock).mockResolvedValue({
      id: 'r1',
      name: 'Halal Place',
      approved: true,
      menuCategories: [{ items: [] }],
    });

    const res = await request(app).get('/restaurants/r1');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'r1', name: 'Halal Place' });
    expect(res.body.menuCategories).toBeDefined();
  });
});

describe('GET /restaurants/me/restaurant', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app).get('/restaurants/me/restaurant');
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is CUSTOMER', async () => {
    const res = await request(app).get('/restaurants/me/restaurant').set(auth(validToken));
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden');
  });

  it('returns 404 when owner has no restaurant', async () => {
    (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/restaurants/me/restaurant').set(auth(ownerToken));

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Restaurant not found');
  });

  it('returns 200 with restaurant when RESTAURANT_OWNER', async () => {
    (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1',
      name: 'My Restaurant',
      ownerId: 'owner-1',
      menuCategories: [],
    });

    const res = await request(app).get('/restaurants/me/restaurant').set(auth(ownerToken));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'r1', name: 'My Restaurant' });
  });
});

describe('POST /restaurants/me/restaurant', () => {
  it('returns 404 (only admins can create restaurants via POST /admin/restaurants)', async () => {
    const res = await request(app)
      .post('/restaurants/me/restaurant')
      .set(auth(ownerToken))
      .send({
        name: 'R',
        address: '123 Main',
        halalStatuses: ['CERTIFIED_HALAL'],
      });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /restaurants/me/restaurant', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app).patch('/restaurants/me/restaurant').send({ name: 'Updated' });
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is CUSTOMER', async () => {
    const res = await request(app)
      .patch('/restaurants/me/restaurant')
      .set(auth(validToken))
      .send({ name: 'Updated' });
    expect(res.status).toBe(403);
  });

  it('returns 200 with updated restaurant on success', async () => {
    (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1',
      ownerId: 'owner-1',
    });
    (prisma.restaurant.update as jest.Mock).mockResolvedValue({
      id: 'r1',
      name: 'Updated Name',
      ownerId: 'owner-1',
    });

    const res = await request(app)
      .patch('/restaurants/me/restaurant')
      .set(auth(ownerToken))
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'r1', name: 'Updated Name' });
  });
});

describe('GET /restaurants/me/restaurant/categories', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app).get('/restaurants/me/restaurant/categories');
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is CUSTOMER', async () => {
    const res = await request(app)
      .get('/restaurants/me/restaurant/categories')
      .set(auth(validToken));
    expect(res.status).toBe(403);
  });

  it('returns 200 with categories when RESTAURANT_OWNER', async () => {
    (prisma.restaurant.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1',
      ownerId: 'owner-1',
      menuCategories: [{ id: 'c1', name: 'Mains', items: [] }],
    });

    const res = await request(app)
      .get('/restaurants/me/restaurant/categories')
      .set(auth(ownerToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({ id: 'c1', name: 'Mains' });
  });
});
