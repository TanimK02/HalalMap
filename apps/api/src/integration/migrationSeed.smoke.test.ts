import { hasIntegrationDb, createIntegrationPrisma } from './helpers.js';

const describeIf = hasIntegrationDb ? describe : describe.skip;

describeIf('DB migration/seed smoke checks', () => {
  const prisma = hasIntegrationDb ? createIntegrationPrisma() : null;

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('has minimum seeded platform invariants', async () => {
    const users = await prisma!.user.count();
    const restaurants = await prisma!.restaurant.count();
    const tags = await prisma!.tag.count();

    expect(users).toBeGreaterThan(0);
    expect(restaurants).toBeGreaterThanOrEqual(0);
    expect(tags).toBeGreaterThan(0);
  });
});
