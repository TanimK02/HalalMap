import {
  mapJoinToTagsWithActive,
  resolveDraftTagsAdmin,
  resolveDraftTagsForResponse,
  setsEqualString,
  sortPublicTags,
} from './restaurantTags.js';

describe('restaurantTags helpers', () => {
  it('compares sets correctly', () => {
    expect(setsEqualString(new Set(['a', 'b']), new Set(['b', 'a']))).toBe(true);
    expect(setsEqualString(new Set(['a']), new Set(['a', 'b']))).toBe(false);
  });

  it('sorts public tags by sortOrder then id', () => {
    const tags = sortPublicTags([
      { id: 'b', slug: 'b', label: 'B', sortOrder: 2 },
      { id: 'a', slug: 'a', label: 'A', sortOrder: 2 },
      { id: 'c', slug: 'c', label: 'C', sortOrder: 1 },
    ]);
    expect(tags.map((t) => t.id)).toEqual(['c', 'a', 'b']);
  });

  it('resolves draft tags for owner/admin responses', () => {
    const published = [{ id: '1', slug: 'one', label: 'One', sortOrder: 1 }];
    expect(resolveDraftTagsForResponse(false, published, [])).toEqual(published);
    expect(resolveDraftTagsForResponse(true, published, [])).toEqual([]);

    const mapped = mapJoinToTagsWithActive([
      { tag: { id: '2', slug: 'two', label: 'Two', sortOrder: 2, active: true } },
    ]);
    expect(resolveDraftTagsAdmin(true, [], [{ tag: mapped[0] }])).toEqual(mapped);
  });
});
