import request from 'supertest';
import { app } from '../app.js';

jest.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    address: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
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
const auth = (): { Authorization: string } => ({ Authorization: `Bearer ${validToken}` });

beforeAll(() => {
  process.env.JWT_SECRET = 'a'.repeat(32);
});

beforeEach(() => {
  jest.clearAllMocks();
  (jwt.verify as jest.Mock).mockImplementation((token: string) => {
    if (token === validToken) {
      return { userId: 'user-123', email: 'u@example.com', role: 'CUSTOMER' };
    }
    throw new Error('invalid');
  });
});

describe('GET /users/profile', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app).get('/users/profile');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('returns 404 when user not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/users/profile').set(auth());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('User not found');
  });

  it('returns 200 with user when token valid', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-123',
      name: 'Me',
      email: 'u@example.com',
      role: 'CUSTOMER',
      createdAt: new Date(),
    });

    const res = await request(app).get('/users/profile').set(auth());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 'user-123',
      name: 'Me',
      email: 'u@example.com',
      role: 'CUSTOMER',
    });
  });
});

describe('PATCH /users/profile', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app).patch('/users/profile').send({ name: 'New' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when validation fails', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-123' });

    const res = await request(app)
      .patch('/users/profile')
      .set(auth())
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('returns 409 when email already in use', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: 'other',
      email: 'taken@example.com',
    });

    const res = await request(app)
      .patch('/users/profile')
      .set(auth())
      .send({ email: 'taken@example.com' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already in use');
  });

  it('returns 200 with updated user on success', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.update as jest.Mock).mockResolvedValue({
      id: 'user-123',
      name: 'Updated',
      email: 'u@example.com',
      role: 'CUSTOMER',
    });

    const res = await request(app)
      .patch('/users/profile')
      .set(auth())
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Updated', email: 'u@example.com' });
  });
});

describe('GET /users/addresses', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app).get('/users/addresses');
    expect(res.status).toBe(401);
  });

  it('returns 200 with addresses when token valid', async () => {
    (prisma.address.findMany as jest.Mock).mockResolvedValue([
      { id: 'addr-1', street: '123 Main', city: 'City', postalCode: '12345', userId: 'user-123' },
    ]);

    const res = await request(app).get('/users/addresses').set(auth());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ id: 'addr-1', street: '123 Main' });
  });
});

describe('POST /users/addresses', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app)
      .post('/users/addresses')
      .send({ street: '123 Main', city: 'City', postalCode: '12345' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when validation fails (missing required fields)', async () => {
    const res = await request(app)
      .post('/users/addresses')
      .set(auth())
      .send({ street: '', city: 'City', postalCode: '12345' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('returns 201 with address on success', async () => {
    (prisma.address.updateMany as jest.Mock).mockResolvedValue(undefined);
    (prisma.address.create as jest.Mock).mockResolvedValue({
      id: 'new-addr',
      street: '123 Main',
      city: 'City',
      postalCode: '12345',
      userId: 'user-123',
    });

    const res = await request(app)
      .post('/users/addresses')
      .set(auth())
      .send({ street: '123 Main', city: 'City', postalCode: '12345' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 'new-addr',
      street: '123 Main',
      city: 'City',
      postalCode: '12345',
    });
  });
});

describe('GET /users/addresses/:id', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app).get('/users/addresses/addr-1');
    expect(res.status).toBe(401);
  });

  it('returns 404 when address not found', async () => {
    (prisma.address.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/users/addresses/addr-1').set(auth());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Address not found');
  });

  it('returns 200 with address when found', async () => {
    (prisma.address.findFirst as jest.Mock).mockResolvedValue({
      id: 'addr-1',
      street: '123 Main',
      city: 'City',
      userId: 'user-123',
    });

    const res = await request(app).get('/users/addresses/addr-1').set(auth());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'addr-1', street: '123 Main' });
  });
});

describe('PATCH /users/addresses/:id', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app).patch('/users/addresses/addr-1').send({ street: '456 Oak' });
    expect(res.status).toBe(401);
  });

  it('returns 404 when address not found', async () => {
    (prisma.address.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .patch('/users/addresses/addr-1')
      .set(auth())
      .send({ street: '456 Oak' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Address not found');
  });

  it('returns 200 with updated address on success', async () => {
    (prisma.address.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: 'addr-1', userId: 'user-123' })
      .mockResolvedValueOnce({ id: 'addr-1', userId: 'user-123' });
    (prisma.address.updateMany as jest.Mock).mockResolvedValue(undefined);
    (prisma.address.update as jest.Mock).mockResolvedValue({
      id: 'addr-1',
      street: '456 Oak',
      city: 'City',
      userId: 'user-123',
    });

    const res = await request(app)
      .patch('/users/addresses/addr-1')
      .set(auth())
      .send({ street: '456 Oak' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'addr-1', street: '456 Oak' });
  });
});

describe('DELETE /users/addresses/:id', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app).delete('/users/addresses/addr-1');
    expect(res.status).toBe(401);
  });

  it('returns 404 when address not found', async () => {
    const findFirst = prisma.address.findFirst as jest.Mock;
    findFirst.mockReset();
    findFirst.mockResolvedValue(null);

    const res = await request(app).delete('/users/addresses/addr-1').set(auth());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Address not found');
  });

  it('returns 204 on success', async () => {
    const findFirst = prisma.address.findFirst as jest.Mock;
    findFirst.mockReset();
    findFirst.mockResolvedValue({
      id: 'addr-1',
      userId: 'user-123',
    });
    (prisma.address.delete as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app).delete('/users/addresses/addr-1').set(auth());

    expect(res.status).toBe(204);
    expect(prisma.address.delete).toHaveBeenCalledWith({ where: { id: 'addr-1' } });
  });
});
