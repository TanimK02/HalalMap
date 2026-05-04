import { PrismaClient, type HalalStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Decimal } from '@prisma/client/runtime/library';
import { getEffectiveFeeCents, getPlatformFeeCents } from '../src/lib/fees.js';
import { getTaxCents } from '../src/lib/tax.js';
import {
  SEED_OWNER_DISPLAY_NAME,
  certificateForHalalStatuses,
  imageUrlForMenuItem,
  parseCaliforniaJurisdiction,
} from './seedHelpers.js';

const prisma = new PrismaClient();

type SeedMenuItem = {
  name: string;
  description: string;
  price: number;
  sortOrder: number;
  imageUrl?: string | null;
  isAvailable?: boolean;
  availableForPickup?: boolean;
  availableForDelivery?: boolean;
};

type SeedMenuCategory = {
  name: string;
  sortOrder: number;
  items: SeedMenuItem[];
};

async function main() {
  /** One canonical tag per seeded restaurant (re-runnable: replaces published tags for that row). */
  async function setRestaurantSeedTag(restaurantId: string, slug: string) {
    const tag = await prisma.tag.findUnique({ where: { slug } });
    if (!tag) {
      console.warn(`Seed: tag slug not found: ${slug}`);
      return;
    }
    await prisma.restaurantPublishedTag.deleteMany({ where: { restaurantId } });
    await prisma.restaurantPublishedTag.create({
      data: { restaurantId, tagId: tag.id },
    });
  }

  async function seedMenuIfEmpty(
    restaurantId: string,
    categories: SeedMenuCategory[],
    offersPickup: boolean,
    offersDelivery: boolean,
  ) {
    const existing = await prisma.menuCategory.count({ where: { restaurantId } });
    if (existing > 0) return;

    for (const cat of categories) {
      const created = await prisma.menuCategory.create({
        data: {
          restaurantId,
          name: cat.name,
          sortOrder: cat.sortOrder,
        },
      });
      for (const item of cat.items) {
        const imageUrl = item.imageUrl ?? imageUrlForMenuItem(cat.name, item.name);
        await prisma.menuItem.create({
          data: {
            categoryId: created.id,
            name: item.name,
            description: item.description,
            price: item.price,
            imageUrl,
            isAvailable: item.isAvailable ?? true,
            availableForPickup: item.availableForPickup ?? offersPickup,
            availableForDelivery: item.availableForDelivery ?? offersDelivery,
            sortOrder: item.sortOrder,
          },
        });
      }
    }
  }

  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@halalmap.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@halalmap.com',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });
  console.log('Admin user:', admin.email);

  const tagDefs = [
    { slug: 'indian', label: 'Indian', sortOrder: 0 },
    { slug: 'pakistani', label: 'Pakistani', sortOrder: 1 },
    { slug: 'middle-eastern', label: 'Middle Eastern', sortOrder: 2 },
    { slug: 'fast-food', label: 'Fast food', sortOrder: 3 },
    { slug: 'family-friendly', label: 'Family-friendly', sortOrder: 4 },
    { slug: 'lebanese', label: 'Lebanese', sortOrder: 5 },
    { slug: 'turkish', label: 'Turkish', sortOrder: 6 },
    { slug: 'afghan', label: 'Afghan', sortOrder: 7 },
    { slug: 'bangladeshi', label: 'Bangladeshi', sortOrder: 8 },
    { slug: 'somali', label: 'Somali', sortOrder: 9 },
    { slug: 'persian', label: 'Persian', sortOrder: 10 },
    { slug: 'fusion', label: 'Fusion', sortOrder: 11 },
    { slug: 'indonesian', label: 'Indonesian', sortOrder: 12 },
    { slug: 'american', label: 'American', sortOrder: 13 },
    { slug: 'african', label: 'African', sortOrder: 14 },
    { slug: 'chinese', label: 'Chinese', sortOrder: 15 },
    { slug: 'malaysian', label: 'Malaysian', sortOrder: 16 },
    { slug: 'mexican', label: 'Mexican', sortOrder: 17 },
  ];
  for (const t of tagDefs) {
    await prisma.tag.upsert({
      where: { slug: t.slug },
      update: { label: t.label, sortOrder: t.sortOrder, active: true },
      create: { slug: t.slug, label: t.label, sortOrder: t.sortOrder },
    });
  }

  const ownerHash = await bcrypt.hash('owner123', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@halalmap.com' },
    update: { name: SEED_OWNER_DISPLAY_NAME['owner@halalmap.com']! },
    create: {
      name: SEED_OWNER_DISPLAY_NAME['owner@halalmap.com']!,
      email: 'owner@halalmap.com',
      passwordHash: ownerHash,
      role: 'RESTAURANT_OWNER',
    },
  });

  let restaurant = await prisma.restaurant.findUnique({
    where: { ownerId: owner.id },
  });
  const seedCoords = { latitude: 37.7749, longitude: -122.4194 };
  const primaryAddress = '2500 Mission St, San Francisco, CA 94110';
  const primaryJur = parseCaliforniaJurisdiction(primaryAddress);
  const primaryCert = certificateForHalalStatuses(['CERTIFIED_HALAL']);
  const seedBusinessHours = {
    mon: { open: '09:00', close: '21:00' },
    tue: { open: '09:00', close: '21:00' },
    wed: { open: '09:00', close: '21:00' },
    thu: { open: '09:00', close: '21:00' },
    fri: { open: '09:00', close: '21:00' },
    sat: { open: '09:00', close: '21:00' },
    sun: { open: '09:00', close: '21:00' },
  };

  const PRIMARY_INDIAN_MENU: SeedMenuCategory[] = [
    {
      name: 'Curries & rice',
      sortOrder: 0,
      items: [
        {
          name: 'Chicken Biryani',
          description: 'Basmati layered with halal chicken, fried onions, and warm spices.',
          price: 14.99,
          sortOrder: 0,
        },
        {
          name: 'Butter Chicken',
          description: 'Tandoori chicken in a tomato-cream sauce; mild and kid-friendly.',
          price: 15.49,
          sortOrder: 1,
        },
        {
          name: 'Lamb Karahi',
          description: 'Bone-in lamb cooked in the karahi with ginger, tomato, and green chili.',
          price: 16.99,
          sortOrder: 2,
        },
        {
          name: 'Chana Masala',
          description: 'Chickpeas simmered with onions, tomatoes, and garam masala.',
          price: 12.99,
          sortOrder: 3,
        },
        {
          name: 'Palak Paneer',
          description: 'Fresh cheese cubes in seasoned spinach; vegetarian.',
          price: 13.99,
          sortOrder: 4,
        },
      ],
    },
    {
      name: 'Tandoor & bread',
      sortOrder: 1,
      items: [
        {
          name: 'Chicken Tikka Platter',
          description: 'Charcoal-roasted halal chicken thigh with mint chutney and salad.',
          price: 14.49,
          sortOrder: 0,
        },
        {
          name: 'Garlic Naan',
          description: 'Leavened bread brushed with garlic butter.',
          price: 3.49,
          sortOrder: 1,
        },
        {
          name: 'Plain Naan',
          description: 'Classic tandoor naan.',
          price: 2.99,
          sortOrder: 2,
        },
      ],
    },
    {
      name: 'Snacks & drinks',
      sortOrder: 2,
      items: [
        {
          name: 'Vegetable Samosas (2)',
          description: 'Crisp pastries with spiced potatoes and peas.',
          price: 5.99,
          sortOrder: 0,
        },
        {
          name: 'Mango Lassi',
          description: 'Sweet yogurt drink with mango.',
          price: 4.49,
          sortOrder: 1,
          isAvailable: false,
        },
      ],
    },
  ];

  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: {
        ownerId: owner.id,
        name: 'Spice Route Halal',
        description:
          'Certified halal North Indian and Pakistani-style curries, tandoor, and fresh naan.',
        phone: '+14155550123',
        address: primaryAddress,
        state: primaryJur.state,
        postalCode: primaryJur.postalCode,
        ...seedCoords,
        halalStatuses: ['CERTIFIED_HALAL'],
        ...primaryCert,
        approved: true,
        businessHours: seedBusinessHours,
        offersPickup: true,
        offersDelivery: true,
        pickupFeeType: null,
        pickupFeeValue: null,
        deliveryFeeType: null,
        deliveryFeeValue: null,
      },
    });
  } else {
    const updates: {
      latitude?: number;
      longitude?: number;
      businessHours?: object;
      name?: string;
      description?: string | null;
      phone?: string | null;
      address?: string;
      state?: string;
      postalCode?: string;
      certificateUrl?: string | null;
      certificateExpiresAt?: Date | null;
    } = {
      name: 'Spice Route Halal',
      description:
        'Certified halal North Indian and Pakistani-style curries, tandoor, and fresh naan.',
      phone: '+14155550123',
      address: primaryAddress,
      state: primaryJur.state,
      postalCode: primaryJur.postalCode,
      ...primaryCert,
    };
    if (restaurant.latitude == null || restaurant.longitude == null) {
      updates.latitude = seedCoords.latitude;
      updates.longitude = seedCoords.longitude;
    }
    if (restaurant.businessHours == null) {
      updates.businessHours = seedBusinessHours;
    }
    restaurant = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: updates,
    });
  }

  await setRestaurantSeedTag(restaurant.id, 'indian');
  await seedMenuIfEmpty(restaurant.id, PRIMARY_INDIAN_MENU, true, true);

  // Fremont-area seed restaurants: varied business hours, halal statuses, service options
  const standardHours = {
    mon: { open: '09:00', close: '21:00' },
    tue: { open: '09:00', close: '21:00' },
    wed: { open: '09:00', close: '21:00' },
    thu: { open: '09:00', close: '21:00' },
    fri: { open: '09:00', close: '21:00' },
    sat: { open: '09:00', close: '21:00' },
    sun: { open: '09:00', close: '21:00' },
  };
  const closedSunday = {
    mon: { open: '09:00', close: '21:00' },
    tue: { open: '09:00', close: '21:00' },
    wed: { open: '09:00', close: '21:00' },
    thu: { open: '09:00', close: '21:00' },
    fri: { open: '09:00', close: '21:00' },
    sat: { open: '09:00', close: '21:00' },
  };
  const weekendLater = {
    mon: { open: '11:00', close: '21:00' },
    tue: { open: '11:00', close: '21:00' },
    wed: { open: '11:00', close: '21:00' },
    thu: { open: '11:00', close: '21:00' },
    fri: { open: '11:00', close: '22:00' },
    sat: { open: '10:00', close: '23:00' },
    sun: { open: '10:00', close: '22:00' },
  };
  const lunchOnly = {
    mon: { open: '11:00', close: '15:00' },
    tue: { open: '11:00', close: '15:00' },
    wed: { open: '11:00', close: '15:00' },
    thu: { open: '11:00', close: '15:00' },
    fri: { open: '11:00', close: '15:00' },
    sat: { open: '11:00', close: '15:00' },
  };
  const lateNight = {
    mon: { open: '09:00', close: '23:00' },
    tue: { open: '09:00', close: '23:00' },
    wed: { open: '09:00', close: '23:00' },
    thu: { open: '09:00', close: '23:00' },
    fri: { open: '09:00', close: '00:00' },
    sat: { open: '09:00', close: '00:00' },
    sun: { open: '09:00', close: '22:00' },
  };
  const overnight = {
    mon: { open: '18:00', close: '02:00' },
    tue: { open: '18:00', close: '02:00' },
    wed: { open: '18:00', close: '02:00' },
    thu: { open: '18:00', close: '02:00' },
    fri: { open: '18:00', close: '02:00' },
    sat: { open: '18:00', close: '02:00' },
    sun: { open: '18:00', close: '02:00' },
  };
  const twentyFourHour = {
    mon: { open: '00:00', close: '23:59' },
    tue: { open: '00:00', close: '23:59' },
    wed: { open: '00:00', close: '23:59' },
    thu: { open: '00:00', close: '23:59' },
    fri: { open: '00:00', close: '23:59' },
    sat: { open: '00:00', close: '23:59' },
    sun: { open: '00:00', close: '23:59' },
  };
  const friSatSunOnly = {
    fri: { open: '11:00', close: '22:00' },
    sat: { open: '11:00', close: '22:00' },
    sun: { open: '11:00', close: '21:00' },
  };

  const FREMONT_RESTAURANTS: {
    ownerEmail: string;
    name: string;
    description?: string;
    phone?: string;
    address: string;
    latitude: number;
    longitude: number;
    businessHours: Record<string, { open: string; close: string }> | null;
    halalStatuses: HalalStatus[];
    approved: boolean;
    offersPickup: boolean;
    offersDelivery: boolean;
    pickupFeeType: string | null;
    pickupFeeValue: number | null;
    deliveryFeeType: string | null;
    deliveryFeeValue: number | null;
  }[] = [
    {
      ownerEmail: 'owner2@halalmap.com',
      name: 'Bay Halal Burgers',
      description:
        'All-beef and chicken sandwiches, hand-cut fries, and wings—halal certified, American diner style.',
      phone: '+15105551234',
      address: '3700 Thornton Ave, Fremont, CA 94536',
      latitude: 37.5485,
      longitude: -121.9886,
      businessHours: standardHours,
      halalStatuses: ['CERTIFIED_HALAL'],
      approved: true,
      offersPickup: true,
      offersDelivery: true,
      pickupFeeType: null,
      pickupFeeValue: null,
      deliveryFeeType: 'FLAT',
      deliveryFeeValue: 299,
    },
    {
      ownerEmail: 'owner3@halalmap.com',
      name: 'Niles Shawarma & Grill',
      description: 'Levantine-style shawarma plates, wraps, and charcoal-grilled kebabs—Muslim-owned.',
      phone: '+15105551235',
      address: '37699 Niles Blvd, Fremont, CA 94536',
      latitude: 37.583,
      longitude: -121.975,
      businessHours: closedSunday,
      halalStatuses: ['MUSLIM_OWNED'],
      approved: true,
      offersPickup: true,
      offersDelivery: true,
      pickupFeeType: null,
      pickupFeeValue: null,
      deliveryFeeType: null,
      deliveryFeeValue: null,
    },
    {
      ownerEmail: 'owner4@halalmap.com',
      name: 'Pindi BBQ & Karahi',
      description: 'Halal chicken and lamb karahi, chapli kabab, and naan from a Pakistani grill menu.',
      address: '46550 Kato Rd, Fremont, CA 94538',
      latitude: 37.502,
      longitude: -121.939,
      businessHours: weekendLater,
      halalStatuses: ['CERTIFIED_HALAL', 'MUSLIM_OWNED'],
      approved: true,
      offersPickup: true,
      offersDelivery: true,
      pickupFeeType: null,
      pickupFeeValue: null,
      deliveryFeeType: null,
      deliveryFeeValue: null,
    },
    {
      ownerEmail: 'owner5@halalmap.com',
      name: 'Lanzhou Express Halal',
      description:
        'Hand-pulled noodles and dumplings—no pork, halal beef and chicken; lunch bowls and soup.',
      address: '35001 Newark Blvd, Newark, CA 94560',
      latitude: 37.5485,
      longitude: -122.04,
      businessHours: lunchOnly,
      halalStatuses: ['HALAL_FRIENDLY'],
      approved: true,
      offersPickup: true,
      offersDelivery: false,
      pickupFeeType: null,
      pickupFeeValue: null,
      deliveryFeeType: null,
      deliveryFeeValue: null,
    },
    {
      ownerEmail: 'owner6@halalmap.com',
      name: 'Beirut Street Cafe',
      description: 'Lebanese mezze, grilled meats, and fresh manakish for dinner and late-night.',
      phone: '+15105551236',
      address: '31680 Alvarado Blvd, Union City, CA 94587',
      latitude: 37.596,
      longitude: -122.019,
      businessHours: lateNight,
      halalStatuses: ['HALAL_FRIENDLY'],
      approved: true,
      offersPickup: true,
      offersDelivery: true,
      pickupFeeType: 'FLAT',
      pickupFeeValue: 0,
      deliveryFeeType: 'FLAT',
      deliveryFeeValue: 399,
    },
    {
      ownerEmail: 'owner7@halalmap.com',
      name: 'Bosphorus Kebap House',
      description: 'Halal döner, Adana kebab, and Turkish breakfast plates until late.',
      address: '22400 Foothill Blvd, Hayward, CA 94541',
      latitude: 37.52,
      longitude: -122.05,
      businessHours: overnight,
      halalStatuses: ['MUSLIM_OWNED'],
      approved: true,
      offersPickup: true,
      offersDelivery: true,
      pickupFeeType: null,
      pickupFeeValue: null,
      deliveryFeeType: null,
      deliveryFeeValue: null,
    },
    {
      ownerEmail: 'owner8@halalmap.com',
      name: 'Warung Nusantara',
      description: 'Certified halal Indonesian: mie ayam, satay, rendang, and nasi goreng—open 24 hours.',
      phone: '+15105551237',
      address: '1277 S Park Victoria Dr, Milpitas, CA 95035',
      latitude: 37.454,
      longitude: -121.972,
      businessHours: twentyFourHour,
      halalStatuses: ['CERTIFIED_HALAL'],
      approved: true,
      offersPickup: true,
      offersDelivery: true,
      pickupFeeType: null,
      pickupFeeValue: null,
      deliveryFeeType: null,
      deliveryFeeValue: null,
    },
    {
      ownerEmail: 'owner9@halalmap.com',
      name: 'Habesha Halal Kitchen',
      description: 'Ethiopian-style injera platters and mild stews—all halal meats, vegan options.',
      address: '6000 Stevenson Blvd, Fremont, CA 94538',
      latitude: 37.535,
      longitude: -121.97,
      businessHours: null,
      halalStatuses: ['HALAL_FRIENDLY'],
      approved: true,
      offersPickup: false,
      offersDelivery: false,
      pickupFeeType: null,
      pickupFeeValue: null,
      deliveryFeeType: null,
      deliveryFeeValue: null,
    },
    {
      ownerEmail: 'owner10@halalmap.com',
      name: 'Xamar Rice & Tea',
      description: 'East African halal comfort food: rice platters, goat, pasta suugo—open Fri–Sun.',
      address: '39100 Paseo Padre Pkwy, Fremont, CA 94538',
      latitude: 37.545,
      longitude: -121.995,
      businessHours: friSatSunOnly,
      halalStatuses: ['HALAL_FRIENDLY'],
      approved: true,
      offersPickup: true,
      offersDelivery: true,
      pickupFeeType: null,
      pickupFeeValue: null,
      deliveryFeeType: null,
      deliveryFeeValue: null,
    },
    {
      ownerEmail: 'owner11@halalmap.com',
      name: 'Shiraz Grill House',
      description: 'Halal koobideh, joojeh, and saffron rice—pickup from our charcoal kitchen.',
      address: '39700 Balentine Dr, Newark, CA 94560',
      latitude: 37.542,
      longitude: -122.03,
      businessHours: standardHours,
      halalStatuses: ['CERTIFIED_HALAL'],
      approved: true,
      offersPickup: true,
      offersDelivery: false,
      pickupFeeType: null,
      pickupFeeValue: null,
      deliveryFeeType: null,
      deliveryFeeValue: null,
    },
    {
      ownerEmail: 'owner12@halalmap.com',
      name: 'Sonargaon Kitchen',
      description: 'Bangladeshi halal biryani, bhuna, and fish curry—delivery-focused.',
      address: '34700 Ardenwood Blvd, Fremont, CA 94555',
      latitude: 37.555,
      longitude: -122.045,
      businessHours: standardHours,
      halalStatuses: ['MUSLIM_OWNED'],
      approved: true,
      offersPickup: false,
      offersDelivery: true,
      pickupFeeType: null,
      pickupFeeValue: null,
      deliveryFeeType: 'FLAT',
      deliveryFeeValue: 199,
    },
    {
      ownerEmail: 'owner13@halalmap.com',
      name: 'Silk Road Fusion Lab',
      description: 'Unapproved test listing: Korean-taco meets desi spices—admin review demo.',
      address: '36160 Fremont Blvd, Fremont, CA 94536',
      latitude: 37.552,
      longitude: -121.982,
      businessHours: standardHours,
      halalStatuses: ['HALAL_FRIENDLY'],
      approved: false,
      offersPickup: true,
      offersDelivery: true,
      pickupFeeType: null,
      pickupFeeValue: null,
      deliveryFeeType: null,
      deliveryFeeValue: null,
    },
  ];

  /** Unique tag per Fremont-area seed restaurant (owner email → tag slug). */
  const SEED_TAG_BY_OWNER_EMAIL: Record<string, string> = {
    'owner2@halalmap.com': 'american',
    'owner3@halalmap.com': 'middle-eastern',
    'owner4@halalmap.com': 'pakistani',
    'owner5@halalmap.com': 'chinese',
    'owner6@halalmap.com': 'lebanese',
    'owner7@halalmap.com': 'turkish',
    'owner8@halalmap.com': 'indonesian',
    'owner9@halalmap.com': 'african',
    'owner10@halalmap.com': 'somali',
    'owner11@halalmap.com': 'persian',
    'owner12@halalmap.com': 'bangladeshi',
    'owner13@halalmap.com': 'fusion',
  };

  const MENUS_BY_OWNER_EMAIL: Record<string, SeedMenuCategory[]> = {
    'owner2@halalmap.com': [
      {
        name: 'Burgers & sandwiches',
        sortOrder: 0,
        items: [
          {
            name: 'Double Halal Cheeseburger',
            description: 'Two certified halal beef patties, American cheese, pickles, special sauce.',
            price: 11.99,
            sortOrder: 0,
          },
          {
            name: 'Nashville Hot Chicken Sandwich',
            description: 'Crispy halal thigh, cayenne oil, slaw, brioche.',
            price: 12.49,
            sortOrder: 1,
          },
          {
            name: 'BBQ Brisket Sandwich',
            description: 'Slow-smoked halal brisket, tangy BBQ, crispy onions.',
            price: 13.99,
            sortOrder: 2,
          },
          {
            name: 'Grilled Chicken Caesar Wrap',
            description: 'Halal chicken, romaine, parmesan, Caesar in a flour tortilla.',
            price: 10.99,
            sortOrder: 3,
          },
        ],
      },
      {
        name: 'Plates & sides',
        sortOrder: 1,
        items: [
          {
            name: 'Crispy Tenders (5 pc)',
            description: 'Hand-breaded halal chicken with ranch.',
            price: 9.99,
            sortOrder: 0,
          },
          {
            name: 'Buffalo Wings (10 pc)',
            description: 'Halal wings tossed in buffalo sauce; celery and blue cheese dip.',
            price: 12.99,
            sortOrder: 1,
          },
          {
            name: 'Chili Cheese Fries',
            description: 'Halal beef chili, cheddar, jalapeños.',
            price: 8.49,
            sortOrder: 2,
          },
          {
            name: 'Sweet Potato Fries',
            description: 'Crinkle-cut, lightly salted.',
            price: 4.99,
            sortOrder: 3,
          },
        ],
      },
      {
        name: 'Kids & drinks',
        sortOrder: 2,
        items: [
          {
            name: 'Kids Nuggets Meal',
            description: '4 halal nuggets, fries, small drink.',
            price: 7.99,
            sortOrder: 0,
          },
          {
            name: 'Large Fountain Drink',
            description: 'Refillable soda or iced tea.',
            price: 2.99,
            sortOrder: 1,
            availableForDelivery: false,
          },
        ],
      },
    ],
    'owner3@halalmap.com': [
      {
        name: 'Shawarma & plates',
        sortOrder: 0,
        items: [
          {
            name: 'Chicken Shawarma Plate',
            description: 'Marinated halal chicken, garlic sauce, rice, salad, pickles.',
            price: 14.99,
            sortOrder: 0,
          },
          {
            name: 'Beef Shawarma Wrap',
            description: 'Thin-sliced halal beef, tahini, tomatoes, in saj bread.',
            price: 11.99,
            sortOrder: 1,
          },
          {
            name: 'Mixed Shawarma Platter',
            description: 'Chicken and beef shawarma with hummus and rice.',
            price: 17.49,
            sortOrder: 2,
          },
          {
            name: 'Lamb Kabab Plate',
            description: 'Charcoal-grilled ground lamb skewers, rice, grilled vegetables.',
            price: 16.99,
            sortOrder: 3,
          },
        ],
      },
      {
        name: 'Mezze',
        sortOrder: 1,
        items: [
          {
            name: 'Hummus & Pita',
            description: 'Chickpea dip with warm pita bread.',
            price: 6.99,
            sortOrder: 0,
          },
          {
            name: 'Falafel Plate',
            description: 'Crispy chickpea fritters, tahini, salad, pickles.',
            price: 10.99,
            sortOrder: 1,
          },
          {
            name: 'Baba Ganoush',
            description: 'Smoky eggplant dip with olive oil.',
            price: 7.49,
            sortOrder: 2,
          },
        ],
      },
      {
        name: 'Drinks',
        sortOrder: 2,
        items: [
          {
            name: 'Fresh Mint Lemonade',
            description: 'House-squeezed lemon with mint.',
            price: 3.99,
            sortOrder: 0,
          },
          {
            name: 'Turkish Coffee',
            description: 'Small cup, lightly sweetened.',
            price: 3.49,
            sortOrder: 1,
          },
          {
            name: 'Ayran',
            description: 'Chilled yogurt drink.',
            price: 2.99,
            sortOrder: 2,
          },
        ],
      },
    ],
    'owner4@halalmap.com': [
      {
        name: 'Karahi & handi',
        sortOrder: 0,
        items: [
          {
            name: 'Chicken Karahi (half)',
            description: 'Halal chicken on the bone with tomato, ginger, and green chili.',
            price: 18.99,
            sortOrder: 0,
          },
          {
            name: 'Lamb Karahi (half)',
            description: 'Bone-in lamb cooked in the karahi—medium spicy.',
            price: 21.99,
            sortOrder: 1,
          },
          {
            name: 'Chapli Kabab (4 pc)',
            description: 'Peshawari-style spiced beef patties with chutney.',
            price: 14.49,
            sortOrder: 2,
          },
          {
            name: 'Seekh Kabab Plate',
            description: 'Minced halal beef skewers with onion salad and chutney.',
            price: 15.99,
            sortOrder: 3,
          },
        ],
      },
      {
        name: 'Rice & bread',
        sortOrder: 1,
        items: [
          {
            name: 'Chicken Biryani',
            description: 'Fragrant basmati with halal chicken and potatoes.',
            price: 13.99,
            sortOrder: 0,
          },
          {
            name: 'Garlic Naan',
            description: 'Wood-fired naan with garlic butter.',
            price: 3.25,
            sortOrder: 1,
          },
          {
            name: 'Roti (2)',
            description: 'Whole wheat flatbread.',
            price: 2.5,
            sortOrder: 2,
          },
        ],
      },
      {
        name: 'Extras',
        sortOrder: 2,
        items: [
          {
            name: 'Mixed Grill Platter',
            description: 'Chicken tikka, seekh, and chapli with rice.',
            price: 22.99,
            sortOrder: 0,
          },
          {
            name: 'Raita',
            description: 'Cool yogurt with cucumber.',
            price: 2.99,
            sortOrder: 1,
          },
          {
            name: 'Kheer',
            description: 'Cardamom rice pudding dessert.',
            price: 4.99,
            sortOrder: 2,
          },
        ],
      },
    ],
    'owner5@halalmap.com': [
      {
        name: 'Noodles & rice',
        sortOrder: 0,
        items: [
          {
            name: 'Hand-Pulled Laghman',
            description: 'Fresh noodles with halal lamb, peppers, and soy-chili sauce.',
            price: 13.99,
            sortOrder: 0,
          },
          {
            name: 'Beef Chow Fun',
            description: 'Wide rice noodles wok-seared with halal beef and bean sprouts.',
            price: 12.99,
            sortOrder: 1,
          },
          {
            name: 'Chicken Fried Rice',
            description: 'Halal chicken, egg, peas, and scallions.',
            price: 11.49,
            sortOrder: 2,
          },
          {
            name: 'Cumin Lamb Skewers (4)',
            description: 'Northern-style lamb with cumin and chili.',
            price: 14.99,
            sortOrder: 3,
          },
        ],
      },
      {
        name: 'Dumplings & soup',
        sortOrder: 1,
        items: [
          {
            name: 'Beef Dumplings (10)',
            description: 'Halal beef and cabbage; chili oil on the side.',
            price: 10.99,
            sortOrder: 0,
          },
          {
            name: 'Hot & Sour Soup',
            description: 'Classic soup with tofu and egg—no pork.',
            price: 4.99,
            sortOrder: 1,
          },
          {
            name: 'Wonton Soup (halal chicken)',
            description: 'Clear broth with chicken wontons and greens.',
            price: 6.49,
            sortOrder: 2,
          },
        ],
      },
      {
        name: 'Vegetables & drinks',
        sortOrder: 2,
        items: [
          {
            name: 'Dry-Fried Green Beans',
            description: 'Blistered beans with garlic and dried chili.',
            price: 9.49,
            sortOrder: 0,
          },
          {
            name: 'Scallion Pancake',
            description: 'Crispy layered pancake with scallions.',
            price: 5.99,
            sortOrder: 1,
          },
          {
            name: 'Jasmine Tea (pot)',
            description: 'Hot tea for the table.',
            price: 3.99,
            sortOrder: 2,
          },
        ],
      },
    ],
    'owner6@halalmap.com': [
      {
        name: 'Grill',
        sortOrder: 0,
        items: [
          {
            name: 'Mixed Grill for Two',
            description: 'Kafta, tawook, and lamb chops with garlic sauce and rice.',
            price: 38.99,
            sortOrder: 0,
          },
          {
            name: 'Chicken Tawook Plate',
            description: 'Marinated halal breast skewers, hummus, pickles, rice.',
            price: 16.99,
            sortOrder: 1,
          },
          {
            name: 'Kafta Kabab',
            description: 'Ground beef and parsley skewers, tahini, salad.',
            price: 15.49,
            sortOrder: 2,
          },
          {
            name: 'Lamb Chops (4)',
            description: 'Charcoal-grilled halal chops with herb butter.',
            price: 24.99,
            sortOrder: 3,
          },
        ],
      },
      {
        name: 'Cold mezze',
        sortOrder: 1,
        items: [
          {
            name: 'Mezze Trio',
            description: 'Hummus, moutabal, labneh with pita.',
            price: 14.99,
            sortOrder: 0,
          },
          {
            name: 'Fattoush Salad',
            description: 'Tossed greens, sumac, crispy pita chips.',
            price: 9.99,
            sortOrder: 1,
          },
          {
            name: 'Stuffed Grape Leaves',
            description: 'Rice and herbs; vegetarian.',
            price: 7.99,
            sortOrder: 2,
          },
        ],
      },
      {
        name: 'Breads & sweets',
        sortOrder: 2,
        items: [
          {
            name: 'Zaatar Manakish',
            description: 'Oven flatbread with thyme-zaatar blend.',
            price: 8.99,
            sortOrder: 0,
          },
          {
            name: 'Cheese Manakish',
            description: 'Akawi cheese melt with sesame seeds.',
            price: 9.49,
            sortOrder: 1,
          },
          {
            name: 'Baklava (4 pc)',
            description: 'Pistachio phyllo with rose syrup.',
            price: 6.99,
            sortOrder: 2,
          },
        ],
      },
    ],
    'owner7@halalmap.com': [
      {
        name: 'Kebaps',
        sortOrder: 0,
        items: [
          {
            name: 'Adana Kebap Plate',
            description: 'Spiced halal lamb skewer with bulgur pilaf and grilled peppers.',
            price: 18.99,
            sortOrder: 0,
          },
          {
            name: 'Urfa Kebap',
            description: 'Mild minced lamb skewer with sumac onion salad.',
            price: 17.99,
            sortOrder: 1,
          },
          {
            name: 'Iskender',
            description: 'Döner over bread cubes with tomato sauce and yogurt.',
            price: 19.49,
            sortOrder: 2,
          },
          {
            name: 'Chicken Shish',
            description: 'Halal chicken cubes, rice, grilled tomato and pepper.',
            price: 16.49,
            sortOrder: 3,
          },
        ],
      },
      {
        name: 'Döner & pide',
        sortOrder: 1,
        items: [
          {
            name: 'Beef Döner Wrap',
            description: 'Thin-sliced halal beef with yogurt sauce in lavash.',
            price: 11.99,
            sortOrder: 0,
          },
          {
            name: 'Kasarli Pide',
            description: 'Boat-shaped flatbread with beef and kashar cheese.',
            price: 14.99,
            sortOrder: 1,
          },
          {
            name: 'Lahmacun (2)',
            description: 'Thin crisp rounds with spiced halal beef topping.',
            price: 9.99,
            sortOrder: 2,
          },
        ],
      },
      {
        name: 'Breakfast & drinks',
        sortOrder: 2,
        items: [
          {
            name: 'Turkish Breakfast',
            description: 'Olives, cheese, jam, egg, sucuk (halal beef), bread.',
            price: 17.99,
            sortOrder: 0,
          },
          {
            name: 'Ayran',
            description: 'Salted yogurt drink.',
            price: 2.99,
            sortOrder: 1,
          },
          {
            name: 'Turkish Tea',
            description: 'Black tea in traditional glass.',
            price: 2.49,
            sortOrder: 2,
          },
        ],
      },
    ],
    'owner8@halalmap.com': [
      {
        name: 'Noodles & rice',
        sortOrder: 0,
        items: [
          {
            name: 'Mie Ayam Bakso',
            description: 'Egg noodles with chicken, mushrooms, and halal beef meatballs.',
            price: 11.99,
            sortOrder: 0,
          },
          {
            name: 'Nasi Goreng Kampung',
            description: 'Wok-fried rice with halal chicken, kecap manis, fried egg.',
            price: 12.49,
            sortOrder: 1,
          },
          {
            name: 'Beef Rendang',
            description: 'Slow-cooked halal beef in coconut and spices—mild heat.',
            price: 15.99,
            sortOrder: 2,
          },
          {
            name: 'Gado-Gado',
            description: 'Vegetables, tofu, egg, peanut sauce—vegetarian option.',
            price: 10.99,
            sortOrder: 3,
          },
        ],
      },
      {
        name: 'Satay & sides',
        sortOrder: 1,
        items: [
          {
            name: 'Chicken Satay (10)',
            description: 'Grilled skewers with peanut sauce and rice cakes.',
            price: 13.99,
            sortOrder: 0,
          },
          {
            name: 'Tempeh Goreng',
            description: 'Crispy fermented soybean cakes.',
            price: 6.99,
            sortOrder: 1,
          },
          {
            name: 'Kerupuk basket',
            description: 'Assorted shrimp and cassava crackers.',
            price: 4.49,
            sortOrder: 2,
          },
        ],
      },
      {
        name: 'Drinks & dessert',
        sortOrder: 2,
        items: [
          {
            name: 'Es Cendol',
            description: 'Pandan jelly, coconut milk, palm sugar syrup.',
            price: 5.99,
            sortOrder: 0,
          },
          {
            name: 'Teh Botol',
            description: 'Sweet jasmine tea.',
            price: 2.99,
            sortOrder: 1,
          },
          {
            name: 'Martabak Manis',
            description: 'Thick sweet pancake with chocolate and nuts (shareable).',
            price: 8.99,
            sortOrder: 2,
          },
        ],
      },
    ],
    'owner9@halalmap.com': [
      {
        name: 'Platters',
        sortOrder: 0,
        items: [
          {
            name: 'Doro Wat Combo',
            description: 'Spiced halal chicken stew with injera; berbere-forward.',
            price: 16.99,
            sortOrder: 0,
          },
          {
            name: 'Beef Tibs',
            description: 'Sautéed halal beef with onions, jalapeños, injera on the side.',
            price: 17.49,
            sortOrder: 1,
          },
          {
            name: 'Vegetarian Beyaynetu',
            description: 'Selection of lentil and vegetable stews on injera.',
            price: 14.99,
            sortOrder: 2,
          },
          {
            name: 'Kitfo (medium)',
            description: 'Minced halal beef with spiced butter—fully cooked available.',
            price: 18.99,
            sortOrder: 3,
          },
        ],
      },
      {
        name: 'Sides',
        sortOrder: 1,
        items: [
          {
            name: 'Extra Injera (2)',
            description: 'Sourdough flatbread for scooping.',
            price: 3.99,
            sortOrder: 0,
          },
          {
            name: 'Sambusa (3)',
            description: 'Lentil or halal beef-filled pastries.',
            price: 7.99,
            sortOrder: 1,
          },
          {
            name: 'Gomen',
            description: 'Slow-cooked collard greens with garlic and ginger.',
            price: 8.49,
            sortOrder: 2,
          },
        ],
      },
      {
        name: 'Drinks',
        sortOrder: 2,
        items: [
          {
            name: 'Spiced Mango Juice',
            description: 'Cold mango with cardamom.',
            price: 3.99,
            sortOrder: 0,
          },
          {
            name: 'Ethiopian Coffee Ceremony (2 cups)',
            description: 'Small cups of freshly roasted coffee.',
            price: 6.99,
            sortOrder: 1,
          },
          {
            name: 'Timatim Fitfit',
            description: 'Tomato salad mixed with injera pieces—light and tangy.',
            price: 7.49,
            sortOrder: 2,
          },
        ],
      },
    ],
    'owner10@halalmap.com': [
      {
        name: 'Rice & pasta',
        sortOrder: 0,
        items: [
          {
            name: 'Xawaash Chicken Rice',
            description: 'Basmati with halal chicken, Somali spice blend, banana side.',
            price: 14.99,
            sortOrder: 0,
          },
          {
            name: 'Goat Curry Plate',
            description: 'Slow-braised halal goat with rice and maraq.',
            price: 17.99,
            sortOrder: 1,
          },
          {
            name: 'Pasta Suugo',
            description: 'Spaghetti with spiced halal beef ragu and banana.',
            price: 13.49,
            sortOrder: 2,
          },
          {
            name: 'Grilled Fish Plate',
            description: 'Halal snapper with lime rice and salad.',
            price: 16.49,
            sortOrder: 3,
          },
        ],
      },
      {
        name: 'Snacks & soup',
        sortOrder: 1,
        items: [
          {
            name: 'Sambuusa (beef, 3)',
            description: 'Crispy triangles with seasoned halal beef.',
            price: 6.99,
            sortOrder: 0,
          },
          {
            name: 'Maraq Soup',
            description: 'Light halal broth with coriander.',
            price: 5.49,
            sortOrder: 1,
          },
          {
            name: 'Anjero with Honey',
            description: 'Somali-style fermented pancake, sweet option.',
            price: 7.99,
            sortOrder: 2,
          },
        ],
      },
      {
        name: 'Tea & juice',
        sortOrder: 2,
        items: [
          {
            name: 'Shaah (Somali Tea)',
            description: 'Cardamom black tea with milk.',
            price: 2.99,
            sortOrder: 0,
          },
          {
            name: 'Mango Juice',
            description: 'Cold jug juice.',
            price: 3.49,
            sortOrder: 1,
          },
          {
            name: 'Lamb Shank Dinner',
            description: 'Fall-off-the-bone halal lamb with rice and vegetables.',
            price: 21.99,
            sortOrder: 2,
          },
        ],
      },
    ],
    'owner11@halalmap.com': [
      {
        name: 'From the grill',
        sortOrder: 0,
        items: [
          {
            name: 'Koobideh Combo',
            description: 'Two skewers of seasoned halal beef with saffron rice and grilled tomato.',
            price: 18.99,
            sortOrder: 0,
          },
          {
            name: 'Joojeh Kabab',
            description: 'Saffron-marinated halal chicken breast, basmati, yogurt dip.',
            price: 17.49,
            sortOrder: 1,
          },
          {
            name: 'Lamb Shishlik',
            description: 'Chunk lamb skewers with peppers and onion.',
            price: 22.99,
            sortOrder: 2,
          },
          {
            name: 'Salmon Kabab',
            description: 'Halal-handled fish skewer with dill rice.',
            price: 19.99,
            sortOrder: 3,
          },
        ],
      },
      {
        name: 'Stews & rice',
        sortOrder: 1,
        items: [
          {
            name: 'Zereshk Polo + Chicken',
            description: 'Barberry rice with braised halal chicken leg.',
            price: 16.99,
            sortOrder: 0,
          },
          {
            name: 'Ghormeh Sabzi',
            description: 'Herb stew with halal beef and kidney beans—served with rice.',
            price: 15.99,
            sortOrder: 1,
          },
          {
            name: 'Tahdig Side',
            description: 'Crispy rice crust add-on.',
            price: 4.99,
            sortOrder: 2,
          },
        ],
      },
      {
        name: 'Starters & drinks',
        sortOrder: 2,
        items: [
          {
            name: 'Kashk-e Bademjan',
            description: 'Eggplant dip with whey and fried mint.',
            price: 8.99,
            sortOrder: 0,
          },
          {
            name: 'Doogh',
            description: 'Minty yogurt drink.',
            price: 3.49,
            sortOrder: 1,
          },
          {
            name: 'Persian Ice Cream (bastani)',
            description: 'Saffron-pistachio ice cream with frozen noodles.',
            price: 6.49,
            sortOrder: 2,
          },
        ],
      },
    ],
    'owner12@halalmap.com': [
      {
        name: 'Rice & curry',
        sortOrder: 0,
        items: [
          {
            name: 'Kacchi Biryani',
            description: 'Fragrant halal mutton biryani with potato and egg.',
            price: 16.99,
            sortOrder: 0,
          },
          {
            name: 'Chicken Roast with Polao',
            description: 'Whole spice-rubbed halal chicken with sweet polao.',
            price: 14.49,
            sortOrder: 1,
          },
          {
            name: 'Beef Bhuna',
            description: 'Dry-spiced halal beef curry with paratha.',
            price: 13.99,
            sortOrder: 2,
          },
          {
            name: 'Ilish Shorshe',
            description: 'Hilsa fish in mustard sauce—seasonal availability.',
            price: 18.99,
            sortOrder: 3,
          },
        ],
      },
      {
        name: 'Street snacks',
        sortOrder: 1,
        items: [
          {
            name: 'Fuchka (6)',
            description: 'Crisp shells with spiced potato and tamarind water.',
            price: 7.99,
            sortOrder: 0,
          },
          {
            name: 'Beef Tehari',
            description: 'Aromatic halal beef rice—lighter than biryani.',
            price: 12.99,
            sortOrder: 1,
          },
          {
            name: 'Shingara (2)',
            description: 'Bengali samosas with potato and peas.',
            price: 5.49,
            sortOrder: 2,
          },
        ],
      },
      {
        name: 'Drinks & sweets',
        sortOrder: 2,
        items: [
          {
            name: 'Borhani',
            description: 'Spiced yogurt drink—pairs with biryani.',
            price: 3.99,
            sortOrder: 0,
          },
          {
            name: 'Mishti Doi',
            description: 'Sweet caramelized yogurt dessert.',
            price: 4.49,
            sortOrder: 1,
          },
          {
            name: 'Rasmalai (2 pc)',
            description: 'Soft cheese patties in cardamom cream.',
            price: 5.99,
            sortOrder: 2,
          },
        ],
      },
    ],
    'owner13@halalmap.com': [
      {
        name: 'Fusion mains',
        sortOrder: 0,
        items: [
          {
            name: 'Kimchi Chicken Tikka Tacos (3)',
            description: 'Charred halal chicken, kimchi slaw, cilantro crema.',
            price: 13.99,
            sortOrder: 0,
          },
          {
            name: 'Bulgogi Bowl (halal beef)',
            description: 'Korean-style glazed beef over jasmine rice with pickled veg.',
            price: 15.49,
            sortOrder: 1,
          },
          {
            name: 'Butter Chicken Pizza',
            description: 'Naan crust, mozzarella, butter chicken sauce—shareable.',
            price: 18.99,
            sortOrder: 2,
          },
          {
            name: 'Nashville Hot Shawarma Wrap',
            description: 'Middle Eastern wrap meets cayenne oil and pickles.',
            price: 12.49,
            sortOrder: 3,
          },
        ],
      },
      {
        name: 'Sides',
        sortOrder: 1,
        items: [
          {
            name: 'Loaded Kimchi Fries',
            description: 'Fries, halal beef crumbles, gochujang mayo.',
            price: 9.99,
            sortOrder: 0,
          },
          {
            name: 'Elote Corn Ribs',
            description: 'Grilled corn with lime, chili, cotija-style cheese.',
            price: 7.99,
            sortOrder: 1,
          },
          {
            name: 'Garlic-Cilantro Naan Strips',
            description: 'Crisp naan fingers with yogurt dip.',
            price: 6.49,
            sortOrder: 2,
          },
        ],
      },
      {
        name: 'Drinks',
        sortOrder: 2,
        items: [
          {
            name: 'Yuzu Mint Lemonade',
            description: 'House citrus cooler.',
            price: 4.49,
            sortOrder: 0,
          },
          {
            name: 'Masala Cold Brew',
            description: 'Coffee with cardamom and oat milk.',
            price: 4.99,
            sortOrder: 1,
          },
          {
            name: 'Mango Cardamom Lassi',
            description: 'Classic with a twist.',
            price: 4.99,
            sortOrder: 2,
          },
        ],
      },
    ],
  };

  for (const r of FREMONT_RESTAURANTS) {
    const { ownerEmail, ...rest } = r;
    const displayName = SEED_OWNER_DISPLAY_NAME[ownerEmail] ?? `Owner ${ownerEmail}`;
    const rowOwner = await prisma.user.upsert({
      where: { email: ownerEmail },
      update: { name: displayName },
      create: {
        name: displayName,
        email: ownerEmail,
        passwordHash: ownerHash,
        role: 'RESTAURANT_OWNER',
      },
    });
    let restRecord = await prisma.restaurant.findUnique({
      where: { ownerId: rowOwner.id },
    });
    const jur = parseCaliforniaJurisdiction(rest.address);
    const cert = certificateForHalalStatuses(rest.halalStatuses);
    if (!restRecord) {
      restRecord = await prisma.restaurant.create({
        data: {
          ownerId: rowOwner.id,
          name: rest.name,
          description: rest.description ?? null,
          phone: rest.phone ?? null,
          address: rest.address,
          latitude: rest.latitude,
          longitude: rest.longitude,
          businessHours: rest.businessHours ?? undefined,
          halalStatuses: rest.halalStatuses,
          state: jur.state,
          postalCode: jur.postalCode,
          ...cert,
          approved: rest.approved,
          offersPickup: rest.offersPickup,
          offersDelivery: rest.offersDelivery,
          pickupFeeType: rest.pickupFeeType ?? null,
          pickupFeeValue: rest.pickupFeeValue ?? null,
          deliveryFeeType: rest.deliveryFeeType ?? null,
          deliveryFeeValue: rest.deliveryFeeValue ?? null,
        },
      });
    }

    restRecord = await prisma.restaurant.update({
      where: { id: restRecord.id },
      data: {
        name: rest.name,
        description: rest.description ?? null,
        phone: rest.phone ?? null,
        address: rest.address,
        latitude: rest.latitude,
        longitude: rest.longitude,
        businessHours: rest.businessHours ?? undefined,
        halalStatuses: rest.halalStatuses,
        state: jur.state,
        postalCode: jur.postalCode,
        ...cert,
        approved: rest.approved,
        offersPickup: rest.offersPickup,
        offersDelivery: rest.offersDelivery,
        pickupFeeType: rest.pickupFeeType ?? null,
        pickupFeeValue: rest.pickupFeeValue ?? null,
        deliveryFeeType: rest.deliveryFeeType ?? null,
        deliveryFeeValue: rest.deliveryFeeValue ?? null,
      },
    });

    const menu = MENUS_BY_OWNER_EMAIL[ownerEmail];
    if (menu) {
      await seedMenuIfEmpty(restRecord.id, menu, rest.offersPickup, rest.offersDelivery);
    }

    const tagSlug = SEED_TAG_BY_OWNER_EMAIL[ownerEmail];
    if (tagSlug) {
      await setRestaurantSeedTag(restRecord.id, tagSlug);
    }
  }

  const customerHash = await bcrypt.hash('customer123', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@halalmap.com' },
    update: { name: 'Yusuf Ali' },
    create: {
      name: 'Yusuf Ali',
      email: 'customer@halalmap.com',
      passwordHash: customerHash,
      role: 'CUSTOMER',
    },
  });
  const homeJur = parseCaliforniaJurisdiction('1234 Maple Ave, Fremont, CA 94536');
  const homeData = {
    label: 'Home' as const,
    street: '1234 Maple Ave',
    city: 'Fremont',
    state: homeJur.state,
    postalCode: homeJur.postalCode,
    latitude: 37.5523,
    longitude: -121.9851,
    isDefault: true,
  };
  const existingHome = await prisma.address.findFirst({
    where: { userId: customer.id, label: 'Home' },
  });
  if (existingHome) {
    await prisma.address.update({
      where: { id: existingHome.id },
      data: homeData,
    });
  } else {
    await prisma.address.create({
      data: { userId: customer.id, ...homeData },
    });
  }

  const primaryForFav = await prisma.restaurant.findUnique({ where: { ownerId: owner.id } });
  const bayOwner = await prisma.user.findUnique({ where: { email: 'owner2@halalmap.com' } });
  const pindiOwner = await prisma.user.findUnique({ where: { email: 'owner4@halalmap.com' } });
  const bayR = bayOwner
    ? await prisma.restaurant.findUnique({ where: { ownerId: bayOwner.id } })
    : null;
  const pindiR = pindiOwner
    ? await prisma.restaurant.findUnique({ where: { ownerId: pindiOwner.id } })
    : null;
  if (primaryForFav && bayR && pindiR) {
    await prisma.userFavoriteRestaurant.createMany({
      data: [
        { userId: customer.id, restaurantId: primaryForFav.id },
        { userId: customer.id, restaurantId: bayR.id },
        { userId: customer.id, restaurantId: pindiR.id },
      ],
      skipDuplicates: true,
    });
  }

  const fullPrimary = await prisma.restaurant.findUnique({ where: { id: restaurant.id } });
  if (fullPrimary) {
    const biryani = await prisma.menuItem.findFirst({
      where: { name: 'Chicken Biryani', category: { restaurantId: fullPrimary.id } },
    });
    const naan = await prisma.menuItem.findFirst({
      where: { name: 'Garlic Naan', category: { restaurantId: fullPrimary.id } },
    });
    const hasDemoOrder = await prisma.order.findFirst({
      where: { userId: customer.id, restaurantId: fullPrimary.id, status: 'COMPLETED' },
    });
    if (!hasDemoOrder && biryani && naan) {
      const subtotalCents = Math.round(
        (Number(biryani.price) * 1 + Number(naan.price) * 1) * 100,
      );
      const feeCents = getEffectiveFeeCents(fullPrimary, 'PICKUP', subtotalCents);
      const platformFeeCents = getPlatformFeeCents(subtotalCents);
      const taxCents = getTaxCents(subtotalCents + feeCents, {
        state: fullPrimary.state,
        postalCode: fullPrimary.postalCode,
        country: 'US',
      });
      const totalCents = subtotalCents + feeCents + taxCents;
      const totalPrice = totalCents / 100;
      await prisma.order.create({
        data: {
          userId: customer.id,
          restaurantId: fullPrimary.id,
          status: 'COMPLETED',
          totalPrice: new Decimal(totalPrice),
          feeCents,
          platformFeeCents,
          taxCents,
          deliveryType: 'PICKUP',
          paymentConfirmedAt: new Date('2026-01-15T18:30:00.000Z'),
          items: {
            create: [
              { menuItemId: biryani.id, quantity: 1, priceAtOrder: biryani.price },
              { menuItemId: naan.id, quantity: 1, priceAtOrder: naan.price },
            ],
          },
        },
      });
    }
  }

  console.log(
    'Seed complete: admin, owners, customer@halalmap.com (password customer123), addresses, favorites, sample order, tax fields, halal certificate URLs, and menu images.',
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
