// Set JWT_SECRET before any route/middleware code loads (avoids console.warn in auth)
process.env.JWT_SECRET = process.env.JWT_SECRET || 'a'.repeat(32);
