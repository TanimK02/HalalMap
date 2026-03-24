import { PrismaClient } from '@prisma/client';

export const testDbUrl = process.env.TEST_DATABASE_URL;
export const hasIntegrationDb = Boolean(testDbUrl);

export function createIntegrationPrisma() {
  if (!testDbUrl) {
    throw new Error('TEST_DATABASE_URL is required for integration tests');
  }
  return new PrismaClient({
    datasources: {
      db: { url: testDbUrl },
    },
  });
}
