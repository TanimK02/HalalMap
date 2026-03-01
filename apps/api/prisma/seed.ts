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

  console.log('Seed complete: admin, restaurant owner, sample restaurant and menu.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
