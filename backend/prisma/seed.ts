// =============================================================================
// DealHunter — Prisma Seed Script Skeleton (Phase 1)
// =============================================================================
// Seed script to populate initial categories, merchants, and sample products.
// Expanded with full dataset in Phase 3 (Mock Data Engine).
// =============================================================================

import { PrismaClient, IdentifierType, OfferAvailability } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create Base Categories
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics',
    },
  });

  const smartphones = await prisma.category.upsert({
    where: { slug: 'smartphones' },
    update: {},
    create: {
      name: 'Smartphones',
      slug: 'smartphones',
      parentId: electronics.id,
    },
  });

  const laptops = await prisma.category.upsert({
    where: { slug: 'laptops' },
    update: {},
    create: {
      name: 'Laptops',
      slug: 'laptops',
      parentId: electronics.id,
    },
  });

  console.log('✅ Categories created:', { electronics: electronics.name, smartphones: smartphones.name, laptops: laptops.name });

  // 2. Create Base Merchants
  const amazon = await prisma.merchant.upsert({
    where: { slug: 'amazon_in' },
    update: {},
    create: {
      name: 'Amazon India',
      slug: 'amazon_in',
      baseUrl: 'https://www.amazon.in',
    },
  });

  const flipkart = await prisma.merchant.upsert({
    where: { slug: 'flipkart' },
    update: {},
    create: {
      name: 'Flipkart',
      slug: 'flipkart',
      baseUrl: 'https://www.flipkart.com',
    },
  });

  const croma = await prisma.merchant.upsert({
    where: { slug: 'croma' },
    update: {},
    create: {
      name: 'Croma',
      slug: 'croma',
      baseUrl: 'https://www.croma.com',
    },
  });

  console.log('✅ Merchants created:', [amazon.name, flipkart.name, croma.name]);

  console.log('🌱 Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
