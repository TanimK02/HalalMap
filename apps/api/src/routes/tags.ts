import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { sortPublicTags, tagPublicSelect } from '../lib/restaurantTags.js';

export const tagsRouter = Router();

// Public: list active tags for restaurant profile picker
tagsRouter.get('/', async (_req: Request, res: Response) => {
  const tags = await prisma.tag.findMany({
    where: { active: true },
    select: tagPublicSelect,
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return res.json(sortPublicTags(tags));
});
