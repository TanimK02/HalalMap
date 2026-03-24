import { requireRole } from './auth.js';

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
