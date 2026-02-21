import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.js';
import type { HalalStatus } from '@halal-map/shared';

export const restaurantsRouter = Router();

// Public: list approved restaurants (with optional filters)
restaurantsRouter.get(
  '/',
  [
    query('halalStatus').optional().isIn([
      'CERTIFIED_HALAL', 'MUSLIM_OWNED', 'HALAL_FRIENDLY', 'PROCLAIMED_HALAL', 'SOME_HALAL',
    ]),
    query('search').optional().trim(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const halalStatus = req.query.halalStatus as HalalStatus | undefined;
    const search = req.query.search as string | undefined;

    const where: {
      approved: boolean;
      halalStatus?: HalalStatus;
      OR?: { name?: { contains: string; mode: 'insensitive' }; description?: { contains: string; mode: 'insensitive' } }[];
    } = {
      approved: true,
    };
    if (halalStatus) where.halalStatus = halalStatus;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const restaurants = await prisma.restaurant.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        phone: true,
        address: true,
        halalStatus: true,
        certificateExpiresAt: true,
        offersPickup: true,
        offersDelivery: true,
      },
      orderBy: { name: 'asc' },
    });
    return res.json(restaurants);
  }
);

// Public: get single restaurant with menu
restaurantsRouter.get('/:id', param('id').isString(), async (req: Request, res: Response) => {
  const restaurant = await prisma.restaurant.findFirst({
    where: { id: req.params.id as string, approved: true },
    include: {
      menuCategories: {
        orderBy: { sortOrder: 'asc' },
        include: {
          items: {
            where: { isAvailable: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
  return res.json(restaurant);
});

// Owner: get my restaurant
restaurantsRouter.get(
  '/me/restaurant',
  requireAuth,
  requireRole('RESTAURANT_OWNER'),
  async (req: AuthRequest, res: Response) => {
    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
      include: {
        menuCategories: {
          orderBy: { sortOrder: 'asc' },
          include: { items: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    return res.json(restaurant);
  }
);

// Owner: create restaurant (one per owner)
restaurantsRouter.post(
  '/me/restaurant',
  requireAuth,
  requireRole('RESTAURANT_OWNER'),
  [
    body('name').trim().notEmpty(),
    body('description').optional().trim(),
    body('phone').optional().trim(),
    body('address').trim().notEmpty(),
    body('halalStatus').isIn([
      'CERTIFIED_HALAL', 'MUSLIM_OWNED', 'HALAL_FRIENDLY', 'PROCLAIMED_HALAL', 'SOME_HALAL',
    ]),
    body('certificateUrl').optional().trim(),
    body('certificateExpiresAt').optional().isISO8601(),
    body('businessHours').optional().isObject(),
    body('offersPickup').optional().isBoolean(),
    body('offersDelivery').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existing = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
    });
    if (existing) return res.status(409).json({ error: 'Restaurant already exists for this account' });

    const data = req.body;
    const restaurant = await prisma.restaurant.create({
      data: {
        ownerId: req.userId!,
        name: data.name,
        description: data.description || null,
        phone: data.phone || null,
        address: data.address,
        halalStatus: data.halalStatus,
        certificateUrl: data.certificateUrl || null,
        certificateExpiresAt: data.certificateExpiresAt
          ? new Date(data.certificateExpiresAt)
          : null,
        businessHours: data.businessHours || undefined,
        offersPickup: data.offersPickup ?? true,
        offersDelivery: data.offersDelivery ?? false,
      },
    });
    return res.status(201).json(restaurant);
  }
);

// Owner: update my restaurant
restaurantsRouter.patch(
  '/me/restaurant',
  requireAuth,
  requireRole('RESTAURANT_OWNER'),
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('phone').optional().trim(),
    body('address').optional().trim().notEmpty(),
    body('halalStatus').optional().isIn([
      'CERTIFIED_HALAL', 'MUSLIM_OWNED', 'HALAL_FRIENDLY', 'PROCLAIMED_HALAL', 'SOME_HALAL',
    ]),
    body('certificateUrl').optional().trim(),
    body('certificateExpiresAt').optional().isISO8601(),
    body('businessHours').optional().isObject(),
    body('offersPickup').optional().isBoolean(),
    body('offersDelivery').optional().isBoolean(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const data = req.body;
    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.address != null && { address: data.address }),
        ...(data.halalStatus != null && { halalStatus: data.halalStatus }),
        ...(data.certificateUrl !== undefined && { certificateUrl: data.certificateUrl || null }),
        ...(data.certificateExpiresAt !== undefined && {
          certificateExpiresAt: data.certificateExpiresAt
            ? new Date(data.certificateExpiresAt)
            : null,
        }),
        ...(data.businessHours !== undefined && { businessHours: data.businessHours }),
        ...(data.offersPickup !== undefined && { offersPickup: data.offersPickup }),
        ...(data.offersDelivery !== undefined && { offersDelivery: data.offersDelivery }),
      },
    });
    return res.json(updated);
  }
);

// Owner: menu categories CRUD
restaurantsRouter.get(
  '/me/restaurant/categories',
  requireAuth,
  requireRole('RESTAURANT_OWNER'),
  async (req: AuthRequest, res: Response) => {
    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
      include: {
        menuCategories: { orderBy: { sortOrder: 'asc' }, include: { items: true } },
      },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    return res.json(restaurant.menuCategories);
  }
);

restaurantsRouter.post(
  '/me/restaurant/categories',
  requireAuth,
  requireRole('RESTAURANT_OWNER'),
  [body('name').trim().notEmpty(), body('sortOrder').optional().isInt()],
  async (req: AuthRequest, res: Response) => {
    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const { name, sortOrder } = req.body;
    const category = await prisma.menuCategory.create({
      data: {
        restaurantId: restaurant.id,
        name,
        sortOrder: sortOrder ?? (await prisma.menuCategory.count({ where: { restaurantId: restaurant.id } })),
      },
    });
    return res.status(201).json(category);
  }
);

restaurantsRouter.patch(
  '/me/restaurant/categories/:categoryId',
  requireAuth,
  requireRole('RESTAURANT_OWNER'),
  param('categoryId').isString(),
  [body('name').optional().trim().notEmpty(), body('sortOrder').optional().isInt()],
  async (req: AuthRequest, res: Response) => {
    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const category = await prisma.menuCategory.findFirst({
      where: { id: req.params.categoryId as string, restaurantId: restaurant.id },
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    const { name, sortOrder } = req.body;
    const updated = await prisma.menuCategory.update({
      where: { id: category.id },
      data: { ...(name != null && { name }), ...(sortOrder != null && { sortOrder }) },
    });
    return res.json(updated);
  }
);

restaurantsRouter.delete(
  '/me/restaurant/categories/:categoryId',
  requireAuth,
  requireRole('RESTAURANT_OWNER'),
  param('categoryId').isString(),
  async (req: AuthRequest, res: Response) => {
    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const category = await prisma.menuCategory.findFirst({
      where: { id: req.params.categoryId as string, restaurantId: restaurant.id },
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    await prisma.menuCategory.delete({ where: { id: category.id } });
    return res.status(204).send();
  }
);

// Owner: menu items CRUD
restaurantsRouter.post(
  '/me/restaurant/categories/:categoryId/items',
  requireAuth,
  requireRole('RESTAURANT_OWNER'),
  param('categoryId').isString(),
  [
    body('name').trim().notEmpty(),
    body('description').optional().trim(),
    body('price').isFloat({ min: 0 }),
    body('imageUrl').optional().trim(),
    body('isAvailable').optional().isBoolean(),
    body('sortOrder').optional().isInt(),
  ],
  async (req: AuthRequest, res: Response) => {
    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const category = await prisma.menuCategory.findFirst({
      where: { id: req.params.categoryId as string, restaurantId: restaurant.id },
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    const { name, description, price, imageUrl, isAvailable, sortOrder } = req.body;
    const item = await prisma.menuItem.create({
      data: {
        categoryId: category.id,
        name,
        description: description || null,
        price,
        imageUrl: imageUrl || null,
        isAvailable: isAvailable ?? true,
        sortOrder: sortOrder ?? 0,
      },
    });
    return res.status(201).json(item);
  }
);

restaurantsRouter.patch(
  '/me/restaurant/items/:itemId',
  requireAuth,
  requireRole('RESTAURANT_OWNER'),
  param('itemId').isString(),
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('price').optional().isFloat({ min: 0 }),
    body('imageUrl').optional().trim(),
    body('isAvailable').optional().isBoolean(),
    body('sortOrder').optional().isInt(),
  ],
  async (req: AuthRequest, res: Response) => {
    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
      include: { menuCategories: true },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const categoryIds = restaurant.menuCategories.map((c) => c.id);
    const item = await prisma.menuItem.findFirst({
      where: { id: req.params.itemId as string, categoryId: { in: categoryIds } },
    });
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    const data = req.body;
    const updated = await prisma.menuItem.update({
      where: { id: item.id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.price != null && { price: data.price }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
        ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
        ...(data.sortOrder != null && { sortOrder: data.sortOrder }),
      },
    });
    return res.json(updated);
  }
);

restaurantsRouter.delete(
  '/me/restaurant/items/:itemId',
  requireAuth,
  requireRole('RESTAURANT_OWNER'),
  param('itemId').isString(),
  async (req: AuthRequest, res: Response) => {
    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
      include: { menuCategories: true },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const categoryIds = restaurant.menuCategories.map((c) => c.id);
    const item = await prisma.menuItem.findFirst({
      where: { id: req.params.itemId as string, categoryId: { in: categoryIds } },
    });
    if (!item) return res.status(404).json({ error: 'Menu item not found' });
    await prisma.menuItem.delete({ where: { id: item.id } });
    return res.status(204).send();
  }
);
