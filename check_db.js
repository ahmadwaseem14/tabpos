const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Total users:', users.length);
  
  const admin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });
  
  if (admin) {
    console.log('Admin found:', admin.username);
    console.log('Hash:', admin.password);
    const isValid = await bcrypt.compare('admin123', admin.password);
    console.log('Password valid for admin123:', isValid);
  } else {
    console.log('Admin not found in the database. Seeding...');
    // Seed manually here just in case
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const newAdmin = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: 'Owner',
        role: 'OWNER',
      },
    });
    console.log('Created admin:', newAdmin.username);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
