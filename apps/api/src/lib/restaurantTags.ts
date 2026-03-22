import type { Prisma, PrismaClient } from '@prisma/client';

export const tagPublicSelect = {
  id: true,
  slug: true,
  label: true,
  sortOrder: true,
} as const;

export type PublicTag = {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
};

export type TagWithActive = PublicTag & { active: boolean };

export function sortPublicTags(tags: PublicTag[]): PublicTag[] {
  return [...tags].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

export function setsEqualString(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) {
    if (!b.has(x)) return false;
  }
  return true;
}

export async function getPublishedTagIds(
  tx: Prisma.TransactionClient | PrismaClient,
  restaurantId: string
): Promise<Set<string>> {
  const rows = await tx.restaurantPublishedTag.findMany({
    where: { restaurantId },
    select: { tagId: true },
  });
  return new Set(rows.map((r) => r.tagId));
}

export async function getDraftTagIds(
  tx: Prisma.TransactionClient | PrismaClient,
  restaurantId: string
): Promise<Set<string>> {
  const rows = await tx.restaurantTagDraft.findMany({
    where: { restaurantId },
    select: { tagId: true },
  });
  return new Set(rows.map((r) => r.tagId));
}

export function mapPublishedToPublicTags(
  rows: { tag: { id: string; slug: string; label: string; sortOrder: number; active: boolean } }[]
): PublicTag[] {
  return sortPublicTags(
    rows.filter((r) => r.tag.active).map((r) => ({
      id: r.tag.id,
      slug: r.tag.slug,
      label: r.tag.label,
      sortOrder: r.tag.sortOrder,
    }))
  );
}

/** When pending changes exist but draft rows are empty, the owner proposed clearing all tags. */
export function resolveDraftTagsForResponse(
  hasPendingTagChanges: boolean,
  publishedTags: PublicTag[],
  draftRows: { tag: { id: string; slug: string; label: string; sortOrder: number; active: boolean } }[]
): PublicTag[] {
  if (!hasPendingTagChanges) return publishedTags;
  if (draftRows.length > 0) return mapPublishedToPublicTags(draftRows);
  return [];
}

export function mapJoinToTagsWithActive(rows: { tag: TagWithActive }[]): TagWithActive[] {
  return [...rows]
    .map((r) => ({
      id: r.tag.id,
      slug: r.tag.slug,
      label: r.tag.label,
      sortOrder: r.tag.sortOrder,
      active: r.tag.active,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

export function resolveDraftTagsAdmin(
  hasPendingTagChanges: boolean,
  publishedTags: TagWithActive[],
  draftRows: { tag: TagWithActive }[]
): TagWithActive[] {
  if (!hasPendingTagChanges) return publishedTags;
  if (draftRows.length > 0) return mapJoinToTagsWithActive(draftRows);
  return [];
}
