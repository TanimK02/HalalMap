import { requireAuth, requireRole } from './auth.js';

jest.mock('jsonwebtoken');

const jwt = require('jsonwebtoken') as jest.Mocked<typeof import('jsonwebtoken')>;

beforeAll(() => {
  process.env.JWT_SECRET = 'a'.repeat(32);
});

beforeEach(() => {
  jest.clearAllMocks();
});

function mockReq(overrides: Partial<{ headers: Record<string, string> }> = {}) {
  return {
    headers: {},
    ...overrides,
  } as any;
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

describe('requireAuth', () => {
  it('returns 401 when no Authorization header', () => {
    const req = mockReq({ headers: {} });
    const res = mockRes();
    const next = mockNext();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
    expect(jwt.verify).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization does not start with Bearer ', () => {
    const req = mockReq({ headers: { authorization: 'Basic xyz' } });
    const res = mockRes();
    const next = mockNext();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid or expired', () => {
    const req = mockReq({ headers: { authorization: 'Bearer bad-token' } });
    const res = mockRes();
    const next = mockNext();
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid');
    });

    requireAuth(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('bad-token', process.env.JWT_SECRET);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and sets req.userId and req.userRole when token is valid', () => {
    const req = mockReq({ headers: { authorization: 'Bearer valid-token' } });
    const res = mockRes();
    const next = mockNext();
    (jwt.verify as jest.Mock).mockReturnValue({
      userId: 'user-123',
      email: 'u@example.com',
      role: 'CUSTOMER',
    });

    requireAuth(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
    expect(req.userId).toBe('user-123');
    expect(req.userRole).toBe('CUSTOMER');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  it('returns 401 when req has no userId / userRole', () => {
    const middleware = requireRole('ADMIN');
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when req.userRole is not in allowed roles', () => {
    const middleware = requireRole('ADMIN');
    const req = mockReq() as any;
    req.userId = 'user-1';
    req.userRole = 'CUSTOMER';
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Forbidden' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when req.userRole is in allowed roles', () => {
    const middleware = requireRole('ADMIN', 'RESTAURANT_OWNER');
    const req = mockReq() as any;
    req.userId = 'user-1';
    req.userRole = 'RESTAURANT_OWNER';
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
