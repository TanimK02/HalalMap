import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { getEffectiveFeeStructure } from '../lib/fees.js';
import { isDeliveryEnabled, isStripeConnectEnabled } from '../lib/config.js';
import Stripe from 'stripe';
import { geocode, haversineMiles } from '../lib/geocode.js';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth.js';
import { isS3Configured, getPresignedUploadUrl } from '../lib/s3.js';
import type { $Enums } from '@prisma/client';
import type { HalalStatus } from '@halal-map/shared';
import {
  getPublishedTagIds,
  mapPublishedToPublicTags,
  resolveDraftTagsForResponse,
  setsEqualString,
  tagPublicSelect,
} from '../lib/restaurantTags.js';

const HALAL_STATUS_VALUES: HalalStatus[] = [
  'CERTIFIED_HALAL', 'MUSLIM_OWNED', 'HALAL_FRIENDLY',
];

export const restaurantsRouter = Router();

const stripe =
  process.env.STRIPE_SECRET_KEY && isStripeConnectEnabled()
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

// Public: list approved restaurants (with optional filters and optional location sort)
restaurantsRouter.get(
  '/',
  [
    query('halalStatuses').optional().trim(),
    query('search').optional().trim(),
    query('tags').optional().trim(),
    query('lat').optional(),
    query('lng').optional(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const halalStatusesParam = (req.query.halalStatuses as string)?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
    const tagsParam = (req.query.tags as string)?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
    const search = req.query.search as string | undefined;
    const latParam = req.query.lat as string | undefined;
    const lngParam = req.query.lng as string | undefined;
    const lat = latParam != null ? parseFloat(latParam) : NaN;
    const lng = lngParam != null ? parseFloat(lngParam) : NaN;
    const useLocation = !Number.isNaN(lat) && !Number.isNaN(lng);

    if (halalStatusesParam.length > 0) {
      const invalid = halalStatusesParam.filter((s) => !HALAL_STATUS_VALUES.includes(s as HalalStatus));
      if (invalid.length > 0) {
        return res.status(400).json({ errors: [{ msg: `Invalid halal statuses: ${invalid.join(', ')}` }] });
      }
    }

    let filterTagIds: string[] = [];
    const uniqueTagTokens = [...new Set(tagsParam)];
    if (uniqueTagTokens.length > 0) {
      const resolvedIds: string[] = [];
      for (const token of uniqueTagTokens) {
        const t = await prisma.tag.findFirst({
          where: { active: true, OR: [{ id: token }, { slug: token }] },
          select: { id: true },
        });
        if (!t) {
          return res.status(400).json({ errors: [{ msg: `Invalid or inactive tag: ${token}` }] });
        }
        resolvedIds.push(t.id);
      }
      filterTagIds = [...new Set(resolvedIds)];
    }

    const whereParts: Prisma.RestaurantWhereInput[] = [{ approved: true }];
    if (halalStatusesParam.length > 0) {
      whereParts.push({
        halalStatuses: { hasEvery: halalStatusesParam as $Enums.HalalStatus[] },
      });
    }
    if (search) {
      whereParts.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          {
            publishedTags: {
              some: {
                tag: {
                  active: true,
                  OR: [
                    { label: { contains: search, mode: 'insensitive' } },
                    { slug: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            },
          },
        ],
      });
    }
    if (useLocation) {
      whereParts.push({ latitude: { not: null }, longitude: { not: null } });
    }
    for (const tid of filterTagIds) {
      whereParts.push({ publishedTags: { some: { tagId: tid } } });
    }
    const where: Prisma.RestaurantWhereInput =
      whereParts.length === 1 ? whereParts[0]! : { AND: whereParts };

    const select = {
      id: true,
      name: true,
      description: true,
      phone: true,
      address: true,
      halalStatuses: true,
      certificateExpiresAt: true,
      offersPickup: true,
      offersDelivery: true,
      businessHours: true,
      publishedTags: {
        where: { tag: { active: true } },
        select: { tag: { select: tagPublicSelect } },
      },
      ...(useLocation ? { latitude: true, longitude: true } : {}),
    };

    const restaurants = await prisma.restaurant.findMany({
      where,
      select,
      orderBy: useLocation ? undefined : { name: 'asc' },
    });

    const withTags = restaurants.map((r) => {
      const { publishedTags, ...rest } = r;
      return {
        ...rest,
        tags: mapPublishedToPublicTags(
          (publishedTags as { tag: { id: string; slug: string; label: string; sortOrder: number; active: boolean } }[]).map(
            (pt) => ({ tag: { ...pt.tag, active: true } })
          )
        ),
      };
    });

    if (useLocation && withTags.length > 0) {
      const withDistance = (
        withTags as (typeof withTags[0] & { latitude: number; longitude: number })[]
      ).map((r) => {
        const distanceMiles = Math.round(haversineMiles(lat, lng, r.latitude, r.longitude) * 100) / 100;
        const { latitude: _lat, longitude: _lng, ...rest } = r;
        return { ...rest, distanceMiles };
      });
      withDistance.sort((a, b) => a.distanceMiles - b.distanceMiles);
      return res.json(withDistance);
    }

    return res.json(withTags);
  }
);

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
        publishedTags: {
          include: {
            tag: { select: { ...tagPublicSelect, active: true } },
          },
        },
        tagDrafts: {
          include: {
            tag: { select: { ...tagPublicSelect, active: true } },
          },
        },
      },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const { publishedTags: pubRows, tagDrafts: draftRows, ...rest } = restaurant;
    const publishedTags = mapPublishedToPublicTags(
      pubRows.map((p) => ({ tag: p.tag as { id: string; slug: string; label: string; sortOrder: number; active: boolean } }))
    );
    const draftTags = resolveDraftTagsForResponse(
      restaurant.hasPendingTagChanges,
      publishedTags,
      draftRows.map((d) => ({
        tag: d.tag as { id: string; slug: string; label: string; sortOrder: number; active: boolean },
      }))
    );
    return res.json({
      ...rest,
      publishedTags,
      draftTags,
      hasPendingTagChanges: restaurant.hasPendingTagChanges,
    });
  }
);

