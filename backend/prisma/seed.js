require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run seed.');
}

const adapter = new PrismaPg({
  connectionString,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 300_000,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = (p) => bcrypt.hashSync(p, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@kinhtot.vn' },
    update: {},
    create: {
      email: 'admin@kinhtot.vn',
      password: hash('admin123'),
      fullName: 'Admin Kính Tốt',
      phone: '0900000001',
      role: 'ADMIN',
    },
  });
  console.log('Created admin:', admin.email);

  const seller = await prisma.user.upsert({
    where: { email: 'seller@kinhtot.vn' },
    update: {},
    create: {
      email: 'seller@kinhtot.vn',
      password: hash('seller123'),
      fullName: 'Nguyễn Văn Seller',
      phone: '0900000002',
      role: 'SELLER',
    },
  });
  console.log('Created seller:', seller.email);

  await prisma.sellerProfile.upsert({
    where: { userId: seller.id },
    update: {},
    create: {
      userId: seller.id,
      shopName: 'Kính Thời Trang Store',
      description: 'Chuyên kính râm và gọng kính chính hãng.',
      kycDocument: 'https://placehold.co/600x400?text=KYC+Doc',
      kycStatus: 'APPROVED',
      approvedAt: new Date(),
    },
  });
  console.log('Created seller profile (KYC approved)');

  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@kinhtot.vn' },
    update: {},
    create: {
      email: 'buyer@kinhtot.vn',
      password: hash('buyer123'),
      fullName: 'Trần Thị Buyer',
      phone: '0900000003',
      role: 'BUYER',
    },
  });
  console.log('Created buyer:', buyer.email);

  const staff = await prisma.user.upsert({
    where: { email: 'staff@kinhtot.vn' },
    update: {},
    create: {
      email: 'staff@kinhtot.vn',
      password: hash('staff123'),
      fullName: 'Nhân viên Staff',
      phone: '0900000004',
      role: 'STAFF',
    },
  });
  console.log('Created staff:', staff.email);

  const cat1 = await prisma.category.upsert({
    where: { slug: 'kinh-ram' },
    update: {},
    create: {
      name: 'Kính râm',
      slug: 'kinh-ram',
      description: 'Kính râm thời trang và bảo vệ mắt.',
      image: 'https://placehold.co/600x400?text=Kinh+Ram',
    },
  });
  const cat2 = await prisma.category.upsert({
    where: { slug: 'gong-kinh' },
    update: {},
    create: {
      name: 'Gọng kính',
      slug: 'gong-kinh',
      description: 'Gọng kính cận và thời trang.',
      image: 'https://placehold.co/600x400?text=Gong+Kinh',
    },
  });
  console.log('Created categories:', cat1.slug, cat2.slug);

  // --- Re-seed products using high-quality Unsplash images ---
  // Xóa OrderDetail trước (foreign key tới Product), rồi mới xóa Product
  await prisma.orderDetail.deleteMany({});
  await prisma.product.deleteMany({});
  const images = {
    img1: ['https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=80'],
    img2: ['https://images.unsplash.com/photo-1577744486770-020adf4f3d6a?auto=format&fit=crop&w=1200&q=80'],
    img3: ['https://images.unsplash.com/photo-1625591339971-4f35f419f2fa?auto=format&fit=crop&w=1200&q=80'],
    img4: ['https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1200&q=80'],
    img5: ['https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1200&q=80'],
    img6: ['https://res.cloudinary.com/dhnwl0xvf/image/upload/v1772420892/kinhtot_products/l69fiwtss9jz9lpjppph.png'],
    img7: ['https://res.cloudinary.com/dhnwl0xvf/image/upload/v1772420890/kinhtot_products/orbwrcexbumum2pwcmsu.png'],
    img8: ['https://res.cloudinary.com/dhnwl0xvf/image/upload/v1772420894/kinhtot_products/ki6ons3t6fuvbmzpramp.png'],
    img9: ['https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=1200&q=80'],
    img10: ['https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80'],
    img11: ['https://res.cloudinary.com/dhnwl0xvf/image/upload/v1772420890/kinhtot_products/orbwrcexbumum2pwcmsu.png'],
    img12: ['https://res.cloudinary.com/dhnwl0xvf/image/upload/v1772420892/kinhtot_products/l69fiwtss9jz9lpjppph.png'],
    img13: ['https://res.cloudinary.com/dhnwl0xvf/image/upload/v1772420893/kinhtot_products/f8bwagqttc81mcfpxoki.png'],
    img14: ['https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=1200&q=80'],
  };

  await prisma.product.upsert({
    where: { slug: 'ray-ban-wayfarer-classic' },
    update: {},
    create: {
      sellerId: seller.id,
      categoryId: cat1.id,
      name: 'Ray-Ban Wayfarer Classic',
      slug: 'ray-ban-wayfarer-classic',
      description: 'Dòng kính mát huyền thoại của Ray-Ban, kiểu dáng vuông mạnh mẽ, tròng kính chống tia UV 100%. Gọng nhựa Acetate cao cấp, phù hợp cho mọi dịp.',
      price: '77000',
      salePrice: '65000',
      images: images.img1,
      condition: 'NEW',
      frameMaterial: 'ACETATE',
      frameShape: 'SQUARE',
      lensType: 'SUNGLASSES',
      gender: 'UNISEX',
      stock: 45,
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { slug: 'gentle-monster-lang-01' },
    update: {},
    create: {
      sellerId: seller.id,
      categoryId: cat1.id,
      name: 'Gentle Monster Lăng 01',
      slug: 'gentle-monster-lang-01',
      description: 'Siêu phẩm Gentle Monster với thiết kế tròng dẹt thời thượng. Tròng kính đen chống nắng tuyệt đối 99.9% tia UV. Phù hợp cho những bộ outfit đường phố phá cách.',
      price: '128000',
      salePrice: '116000',
      images: images.img2,
      condition: 'NEW',
      frameMaterial: 'PLASTIC',
      frameShape: 'RECTANGLE',
      lensType: 'SUNGLASSES',
      gender: 'UNISEX',
      stock: 30,
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { slug: 'chloe-carlina-round' },
    update: {},
    create: {
      sellerId: seller.id,
      categoryId: cat1.id,
      name: 'Chloé Carlina Round',
      slug: 'chloe-carlina-round',
      description: 'Kính râm Chloé Carlina với thiết kế gọng tròn to bản oversize nổi bật. Gọng kim loại mảnh mai bọc nhựa, mang đến diện mạo sang trọng, nữ tính và cuốn hút.',
      price: '184000',
      salePrice: '162000',
      images: images.img3,
      condition: 'LIKE_NEW',
      frameMaterial: 'METAL',
      frameShape: 'ROUND',
      lensType: 'SUNGLASSES',
      gender: 'WOMEN',
      stock: 12,
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { slug: 'tom-ford-snowdon' },
    update: {},
    create: {
      sellerId: seller.id,
      categoryId: cat1.id,
      name: 'Tom Ford Snowdon',
      slug: 'tom-ford-snowdon',
      description: 'Kính mát Tom Ford Snowdon huyền thoại mang đậm phong cách điệp viên 007. Gọng nhựa Tortoise cá tính, điểm nhấn logo chữ T bằng kim loại đặc trưng ở càng kính.',
      price: '170000',
      salePrice: null,
      images: images.img4,
      condition: 'NEW',
      frameMaterial: 'ACETATE',
      frameShape: 'SQUARE',
      lensType: 'SUNGLASSES',
      gender: 'MEN',
      stock: 25,
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { slug: 'oakley-holbrook-mat' },
    update: {},
    create: {
      sellerId: seller.id,
      categoryId: cat1.id,
      name: 'Oakley Holbrook Prizm',
      slug: 'oakley-holbrook-mat',
      description: 'Kính thể thao Oakley Holbrook công nghệ Prizm tăng cường độ tương phản. Phù hợp cho các hoạt động ngoài trời, dã ngoại, đạp xe, chạy bộ với thiết kế ôm chắc chắn.',
      price: '92000',
      salePrice: '84000',
      images: images.img5,
      condition: 'LIKE_NEW',
      frameMaterial: 'PLASTIC',
      frameShape: 'SQUARE',
      lensType: 'SUNGLASSES',
      gender: 'MEN',
      stock: 18,
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { slug: 'dior-stellaire-square' },
    update: {},
    create: {
      sellerId: seller.id,
      categoryId: cat1.id,
      name: 'Dior Stellaire Square',
      slug: 'dior-stellaire-square',
      description: 'Gọng kim loại vuông oversize mỏng nhẹ, tròng xanh bắt mắt. Kính Dior Stellaire1 nổi bật sự tinh tế và quyền lực của phái đẹp hiện đại.',
      price: '220000',
      salePrice: null,
      images: images.img6,
      condition: 'USED',
      frameMaterial: 'METAL',
      frameShape: 'SQUARE',
      lensType: 'SUNGLASSES',
      gender: 'WOMEN',
      stock: 5,
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { slug: 'oliver-peoples-gregory-peck' },
    update: {},
    create: {
      sellerId: seller.id,
      categoryId: cat2.id,
      name: 'Oliver Peoples Gregory Peck',
      slug: 'oliver-peoples-gregory-peck',
      description: 'Gọng kính cận cổ điển Oliver Peoples được lấy cảm hứng từ nhân vật trong To Kill a Mockingbird. Kiểu dáng P3 bo tròn, chất liệu Acetate Tortoise cao cấp.',
      price: '156000',
      salePrice: '142000',
      images: images.img7,
      condition: 'NEW',
      frameMaterial: 'ACETATE',
      frameShape: 'ROUND',
      lensType: 'SINGLE_VISION',
      gender: 'UNISEX',
      stock: 22,
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { slug: 'gucci-aviator-optical' },
    update: {},
    create: {
      sellerId: seller.id,
      categoryId: cat2.id,
      name: 'Gucci Aviator Optical',
      slug: 'gucci-aviator-optical',
      description: 'Gọng kính cận phi công Gucci. Sự kết hợp hoàn hảo giữa vẻ đẹp hoài cổ và gu thời trang sang chảnh. Gọng mạ vàng tinh tế đính kèm logo GG quen thuộc.',
      price: '190000',
      salePrice: null,
      images: images.img8,
      condition: 'LIKE_NEW',
      frameMaterial: 'METAL',
      frameShape: 'AVIATOR',
      lensType: 'BLUE_LIGHT',
      gender: 'MEN',
      stock: 8,
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { slug: 'owndays-clear-half-rim' },
    update: {},
    create: {
      sellerId: seller.id,
      categoryId: cat2.id,
      name: 'Owndays Clear Half-Rim',
      slug: 'owndays-clear-half-rim',
      description: 'Gọng nửa viền thanh thoát, phong cách doanh nhân đĩnh đạc. Nhựa trong suốt nửa dưới kết hợp gọng trên màu đen thanh lịch, đem lại vẻ chuyên nghiệp.',
      price: '42000',
      salePrice: '37000',
      images: images.img9,
      condition: 'NEW',
      frameMaterial: 'PLASTIC',
      frameShape: 'RECTANGLE',
      lensType: 'PROGRESSIVE',
      gender: 'MEN',
      stock: 60,
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { slug: 'bottega-veneta-cat-eye' },
    update: {},
    create: {
      sellerId: seller.id,
      categoryId: cat2.id,
      name: 'Bottega Veneta Cat-Eye Optical',
      slug: 'bottega-veneta-cat-eye',
      description: 'Gọng kính cận dáng Cat-Eye kiêu kì từ Bottega Veneta. Được chạm khắc kim loại mạ vàng chìm ở gọng đồi mồi sang trọng, tôn lên lên góc cạnh của gương mặt.',
      price: '178000',
      salePrice: '162000',
      images: images.img10,
      condition: 'NEW',
      frameMaterial: 'ACETATE',
      frameShape: 'CAT_EYE',
      lensType: 'BLUE_LIGHT',
      gender: 'WOMEN',
      stock: 14,
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { slug: 'lindberg-spirit-titanium' },
    update: {},
    create: {
      sellerId: seller.id,
      categoryId: cat2.id,
      name: 'Lindberg Spirit Titanium',
      slug: 'lindberg-spirit-titanium',
      description: 'Gọng không viền siêu nhẹ đỉnh cao, cân nặng chỉ vài gram. Lindberg Spirit được chế tác từ sơi Titanium dẻo dai nguyên khối, không ốc vít cực kì linh hoạt.',
      price: '300000',
      salePrice: null,
      images: images.img6,
      condition: 'NEW',
      frameMaterial: 'TITANIUM',
      frameShape: 'OVAL',
      lensType: 'PROGRESSIVE',
      gender: 'UNISEX',
      stock: 10,
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { slug: 'persol-cellor-original' },
    update: {},
    create: {
      sellerId: seller.id,
      categoryId: cat2.id,
      name: 'Persol Cellor Original',
      slug: 'persol-cellor-original',
      description: 'Phong cách gọng clubmaster đặc trưng của Persol với hoạ tiết đồi mồi và logo mũi tên bạc sáng bóng ở càng kính. Biểu tượng thực sự của sự lịch lãm của quý ông nước Ý.',
      price: '136000',
      salePrice: '118000',
      images: images.img7,
      condition: 'USED',
      frameMaterial: 'ACETATE',
      frameShape: 'SQUARE',
      lensType: 'SINGLE_VISION',
      gender: 'MEN',
      stock: 3,
      isActive: true,
    },
  });

  await prisma.product.upsert({
    where: { slug: 'mykita-lite-oval' },
    update: {},
    create: {
      sellerId: seller.id,
      categoryId: cat2.id,
      name: 'Mykita Lite Oval',
      slug: 'mykita-lite-oval',
      description: 'Gọng thép không gỉ thiết kế công thái học từ Đức. Mykita Lite mang đến trải nghiệm đeo như không đeo mà vẫn giữ được sự tinh giản theo tư duy của trường phái Bauhaus.',
      price: '248000',
      salePrice: '220000',
      images: images.img8,
      condition: 'LIKE_NEW',
      frameMaterial: 'METAL',
      frameShape: 'OVAL',
      lensType: 'SINGLE_VISION',
      gender: 'UNISEX',
      stock: 6,
      isActive: true,
    },
  });


  await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: cat1.id,
      name: 'Retro Round Classic (Cũ)',
      slug: 'mock-used-1',
      description: 'Kính râm gọng tròn cổ điển, tròng xanh sẫm. Tình trạng còn khá mới.',
      price: '150000',
      salePrice: '90000',
      images: images.img11,
      condition: 'USED',
      frameMaterial: 'METAL',
      frameShape: 'ROUND',
      lensType: 'SUNGLASSES',
      gender: 'UNISEX',
      stock: 1,
      isActive: true,
    }
  });

  await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: cat2.id,
      name: 'Titanium Rectangle Frame (Cũ)',
      slug: 'mock-used-2',
      description: 'Gọng titan xám nhạt cực nhẹ, tình trạng gần như mới hoàn toàn.',
      price: '250000',
      salePrice: '120000',
      images: images.img12,
      condition: 'LIKE_NEW',
      frameMaterial: 'TITANIUM',
      frameShape: 'RECTANGLE',
      lensType: 'SINGLE_VISION',
      gender: 'MEN',
      stock: 1,
      isActive: true,
    }
  });

  await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: cat1.id,
      name: 'Vintage Cat-Eye Shades (Cũ)',
      slug: 'mock-used-3',
      description: 'Kính dáng mắt mèo phong cách thập niên 90, tròng màu hổ phách.',
      price: '180000',
      salePrice: '85000',
      images: images.img13,
      condition: 'USED',
      frameMaterial: 'PLASTIC',
      frameShape: 'CAT_EYE',
      lensType: 'SUNGLASSES',
      gender: 'WOMEN',
      stock: 1,
      isActive: true,
    }
  });

  await prisma.product.create({
    data: {
      sellerId: seller.id,
      categoryId: cat2.id,
      name: 'Half-Rim Business (Cũ)',
      slug: 'mock-used-4',
      description: 'Gọng nửa viền dùng cho dân văn phòng. Gọng còn rất cứng cáp.',
      price: '120000',
      salePrice: null,
      images: images.img14,
      condition: 'USED',
      frameMaterial: 'METAL',
      frameShape: 'SQUARE',
      lensType: 'SINGLE_VISION',
      gender: 'MEN',
      stock: 1,
      isActive: true,
    }
  });

  console.log('Created sample products including used items');
  console.log('Test credentials:');
  console.log('- Customer: buyer@kinhtot.vn / buyer123');
  console.log('- Seller: seller@kinhtot.vn / seller123');
  console.log('- Staff: staff@kinhtot.vn / staff123');
  console.log('- Admin: admin@kinhtot.vn / admin123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
