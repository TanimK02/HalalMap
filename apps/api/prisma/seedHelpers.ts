import type { HalalStatus } from '@prisma/client';

/** W3C dummy PDF — stable URL for “view certificate” demos in dashboard/admin. */
export const DEMO_HALAL_CERTIFICATE_PDF =
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

export function parseCaliforniaJurisdiction(address: string): { state: string; postalCode: string } {
  const m = address.match(/,\s*CA\s+(\d{5})\s*$/);
  if (m) return { state: 'CA', postalCode: m[1]! };
  return { state: 'CA', postalCode: '94110' };
}

export function certificateForHalalStatuses(statuses: HalalStatus[]): {
  certificateUrl: string | null;
  certificateExpiresAt: Date | null;
} {
  if (!statuses.includes('CERTIFIED_HALAL')) {
    return { certificateUrl: null, certificateExpiresAt: null };
  }
  return {
    certificateUrl: DEMO_HALAL_CERTIFICATE_PDF,
    certificateExpiresAt: new Date('2027-12-31T00:00:00.000Z'),
  };
}

/**
 * Unsplash — compact WEBP-style URLs for menu thumbnails (mobile list + dashboard).
 * Keyword routing keeps variety without hand-authoring 120+ image URLs.
 */
const IMG = {
  default:
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80&auto=format&fit=crop',
  burger:
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80&auto=format&fit=crop',
  chicken:
    'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&q=80&auto=format&fit=crop',
  biryani:
    'https://images.unsplash.com/photo-1589302168068-964664d93a0d?w=800&q=80&auto=format&fit=crop',
  curry:
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80&auto=format&fit=crop',
  noodles:
    'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80&auto=format&fit=crop',
  dumpling:
    'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=800&q=80&auto=format&fit=crop',
  bread:
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80&auto=format&fit=crop',
  salad:
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80&auto=format&fit=crop',
  grill:
    'https://images.unsplash.com/photo-1558030006-450675393462?w=800&q=80&auto=format&fit=crop',
  dessert:
    'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=80&auto=format&fit=crop',
  drink:
    'https://images.unsplash.com/photo-1544145945-f90425340c97?w=800&q=80&auto=format&fit=crop',
  soup:
    'https://images.unsplash.com/photo-1547592166-23abf45744cd?w=800&q=80&auto=format&fit=crop',
  fries:
    'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80&auto=format&fit=crop',
  wrap:
    'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80&auto=format&fit=crop',
  pizza:
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80&auto=format&fit=crop',
  fish:
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80&auto=format&fit=crop',
} as const;

export function imageUrlForMenuItem(categoryName: string, itemName: string): string {
  const s = `${categoryName} ${itemName}`.toLowerCase();

  if (s.includes('burger') || s.includes('cheeseburger')) return IMG.burger;
  if (s.includes('wrap') || s.includes('burrito') || s.includes('taco')) return IMG.wrap;
  if (s.includes('wings') || s.includes('tenders') || s.includes('nugget')) return IMG.chicken;
  if (s.includes('fries')) return IMG.fries;
  if (s.includes('biryani') || s.includes('tehari') || s.includes('polao') || s.includes('polo'))
    return IMG.biryani;
  if (s.includes('noodle') || s.includes('laghman') || s.includes('chow') || s.includes('ramen'))
    return IMG.noodles;
  if (s.includes('dumpling') || s.includes('wonton') || s.includes('fuchka')) return IMG.dumpling;
  if (s.includes('naan') || s.includes('roti') || s.includes('bread') || s.includes('pide'))
    return IMG.bread;
  if (s.includes('pizza')) return IMG.pizza;
  if (s.includes('fish') || s.includes('ilish') || s.includes('snapper')) return IMG.fish;
  if (
    s.includes('salad') ||
    s.includes('fattoush') ||
    s.includes('gomen') ||
    s.includes('tabbouleh')
  )
    return IMG.salad;
  if (
    s.includes('soup') ||
    s.includes('maraq') ||
    s.includes('bisque') ||
    s.includes('hot & sour')
  )
    return IMG.soup;
  if (
    s.includes('lassi') ||
    s.includes('tea') ||
    s.includes('juice') ||
    s.includes('drink') ||
    s.includes('ayran') ||
    s.includes('doogh') ||
    s.includes('coffee') ||
    s.includes('lemonade') ||
    s.includes('brew') ||
    s.includes('es cendol') ||
    s.includes('teh botol') ||
    s.includes('borhani')
  )
    return IMG.drink;
  if (
    s.includes('baklava') ||
    s.includes('kheer') ||
    s.includes('doi') ||
    s.includes('kulfi') ||
    s.includes('ice cream') ||
    s.includes('mishti') ||
    s.includes('rasmalai') ||
    s.includes('martabak')
  )
    return IMG.dessert;
  if (
    s.includes('kebab') ||
    s.includes('kebap') ||
    s.includes('shawarma') ||
    s.includes('grill') ||
    s.includes('tikka') ||
    s.includes('karahi') ||
    s.includes('koobideh') ||
    s.includes('seekh') ||
    s.includes('adana') ||
    s.includes('döner') ||
    s.includes('satay')
  )
    return IMG.grill;
  if (
    s.includes('curry') ||
    s.includes('masala') ||
    s.includes('bhuna') ||
    s.includes('rendang') ||
    s.includes('wat') ||
    s.includes('tibs') ||
    s.includes('ghormeh')
  )
    return IMG.curry;

  return IMG.default;
}

export const SEED_OWNER_DISPLAY_NAME: Record<string, string> = {
  'owner@halalmap.com': 'Zara Malik',
  'owner2@halalmap.com': 'Omar Rahman',
  'owner3@halalmap.com': 'Layla Haddad',
  'owner4@halalmap.com': 'Hassan Siddiqui',
  'owner5@halalmap.com': 'Wei Chen',
  'owner6@halalmap.com': 'Ranim Khoury',
  'owner7@halalmap.com': 'Emre Yilmaz',
  'owner8@halalmap.com': 'Dewi Santoso',
  'owner9@halalmap.com': 'Meron Tesfaye',
  'owner10@halalmap.com': 'Amina Osman',
  'owner11@halalmap.com': 'Parviz Rostami',
  'owner12@halalmap.com': 'Farida Chowdhury',
  'owner13@halalmap.com': 'Kenji & Adnan (pop-up)',
};