// Owner: get presigned S3 upload URL for menu item image
restaurantsRouter.post(
  '/me/restaurant/upload-url',
  requireAuth,
  requireRole('RESTAURANT_OWNER'),
  [
    body('filename').trim().notEmpty().withMessage('filename is required'),
    body('contentType').trim().notEmpty().withMessage('contentType is required'),
  ],
  async (req: AuthRequest, res: Response) => {
    if (!isS3Configured()) {
      return res.status(503).json({ error: 'Image upload is not configured' });
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const { filename, contentType } = req.body as { filename: string; contentType: string };
    try {
      const { uploadUrl, publicUrl } = await getPresignedUploadUrl(
        `menu-items/${restaurant.id}`,
        filename,
        contentType
      );
      return res.json({ uploadUrl, publicUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate upload URL';
      return res.status(400).json({ error: message });
    }
  }
);

// Owner cannot create restaurant; only admins do via POST /admin/restaurants.

// Owner: ensure Stripe Connect account exists (idempotent) and return basic status
restaurantsRouter.post(
  '/me/stripe/connect',
  requireAuth,
  requireRole('RESTAURANT_OWNER'),
  async (req: AuthRequest, res: Response) => {
    if (!stripe || !isStripeConnectEnabled()) {
      return res.status(503).json({ error: 'Stripe Connect is not enabled' });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    let accountId = restaurant.stripeConnectAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        metadata: {
          restaurantId: restaurant.id,
        },
        business_type: 'company',
      });
      accountId = account.id;
      const updated = await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: {
          stripeConnectAccountId: account.id,
          stripeConnectStatus: 'ONBOARDING',
          stripeConnectLastSyncedAt: new Date(),
        },
      });
      return res.json({
        stripeConnectAccountId: updated.stripeConnectAccountId,
        stripeConnectStatus: updated.stripeConnectStatus,
      });
    }

    return res.json({
      stripeConnectAccountId: accountId,
      stripeConnectStatus: restaurant.stripeConnectStatus,
    });
  }
);

// Owner: create Stripe Connect onboarding or update link
restaurantsRouter.post(
  '/me/stripe/connect/link',
  requireAuth,
  requireRole('RESTAURANT_OWNER'),
  async (req: AuthRequest, res: Response) => {
    if (!stripe || !isStripeConnectEnabled()) {
      return res.status(503).json({ error: 'Stripe Connect is not enabled' });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    let accountId = restaurant.stripeConnectAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        metadata: {
          restaurantId: restaurant.id,
        },
        business_type: 'company',
      });
      accountId = account.id;
      await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: {
          stripeConnectAccountId: account.id,
          stripeConnectStatus: 'ONBOARDING',
          stripeConnectLastSyncedAt: new Date(),
        },
      });
    }

    const origin = process.env.CLIENT_ORIGIN_RESTAURANT ?? 'http://localhost:5174';
    const refreshUrl = `${origin}/profile?stripeOnboarding=interrupted`;
    const returnUrl = `${origin}/profile?stripeOnboarding=completed`;

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return res.json({ url: link.url });
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
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const feeBodyKeys = ['pickupFeeType', 'pickupFeeValue', 'deliveryFeeType', 'deliveryFeeValue'] as const;
    if (feeBodyKeys.some((k) => Object.prototype.hasOwnProperty.call(req.body, k))) {
      return res.status(403).json({
        error: 'Pickup and delivery fee settings can only be changed by an administrator.',
      });
    }

    let latLng: { latitude: number; longitude: number } | null = null;
    if (req.body.address != null) {
      latLng = await geocode(req.body.address);
    }

    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        ...(req.body.name != null && { name: req.body.name }),
        ...(req.body.description !== undefined && { description: req.body.description || null }),
        ...(req.body.phone !== undefined && { phone: req.body.phone || null }),
        ...(req.body.address != null && { address: req.body.address }),
        ...(req.body.address != null && (latLng != null ? { latitude: latLng.latitude, longitude: latLng.longitude } : { latitude: null, longitude: null })),
        ...(req.body.halalStatuses != null && {
          halalStatuses: req.body.halalStatuses as $Enums.HalalStatus[],
        }),
        ...(req.body.certificateUrl !== undefined && { certificateUrl: req.body.certificateUrl || null }),
        ...(req.body.certificateExpiresAt !== undefined && {
          certificateExpiresAt: req.body.certificateExpiresAt
            ? new Date(req.body.certificateExpiresAt)
            : null,
        }),
        ...(req.body.businessHours !== undefined && { businessHours: req.body.businessHours }),
        ...(req.body.offersPickup !== undefined && { offersPickup: req.body.offersPickup }),
        ...(req.body.offersDelivery !== undefined && { offersDelivery: req.body.offersDelivery }),
      },
    });
    return res.json(updated);
  }
);

