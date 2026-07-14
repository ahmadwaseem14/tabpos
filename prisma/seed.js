const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminUsername = 'admin';
  const existingUser = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.create({
      data: {
        username: adminUsername,
        password: hashedPassword,
        name: 'Owner',
        role: 'OWNER',
      },
    });
    console.log('Admin user created:', user.username);
  } else {
    console.log('Admin user already exists');
  }

  // Create Own Shop shopkeeper
  const ownShopName = 'Own Shop';
  const existingOwnShop = await prisma.shopkeeper.findUnique({
    where: { shopName: ownShopName },
  });

  if (!existingOwnShop) {
    const ownShop = await prisma.shopkeeper.create({
      data: {
        name: 'Own Shop Store',
        phone: '0000-0000000',
        address: 'Main Warehouse / Shop',
        shopName: ownShopName,
        creditLimit: 99999999.0,
        balance: 0.0,
        isOwnShop: true,
        notes: 'Special internal shopkeeper representing our retail shop',
      },
    });
    console.log('Own Shop created successfully');
  } else {
    console.log('Own Shop already exists');
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
