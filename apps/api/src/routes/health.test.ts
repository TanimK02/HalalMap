import request from 'supertest';
import { app } from '../app.js';

jest.mock('../lib/prisma.js', () => ({
  prisma: {},
}));

describe('GET /health', () => {
  it('returns 200 and { ok: true }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('GET /config', () => {
  it('returns 200 and { enableDelivery: boolean }', async () => {
    const res = await request(app).get('/config');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('enableDelivery');
    expect(typeof res.body.enableDelivery).toBe('boolean');
  });
});