// Owner: propose restaurant tags (draft; live tags unchanged until admin approves)
restaurantsRouter.put(
  '/me/restaurant/tags',
  requireAuth,
  requireRole('RESTAURANT_OWNER'),
  [
    body('tagIds').isArray().withMessage('tagIds must be an array'),
    body('tagIds.*').isString().notEmpty(),
  ],
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const rawIds = req.body.tagIds as string[];
    const tagIds = [...new Set(rawIds)];

    const restaurant = await prisma.restaurant.findUnique({
      where: { ownerId: req.userId! },
      select: { id: true },
    });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    if (tagIds.length > 0) {
      const tags = await prisma.tag.findMany({
        where: { id: { in: tagIds }, active: true },
        select: { id: true },
      });
      if (tags.length !== tagIds.length) {
        return res.status(400).json({ error: 'One or more tags are invalid or inactive' });
      }
    }

    await prisma.$transaction(async (tx) => {
      const published = await getPublishedTagIds(tx, restaurant.id);
      const proposed = new Set(tagIds);
      await tx.restaurantTagDraft.deleteMany({ where: { restaurantId: restaurant.id } });
      if (setsEqualString(published, proposed)) {
        await tx.restaurant.update({
          where: { id: restaurant.id },
          data: { hasPendingTagChanges: false },
        });
        return;
      }
      if (proposed.size > 0) {
        await tx.restaurantTagDraft.createMany({
          data: [...proposed].map((tagId) => ({ restaurantId: restaurant.id, tagId })),
        });
      }
      await tx.restaurant.update({
        where: { id: restaurant.id },
        data: { hasPendingTagChanges: true },
      });
    });

    const full = await prisma.restaurant.findUnique({
      where: { id: restaurant.id },
      include: {
        menuCategories: {
          orderBy: { sortOrder: 'asc' },
          include: { items: { orderBy: { sortOrder: 'asc' } } },
        },
        publishedTags: {
          include: {
            tag: { select: { ...tagPublicSelect, active: true } },
          },
        },
        tagDrafts: {
          include: {
            tag: { select: { ...tagPublicSelect, active: true } },
          },
        },
      },
    });
    if (!full) return res.status(404).json({ error: 'Restaurant not found' });
    const { publishedTags: pubRows, tagDrafts: draftRows, ...rest } = full;
    const publishedTags = mapPublishedToPublicTags(
      pubRows.map((p) => ({
        tag: p.tag as { id: string; slug: string; label: string; sortOrder: number; active: boolean },
      }))
    );
    const draftTags = resolveDraftTagsForResponse(
      full.hasPendingTagChanges,
      publishedTags,
      draftRows.map((d) => ({
        tag: d.tag as { id: string; slug: string; label: string; sortOrder: number; active: boolean },
      }))
    );
    return res.json({
      ...rest,
      publishedTags,
      draftTags,
      hasPendingTagChanges: full.hasPendingTagChanges,
    });
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

// Public: single restaurant by id (registered after /me/* so paths like /me are not captured as :id)
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
      publishedTags: {
        where: { tag: { active: true } },
        select: { tag: { select: tagPublicSelect } },
      },
    },
  });
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
  const { publishedTags, ...restaurantRest } = restaurant;
  const pickupFee = getEffectiveFeeStructure(restaurant, 'PICKUP');
  const deliveryFee = getEffectiveFeeStructure(restaurant, 'DELIVERY');
  const response = {
    ...restaurantRest,
    tags: mapPublishedToPublicTags(
      (publishedTags as { tag: { id: string; slug: string; label: string; sortOrder: number; active: boolean } }[]).map(
        (pt) => ({ tag: { ...pt.tag, active: true } })
      )
    ),
    pickupFee,
    deliveryFee,
  };
  if (!isDeliveryEnabled()) {
    response.offersDelivery = false;
    response.deliveryFee = { type: 'flat' as const, valueCents: 0 };
  }
  return res.json(response);
});
