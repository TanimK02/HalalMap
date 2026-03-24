import request from 'supertest';
import { app } from '../app.js';
import { requireAuth } from '../middleware/auth.js';

jest.mock('../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-jwt-token'),
  verify: jest.fn(),
}));

const { prisma } = require('../lib/prisma.js');
const bcrypt = require('bcrypt') as jest.Mocked<typeof import('bcrypt')>;
const jwt = require('jsonwebtoken') as jest.Mocked<typeof import('jsonwebtoken')>;

beforeAll(() => {
  process.env.JWT_SECRET = 'a'.repeat(32);
});

beforeEach(() => {
  jest.clearAllMocks();
  (jwt.verify as jest.Mock).mockImplementation((token: string) => {
    if (token === 'valid-token') {
      return { userId: 'user-123', email: 'u@example.com', role: 'CUSTOMER' };
    }
    throw new Error('invalid');
  });
});

describe('POST /auth/register', () => {
  it('returns 400 when validation fails (missing name, email, or short password)', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ name: '', email: 'invalid', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns 400 when role is ADMIN (rejected by validation)', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Test',
        email: 'test@example.com',
        password: 'password123',
        role: 'ADMIN',
      });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('returns 409 when email already registered', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'existing',
      email: 'taken@example.com',
    });

    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'Test',
        email: 'taken@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('returns 201 with user and token on success', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'new-user-id',
      name: 'New User',
      email: 'new@example.com',
      role: 'CUSTOMER',
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/auth/register')
      .send({
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      id: 'new-user-id',
      name: 'New User',
      email: 'new@example.com',
      role: 'CUSTOMER',
    });
    expect(res.body.token).toBe('mock-jwt-token');
    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(jwt.sign).toHaveBeenCalled();
  });
});

describe('POST /auth/login', () => {
  it('returns 400 when validation fails', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'not-an-email', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('returns 401 when user not found or password wrong', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('returns 401 when password does not match', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'u@example.com',
      passwordHash: 'hashed',
      name: 'U',
      role: 'CUSTOMER',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'u@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('returns 200 with user and token on success', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'u@example.com',
      passwordHash: 'hashed',
      name: 'User',
      role: 'CUSTOMER',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'u@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      id: 'u1',
      name: 'User',
      email: 'u@example.com',
      role: 'CUSTOMER',
    });
    expect(res.body.token).toBe('mock-jwt-token');
  });
});

describe('GET /auth/me', () => {
  it('returns 401 when no token', async () => {
    const res = await request(app).get('/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('returns 401 when user missing after token validates (requireAuth then /me lookup)', async () => {
    (prisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'user-123' })
      .mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('returns 200 with user when token valid and user exists', async () => {
    const userRow = {
      id: 'user-123',
      name: 'Me',
      email: 'u@example.com',
      role: 'CUSTOMER',
      createdAt: new Date(),
    };
    (prisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'user-123' })
      .mockResolvedValueOnce(userRow);

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 'user-123',
      name: 'Me',
      email: 'u@example.com',
      role: 'CUSTOMER',
    });
  });
});

describe('requireAuth middleware (unit)', () => {
  function mockReq(overrides: Partial<{ headers: Record<string, string> }> = {}) {
    return { headers: {}, ...overrides } as any;
  }
  function mockRes() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }
  function mockNext() {
    return jest.fn();
  }

  it('returns 401 when no Authorization header', async () => {
    const req = mockReq({ headers: {} });
    const res = mockRes();
    const next = mockNext();
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization does not start with Bearer ', async () => {
    const req = mockReq({ headers: { authorization: 'Basic xyz' } });
    const res = mockRes();
    const next = mockNext();
    await requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid or expired', async () => {
    const req = mockReq({ headers: { authorization: 'Bearer bad-token' } });
    const res = mockRes();
    const next = mockNext();
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid');
    });
    await requireAuth(req, res, next);
    expect(jwt.verify).toHaveBeenCalledWith('bad-token', process.env.JWT_SECRET);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and sets req.userId and req.userRole when token is valid and user exists', async () => {
    const req = mockReq({ headers: { authorization: 'Bearer valid-token' } });
    const res = mockRes();
    const next = mockNext();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-123' });
    await requireAuth(req, res, next);
    expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
    expect(req.userId).toBe('user-123');
    expect(req.userRole).toBe('CUSTOMER');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
