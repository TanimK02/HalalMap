import request from 'supertest';
import { createIntegrationPrisma, hasIntegrationDb, testDbUrl } from './helpers.js';

const describeIf = hasIntegrationDb ? describe : describe.skip;

describeIf('API integration: auth flow', () => {
  let app: import('express').Express;
  const prisma = hasIntegrationDb ? createIntegrationPrisma() : null;
  const createdEmails: string[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = testDbUrl!;
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'a'.repeat(32);
    const appModule = await import('../app.js');
    app = appModule.app;
  });

  it('register -> login -> me end-to-end with real DB', async () => {
    const unique = `int-${Date.now()}@example.com`;
    createdEmails.push(unique);
    const registerRes = await request(app).post('/auth/register').send({
      name: 'Integration User',
      email: unique,
      password: 'password123',
    });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.token).toBeDefined();

    const loginRes = await request(app).post('/auth/login').send({
      email: unique,
      password: 'password123',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();

    const meRes = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(unique);
  });

  afterAll(async () => {
    if (prisma && createdEmails.length > 0) {
      await prisma.user.deleteMany({ where: { email: { in: createdEmails } } });
    }
    await prisma?.$disconnect();
  });
});
