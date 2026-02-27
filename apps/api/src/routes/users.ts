import { Router, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { geocode } from '../lib/geocode.js';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.js';

function buildAddressString(parts: { street: string; city: string; state?: string | null; postalCode: string }): string {
  const { street, city, state, postalCode } = parts;
  return [street, city, state?.trim() || '', postalCode].filter(Boolean).join(', ');
}

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/profile', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

usersRouter.patch(
  '/profile',
  [
    body('name').optional().trim().isLength({ min: 1 }),
    body('email').optional().isEmail().normalizeEmail(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, email } = req.body;
    if (email) {
      const taken = await prisma.user.findFirst({
        where: { email, id: { not: req.userId! } },
      });
      if (taken) return res.status(409).json({ error: 'Email already in use' });
    }
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: { ...(name != null && { name }), ...(email != null && { email }) },
      select: { id: true, name: true, email: true, role: true },
    });
    return res.json(user);
  }
);

// Addresses
usersRouter.get('/addresses', async (req: AuthRequest, res: Response) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.userId! },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  return res.json(addresses);
});

usersRouter.post(
  '/addresses',
  [
    body('label').optional().trim(),
    body('street').trim().notEmpty(),
    body('city').trim().notEmpty(),
    body('state').optional().trim(),
    body('postalCode').trim().notEmpty(),
    body('isDefault').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { label, street, city, state, postalCode, isDefault } = req.body;
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.userId! },
        data: { isDefault: false },
      });
    }
    const addressStr = buildAddressString({ street, city, state, postalCode });
    const coords = await geocode(addressStr);
    const address = await prisma.address.create({
      data: {
        userId: req.userId!,
        label: label || null,
        street,
        city,
        state: state || null,
        postalCode,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        isDefault: !!isDefault,
      },
    });
    return res.status(201).json(address);
  }
);

usersRouter.get('/addresses/:id', param('id').isString(), async (req: AuthRequest, res: Response) => {
  const address = await prisma.address.findFirst({
    where: { id: req.params.id as string, userId: req.userId! },
  });
  if (!address) return res.status(404).json({ error: 'Address not found' });
  return res.json(address);
});

usersRouter.patch(
  '/addresses/:id',
  param('id').isString(),
  [
    body('label').optional().trim(),
    body('street').optional().trim().notEmpty(),
    body('city').optional().trim().notEmpty(),
    body('state').optional().trim(),
    body('postalCode').optional().trim().notEmpty(),
    body('isDefault').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const existing = await prisma.address.findFirst({
      where: { id: req.params.id as string, userId: req.userId! },
    });
    if (!existing) return res.status(404).json({ error: 'Address not found' });
    const { label, street, city, state, postalCode, isDefault } = req.body;
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.userId! },
        data: { isDefault: false },
      });
    }
    const merged = {
      street: street ?? existing.street,
      city: city ?? existing.city,
      state: state !== undefined ? state : existing.state,
      postalCode: postalCode ?? existing.postalCode,
    };
    const addressStr = buildAddressString(merged);
    const coords = await geocode(addressStr);
    const address = await prisma.address.update({
      where: { id: req.params.id as string },
      data: {
        ...(label !== undefined && { label: label || null }),
        ...(street !== undefined && { street }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state: state || null }),
        ...(postalCode !== undefined && { postalCode }),
        ...(coords != null && { latitude: coords.latitude, longitude: coords.longitude }),
        ...(isDefault !== undefined && { isDefault: !!isDefault }),
      },
    });
    return res.json(address);
  }
);

usersRouter.delete('/addresses/:id', param('id').isString(), async (req: AuthRequest, res: Response) => {
  const existing = await prisma.address.findFirst({
    where: { id: req.params.id as string, userId: req.userId! },
  });
  if (!existing) return res.status(404).json({ error: 'Address not found' });
  await prisma.address.delete({ where: { id: req.params.id as string } });
  return res.status(204).send();
});
