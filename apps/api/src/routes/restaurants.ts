import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { prisma } from '../lib/prisma.js';
import { getEffectiveFeeStructure } from '../lib/fees.js';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.js';
import type { HalalStatus } from '@halal-map/shared';

const HALAL_STATUS_VALUES: HalalStatus[] = [
  'CERTIFIED_HALAL', 'MUSLIM_OWNED', 'HALAL_FRIENDLY', 'PROCLAIMED_HALAL', 'SOME_HALAL',
];

export const restaurantsRouter = Router();

// Public: list approved restaurants (with optional filters)
restaurantsRouter.get(
  '/',
  [
    query('halalStatuses').optional().trim(),
    query('search').optional().trim(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const halalStatusesParam = (req.query.halalStatuses as string)?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
    const search = req.query.search as string | undefined;

    if (halalStatusesParam.length > 0) {
      const invalid = halalStatusesParam.filter((s) => !HALAL_STATUS_VALUES.includes(s as HalalStatus));
      if (invalid.length > 0) {
        return res.status(400).json({ errors: [{ msg: `Invalid halal statuses: ${invalid.join(', ')}` }] });
      }
    }

    const where: {
      approved: boolean;
      halalStatuses?: { hasEvery: HalalStatus[] };
      OR?: { name?: { contains: string; mode: 'insensitive' }; description?: { contains: string; mode: 'insensitive' } }[];
    } = {
      approved: true,
    };
    if (halalStatusesParam.length > 0) {
      where.halalStatuses = { hasEvery: halalStatusesParam as HalalStatus[] };
    }
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
        halalStatuses: true,
        certificateExpiresAt: true,
        offersPickup: true,
        offersDelivery: true,
      },
      orderBy: { name: 'asc' },
    });
    return res.json(restaurants);
  }
);

// Public: get single restaurant with menu and effective fee structure
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
  const pickupFee = getEffectiveFeeStructure(restaurant, 'PICKUP');
  const deliveryFee = getEffectiveFeeStructure(restaurant, 'DELIVERY');
  return res.json({
    ...restaurant,
    pickupFee,
    deliveryFee,
  });
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
    body('halalStatuses').isArray(),
    body('halalStatuses').custom((arr) => Array.isArray(arr) && arr.length >= 1).withMessage('At least one halal status required'),
    body('halalStatuses.*').isIn(HALAL_STATUS_VALUES),
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
        halalStatuses: data.halalStatuses as HalalStatus[],
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
    body('halalStatuses').optional().isArray(),
    body('halalStatuses').optional().custom((arr) => !Array.isArray(arr) || arr.length >= 1).withMessage('If provided, at least one halal status required'),
    body('halalStatuses.*').optional().isIn(HALAL_STATUS_VALUES),
    body('certificateUrl').optional().trim(),
    body('certificateExpiresAt').optional().isISO8601(),
    body('businessHours').optional().isObject(),
    body('offersPickup').optional().isBoolean(),
    body('offersDelivery').optional().isBoolean(),
    body('pickupFeeType').optional().isIn(['FLAT', 'PERCENT']),
    body('pickupFeeValue').optional().isInt({ min: 0 }),
    body('deliveryFeeType').optional().isIn(['FLAT', 'PERCENT']),
    body('deliveryFeeValue').optional().isInt({ min: 0 }),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const data = req.body as {
      pickupFeeType?: string | null;
      pickupFeeValue?: number | null;
      deliveryFeeType?: string | null;
      deliveryFeeValue?: number | null;
    };
    if (
      (data.pickupFeeType != null && data.pickupFeeValue == null) ||
      (data.pickupFeeType == null && data.pickupFeeValue != null)
    ) {
      return res.status(400).json({
        error: 'pickupFeeType and pickupFeeValue must both be set or both be null',
      });
    }
    if (
      (data.deliveryFeeType != null && data.deliveryFeeValue == null) ||
      (data.deliveryFeeType == null && data.deliveryFeeValue != null)
    ) {
      return res.status(400).json({
        error: 'deliveryFeeType and deliveryFeeValue must both be set or both be null',
      });
    }

    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        ...(req.body.name != null && { name: req.body.name }),
        ...(req.body.description !== undefined && { description: req.body.description || null }),
        ...(req.body.phone !== undefined && { phone: req.body.phone || null }),
        ...(req.body.address != null && { address: req.body.address }),
        ...(req.body.halalStatuses != null && { halalStatuses: req.body.halalStatuses as HalalStatus[] }),
        ...(req.body.certificateUrl !== undefined && { certificateUrl: req.body.certificateUrl || null }),
        ...(req.body.certificateExpiresAt !== undefined && {
          certificateExpiresAt: req.body.certificateExpiresAt
            ? new Date(req.body.certificateExpiresAt)
            : null,
        }),
        ...(req.body.businessHours !== undefined && { businessHours: req.body.businessHours }),
        ...(req.body.offersPickup !== undefined && { offersPickup: req.body.offersPickup }),
        ...(req.body.offersDelivery !== undefined && { offersDelivery: req.body.offersDelivery }),
        ...(data.pickupFeeType !== undefined && { pickupFeeType: data.pickupFeeType || null }),
        ...(data.pickupFeeValue !== undefined && { pickupFeeValue: data.pickupFeeValue ?? null }),
        ...(data.deliveryFeeType !== undefined && { deliveryFeeType: data.deliveryFeeType || null }),
        ...(data.deliveryFeeValue !== undefined && { deliveryFeeValue: data.deliveryFeeValue ?? null }),
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
    body('availableForPickup').optional().isBoolean(),
    body('availableForDelivery').optional().isBoolean(),
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
    const { name, description, price, imageUrl, isAvailable, availableForPickup, availableForDelivery, sortOrder } = req.body;
    const item = await prisma.menuItem.create({
      data: {
        categoryId: category.id,
        name,
        description: description || null,
        price,
        imageUrl: imageUrl || null,
        isAvailable: isAvailable ?? true,
        availableForPickup: availableForPickup ?? true,
        availableForDelivery: availableForDelivery ?? true,
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
    body('availableForPickup').optional().isBoolean(),
    body('availableForDelivery').optional().isBoolean(),
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
        ...(data.availableForPickup !== undefined && { availableForPickup: data.availableForPickup }),
        ...(data.availableForDelivery !== undefined && { availableForDelivery: data.availableForDelivery }),
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
