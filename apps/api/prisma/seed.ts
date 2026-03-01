import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
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

  const ownerHash = await bcrypt.hash('owner123', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@halalmap.com' },
    update: {},
    create: {
      name: 'Restaurant Owner',
      email: 'owner@halalmap.com',
      passwordHash: ownerHash,
      role: 'RESTAURANT_OWNER',
    },
  });

  let restaurant = await prisma.restaurant.findUnique({
    where: { ownerId: owner.id },
  });
  const seedCoords = { latitude: 37.7749, longitude: -122.4194 };
  const seedBusinessHours = {
    mon: { open: '09:00', close: '21:00' },
    tue: { open: '09:00', close: '21:00' },
    wed: { open: '09:00', close: '21:00' },
    thu: { open: '09:00', close: '21:00' },
    fri: { open: '09:00', close: '21:00' },
    sat: { open: '09:00', close: '21:00' },
    sun: { open: '09:00', close: '21:00' },
  };
  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: {
        ownerId: owner.id,
        name: 'Halal Kitchen',
        description: 'Certified halal restaurant serving fresh meals.',
        phone: '+1234567890',
        address: '123 Main St, City',
        ...seedCoords,
        halalStatuses: ['CERTIFIED_HALAL'],
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
    const updates: { latitude?: number; longitude?: number; businessHours?: object } = {};
    if (restaurant.latitude == null || restaurant.longitude == null) {
      updates.latitude = seedCoords.latitude;
      updates.longitude = seedCoords.longitude;
    }
    if (restaurant.businessHours == null) {
      updates.businessHours = seedBusinessHours;
    }
    if (Object.keys(updates).length > 0) {
      restaurant = await prisma.restaurant.update({
        where: { id: restaurant.id },
        data: updates,
      });
    }
  }

  const categoryCount = await prisma.menuCategory.count({
    where: { restaurantId: restaurant.id },
  });
  if (categoryCount === 0) {
    const category = await prisma.menuCategory.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Mains',
        sortOrder: 0,
      },
    });
    await prisma.menuItem.create({
      data: {
        categoryId: category.id,
        name: 'Chicken Biryani',
        description: 'Fragrant basmati rice with tender halal chicken.',
        price: 12.99,
        isAvailable: true,
        availableForPickup: true,
        availableForDelivery: true,
        sortOrder: 0,
      },
    });
  }

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

  const FREMONT_RESTAURANTS = [
    {
      ownerEmail: 'owner2@halalmap.com',
      name: 'Fremont Halal Grill',
      description: 'Certified halal grill in downtown Fremont.',
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
      name: 'Niles Kabab House',
      description: 'Muslim-owned kabab and curry.',
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
      name: 'Warm Springs Halal Kitchen',
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
      name: 'Newark Halal Lunch Spot',
      description: 'Lunch-only halal options.',
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
      name: 'Union City Late Night Halal',
      description: 'Open late for dinner and snacks.',
      phone: '+15105551236',
      address: '31680 Alvarado Blvd, Union City, CA 94587',
      latitude: 37.596,
      longitude: -122.019,
      businessHours: lateNight,
      halalStatuses: ['PROCLAIMED_HALAL'],
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
      name: 'Hayward Overnight Grill',
      description: 'Dinner and late-night halal grill.',
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
      name: 'Milpitas 24/7 Halal',
      description: 'Open 24 hours. Certified halal.',
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
      name: 'Fremont TBD Halal',
      address: '6000 Stevenson Blvd, Fremont, CA 94538',
      latitude: 37.535,
      longitude: -121.97,
      businessHours: null,
      halalStatuses: ['SOME_HALAL'],
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
      name: 'Weekend Only Halal',
      description: 'Open Fri–Sun only.',
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
      name: 'Pickup Only Halal',
      description: 'Pickup only, no delivery.',
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
      name: 'Delivery Only Halal',
      description: 'Delivery only, no pickup.',
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
      name: 'Pending Review Halal',
      description: 'Unapproved for admin testing.',
      address: '36160 Fremont Blvd, Fremont, CA 94536',
      latitude: 37.552,
      longitude: -121.982,
      businessHours: standardHours,
      halalStatuses: ['PROCLAIMED_HALAL'],
      approved: false,
      offersPickup: true,
      offersDelivery: true,
      pickupFeeType: null,
      pickupFeeValue: null,
      deliveryFeeType: null,
      deliveryFeeValue: null,
    },
  ];

  for (const r of FREMONT_RESTAURANTS) {
    const { ownerEmail, ...rest } = r;
    const owner = await prisma.user.upsert({
      where: { email: ownerEmail },
      update: {},
      create: {
        name: `Owner ${ownerEmail}`,
        email: ownerEmail,
        passwordHash: ownerHash,
        role: 'RESTAURANT_OWNER',
      },
    });
    let restRecord = await prisma.restaurant.findUnique({
      where: { ownerId: owner.id },
    });
    if (!restRecord) {
      restRecord = await prisma.restaurant.create({
        data: {
          ownerId: owner.id,
          name: rest.name,
          description: rest.description ?? null,
          phone: rest.phone ?? null,
          address: rest.address,
          latitude: rest.latitude,
          longitude: rest.longitude,
          businessHours: rest.businessHours ?? undefined,
          halalStatuses: rest.halalStatuses,
          approved: rest.approved,
          offersPickup: rest.offersPickup,
          offersDelivery: rest.offersDelivery,
          pickupFeeType: rest.pickupFeeType ?? null,
          pickupFeeValue: rest.pickupFeeValue ?? null,
          deliveryFeeType: rest.deliveryFeeType ?? null,
          deliveryFeeValue: rest.deliveryFeeValue ?? null,
        },
      });
      const catCount = await prisma.menuCategory.count({
        where: { restaurantId: restRecord.id },
      });
      if (catCount === 0) {
        const category = await prisma.menuCategory.create({
          data: {
            restaurantId: restRecord.id,
            name: 'Mains',
            sortOrder: 0,
          },
        });
        await prisma.menuItem.create({
          data: {
            categoryId: category.id,
            name: 'Sample Halal Plate',
            description: 'Halal option at this location.',
            price: 11.99,
            isAvailable: true,
            availableForPickup: rest.offersPickup,
            availableForDelivery: rest.offersDelivery,
            sortOrder: 0,
          },
        });
      }
    }
  }

  console.log('Seed complete: admin, restaurant owner, sample restaurant and menu, Fremont-area locations.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
