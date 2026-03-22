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

  // Luôn cập nhật password mẫu khi chạy seed (upsert update trước đây rỗng → user cũ giữ mật khẩu đăng ký, không login được bằng admin123…)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@kinhtot.vn' },
    update: { password: hash('admin123') },
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
    update: { password: hash('seller123') },
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
    update: {
      sellerProvinceId: 202,
      sellerDistrictId: 1442,
      sellerWardCode: '20107',
      sellerProvinceName: 'Hồ Chí Minh',
    },
    create: {
      userId: seller.id,
      shopName: 'Kính Thời Trang Store',
      description: 'Chuyên kính râm và gọng kính chính hãng.',
      kycDocument: 'https://placehold.co/600x400?text=KYC+Doc',
      kycStatus: 'APPROVED',
      approvedAt: new Date(),
      sellerProvinceId: 202,
      sellerDistrictId: 1442,
      sellerWardCode: '20107',
      sellerProvinceName: 'Hồ Chí Minh',
    },
  });
  console.log('Created seller profile HCM warehouse (KYC approved)');

  const sellerHn = await prisma.user.upsert({
    where: { email: 'seller2@kinhtot.vn' },
    update: { password: hash('seller2123') },
    create: {
      email: 'seller2@kinhtot.vn',
      password: hash('seller2123'),
      fullName: 'Shop Kính Hà Nội',
      phone: '0900000005',
      role: 'SELLER',
    },
  });
  console.log('Created seller (HN):', sellerHn.email);

  await prisma.sellerProfile.upsert({
    where: { userId: sellerHn.id },
    update: {
      sellerProvinceId: 201,
      sellerDistrictId: 3440,
      sellerWardCode: '1A0807',
      sellerProvinceName: 'Hà Nội',
    },
    create: {
      userId: sellerHn.id,
      shopName: 'Kính Tốt Hà Nội',
      description: 'Kho Nam Từ Liêm — đối tác multi-vendor.',
      kycDocument: 'https://placehold.co/600x400?text=KYC+HN',
      kycStatus: 'APPROVED',
      approvedAt: new Date(),
      sellerProvinceId: 201,
      sellerDistrictId: 3440,
      sellerWardCode: '1A0807',
      sellerProvinceName: 'Hà Nội',
    },
  });
  console.log('Created seller profile HN warehouse (KYC approved)');

  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@kinhtot.vn' },
    update: { password: hash('buyer123') },
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
    update: { password: hash('staff123') },
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

  // --- Sản phẩm mẫu ---
  // Mặc định KHÔNG xóa bảng products (tránh mất dữ liệu khi chạy seed nhiều lần).
  // Chỉ khi cần reset sạch (môi trường dev): SEED_RESET_PRODUCTS=1 npm run seed
  const resetProducts = process.env.SEED_RESET_PRODUCTS === '1';
  if (resetProducts) {
    await prisma.orderDetail.deleteMany({});
    await prisma.product.deleteMany({});
    console.log('SEED_RESET_PRODUCTS=1: đã xóa order_details + products, seed lại từ đầu.');
  }
  /**
   * Chỉ URL là ảnh sản phẩm kính (Cloudinary dự án + Unsplash flat lay + Commons).
   * Đã bỏ các ID Unsplash dễ ra ảnh người / đồ ăn / cà phê (vd 1487412720507, 1577803645773).
   */
  const EYEWEAR_IMAGE_URLS = [
    'https://res.cloudinary.com/dhnwl0xvf/image/upload/v1772420892/kinhtot_products/l69fiwtss9jz9lpjppph.png',
    'https://res.cloudinary.com/dhnwl0xvf/image/upload/v1772420890/kinhtot_products/orbwrcexbumum2pwcmsu.png',
    'https://res.cloudinary.com/dhnwl0xvf/image/upload/v1772420894/kinhtot_products/ki6ons3t6fuvbmzpramp.png',
    'https://res.cloudinary.com/dhnwl0xvf/image/upload/v1772420893/kinhtot_products/f8bwagqttc81mcfpxoki.png',
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1625591339971-4f35f419f2fa?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1577744486770-020adf4f3d6a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=81',
  ];
  const images = {};
  for (let i = 1; i <= 20; i += 1) {
    const url = EYEWEAR_IMAGE_URLS[(i - 1) % EYEWEAR_IMAGE_URLS.length];
    images[`img${i}`] = [url];
  }

  const seedImageKeys = Array.from({ length: 20 }, (_, i) => `img${i + 1}`);
  const extraCatalog = [
    // --- Kho HCM (seller) ---
    {
      slug: 'kinh-tot-hcm-classic-01',
      warehouse: 'hcm',
      cat: 1,
      name: 'Kính râm Classic gọng đen (HCM)',
      description: 'Phong cách tối giản, tròng polarized, phù hợp đi nắng hàng ngày.',
      price: '450000',
      salePrice: '389000',
      frameMaterial: 'ACETATE',
      frameShape: 'SQUARE',
      lensType: 'SUNGLASSES',
      gender: 'UNISEX',
      stock: 20,
    },
    {
      slug: 'kinh-tot-hcm-premium-02',
      warehouse: 'hcm',
      cat: 1,
      name: 'Kính mát Premium Titan (HCM)',
      description: 'Gọng titan siêu nhẹ, bản lề linh hoạt, bảo hành 12 tháng.',
      price: '1200000',
      salePrice: '1090000',
      frameMaterial: 'TITANIUM',
      frameShape: 'RECTANGLE',
      lensType: 'SUNGLASSES',
      gender: 'MEN',
      stock: 12,
    },
    {
      slug: 'kinh-tot-hcm-sport-03',
      warehouse: 'hcm',
      cat: 1,
      name: 'Kính thể thao wrap-around (HCM)',
      description: 'Ôm sát khuôn mặt, chống gió bụi, dành cho chạy bộ và đạp xe.',
      price: '380000',
      salePrice: null,
      frameMaterial: 'PLASTIC',
      frameShape: 'RECTANGLE',
      lensType: 'SUNGLASSES',
      gender: 'UNISEX',
      stock: 28,
    },
    {
      slug: 'kinh-tot-hcm-luxury-04',
      warehouse: 'hcm',
      cat: 1,
      name: 'Kính mát cao cấp Limited Gold (HCM)',
      description: 'Mạ vàng 18K trên gọng kim loại, số lượng giới hạn.',
      price: '2100000',
      salePrice: '1990000',
      frameMaterial: 'METAL',
      frameShape: 'AVIATOR',
      lensType: 'SUNGLASSES',
      gender: 'MEN',
      stock: 5,
    },
    {
      slug: 'kinh-tot-hcm-round-05',
      warehouse: 'hcm',
      cat: 1,
      name: 'Kính tròn vintage nâu (HCM)',
      description: 'Hoài cổ thập niên 70, tròng gradient nâu ấm.',
      price: '620000',
      salePrice: '549000',
      frameMaterial: 'METAL',
      frameShape: 'ROUND',
      lensType: 'SUNGLASSES',
      gender: 'WOMEN',
      stock: 16,
    },
    {
      slug: 'kinh-tot-hcm-optical-06',
      warehouse: 'hcm',
      cat: 2,
      name: 'Gọng cận acetate sọc rùa (HCM)',
      description: 'Acetate Ý, nhẹ và bền; lắp tròng theo đơn.',
      price: '890000',
      salePrice: '790000',
      frameMaterial: 'ACETATE',
      frameShape: 'RECTANGLE',
      lensType: 'SINGLE_VISION',
      gender: 'UNISEX',
      stock: 24,
    },
    {
      slug: 'kinh-tot-hcm-bluecut-07',
      warehouse: 'hcm',
      cat: 2,
      name: 'Gọng kim loại chống ánh sáng xanh (HCM)',
      description: 'Phù hợp dân văn phòng; kết hợp tròng blue-light.',
      price: '1050000',
      salePrice: null,
      frameMaterial: 'METAL',
      frameShape: 'RECTANGLE',
      lensType: 'BLUE_LIGHT',
      gender: 'MEN',
      stock: 18,
    },
    {
      slug: 'kinh-tot-hcm-cateye-08',
      warehouse: 'hcm',
      cat: 1,
      name: 'Kính mát mắt mèo oversize (HCM)',
      description: 'Tôn góc má, form lớn che nắng tốt.',
      price: '720000',
      salePrice: '650000',
      frameMaterial: 'PLASTIC',
      frameShape: 'CAT_EYE',
      lensType: 'SUNGLASSES',
      gender: 'WOMEN',
      stock: 22,
    },
    {
      slug: 'kinh-tot-hcm-aviator-09',
      warehouse: 'hcm',
      cat: 1,
      name: 'Aviator tráng gương bạc (HCM)',
      description: 'Tròng mirror, giảm chói mạnh trên đường.',
      price: '980000',
      salePrice: '899000',
      frameMaterial: 'METAL',
      frameShape: 'AVIATOR',
      lensType: 'SUNGLASSES',
      gender: 'UNISEX',
      stock: 14,
    },
    {
      slug: 'kinh-tot-hcm-progressive-10',
      warehouse: 'hcm',
      cat: 2,
      name: 'Gọng đa tròng Progressive nhựa TR (HCM)',
      description: 'Khung TR90 dẻo, đề xuất lắp tròng đa tiêu.',
      price: '1580000',
      salePrice: '1420000',
      frameMaterial: 'PLASTIC',
      frameShape: 'OVAL',
      lensType: 'PROGRESSIVE',
      gender: 'UNISEX',
      stock: 10,
    },
    {
      slug: 'kinh-tot-hcm-entry-11',
      warehouse: 'hcm',
      cat: 2,
      name: 'Gọng nhựa trong suốt entry (HCM)',
      description: 'Giá mềm, phù hợp học sinh sinh viên.',
      price: '320000',
      salePrice: '279000',
      frameMaterial: 'PLASTIC',
      frameShape: 'ROUND',
      lensType: 'SINGLE_VISION',
      gender: 'UNISEX',
      stock: 40,
    },
    {
      slug: 'kinh-tot-hcm-designer-12',
      warehouse: 'hcm',
      cat: 1,
      name: 'Kính mát designer vuông mảnh (HCM)',
      description: 'Đường nét sắc sảo, phối đồ streetwear.',
      price: '1850000',
      salePrice: '1690000',
      frameMaterial: 'METAL',
      frameShape: 'SQUARE',
      lensType: 'SUNGLASSES',
      gender: 'WOMEN',
      stock: 8,
    },
    {
      slug: 'kinh-tot-hcm-wood-13',
      warehouse: 'hcm',
      cat: 1,
      name: 'Kính gọng gỗ phối kim loại (HCM)',
      description: 'Gỗ tự nhiên xử lý chống ẩm, độc bản.',
      price: '1350000',
      salePrice: null,
      frameMaterial: 'WOOD',
      frameShape: 'RECTANGLE',
      lensType: 'SUNGLASSES',
      gender: 'MEN',
      stock: 7,
    },
    {
      slug: 'kinh-tot-hcm-bifocal-14',
      warehouse: 'hcm',
      cat: 2,
      name: 'Gọng cận hai tròng cổ điển (HCM)',
      description: 'Form nhỏ gọn, phù hợp người trung niên.',
      price: '560000',
      salePrice: '499000',
      frameMaterial: 'METAL',
      frameShape: 'OVAL',
      lensType: 'BIFOCAL',
      gender: 'UNISEX',
      stock: 15,
    },
    {
      slug: 'kinh-tot-hcm-flagship-15',
      warehouse: 'hcm',
      cat: 1,
      name: 'Kính mát flagship 2 triệu (HCM)',
      description: 'Tròng Zeiss-class chống UV400, gọng beta-titanium.',
      price: '2000000',
      salePrice: null,
      frameMaterial: 'TITANIUM',
      frameShape: 'AVIATOR',
      lensType: 'SUNGLASSES',
      gender: 'UNISEX',
      stock: 4,
    },
    {
      slug: 'kinh-tot-hcm-oval-16',
      warehouse: 'hcm',
      cat: 2,
      name: 'Gọng oval titan mảnh (HCM)',
      description: 'Siêu nhẹ 6g, đeo cả ngày không mỏi.',
      price: '1100000',
      salePrice: '990000',
      frameMaterial: 'TITANIUM',
      frameShape: 'OVAL',
      lensType: 'SINGLE_VISION',
      gender: 'WOMEN',
      stock: 19,
    },
    {
      slug: 'kinh-tot-hcm-club-17',
      warehouse: 'hcm',
      cat: 1,
      name: 'Clubmaster đồi mồi — HCM',
      description: 'Nửa viền trên acetate, dưới ve kim loại.',
      price: '690000',
      salePrice: '620000',
      frameMaterial: 'ACETATE',
      frameShape: 'SQUARE',
      lensType: 'SUNGLASSES',
      gender: 'MEN',
      stock: 21,
    },
    // --- Kho HN (sellerHn) ---
    {
      slug: 'kinh-tot-hn-classic-01',
      warehouse: 'hn',
      cat: 1,
      name: 'Kính râm Classic gọng đen (HN)',
      description: 'Cùng dòng với HCM — lấy hàng kho Hà Nội.',
      price: '450000',
      salePrice: '389000',
      frameMaterial: 'ACETATE',
      frameShape: 'SQUARE',
      lensType: 'SUNGLASSES',
      gender: 'UNISEX',
      stock: 18,
    },
    {
      slug: 'kinh-tot-hn-premium-02',
      warehouse: 'hn',
      cat: 1,
      name: 'Kính mát Premium Titan (HN)',
      description: 'Gọng titan, tròng phân cực cao cấp.',
      price: '1250000',
      salePrice: '1140000',
      frameMaterial: 'TITANIUM',
      frameShape: 'RECTANGLE',
      lensType: 'SUNGLASSES',
      gender: 'MEN',
      stock: 11,
    },
    {
      slug: 'kinh-tot-hn-sport-03',
      warehouse: 'hn',
      cat: 1,
      name: 'Kính thể thao trẻ em (HN)',
      description: 'Size nhỏ, dây đeo chống rơi.',
      price: '340000',
      salePrice: null,
      frameMaterial: 'PLASTIC',
      frameShape: 'RECTANGLE',
      lensType: 'SUNGLASSES',
      gender: 'UNISEX',
      stock: 25,
    },
    {
      slug: 'kinh-tot-hn-luxury-04',
      warehouse: 'hn',
      cat: 1,
      name: 'Kính mát luxury rose-gold (HN)',
      description: 'Viền hồng gold, nữ tính sang trọng.',
      price: '1980000',
      salePrice: '1850000',
      frameMaterial: 'METAL',
      frameShape: 'CAT_EYE',
      lensType: 'SUNGLASSES',
      gender: 'WOMEN',
      stock: 6,
    },
    {
      slug: 'kinh-tot-hn-round-05',
      warehouse: 'hn',
      cat: 1,
      name: 'Kính tròn gọng vàng cổ điển (HN)',
      description: 'John Lennon vibe, tròng xám nhạt.',
      price: '590000',
      salePrice: '520000',
      frameMaterial: 'METAL',
      frameShape: 'ROUND',
      lensType: 'SUNGLASSES',
      gender: 'UNISEX',
      stock: 17,
    },
    {
      slug: 'kinh-tot-hn-optical-06',
      warehouse: 'hn',
      cat: 2,
      name: 'Gọng cận nhựa đen mờ (HN)',
      description: 'Surface matte, chống vân tay.',
      price: '780000',
      salePrice: '690000',
      frameMaterial: 'PLASTIC',
      frameShape: 'RECTANGLE',
      lensType: 'SINGLE_VISION',
      gender: 'MEN',
      stock: 26,
    },
    {
      slug: 'kinh-tot-hn-bluecut-07',
      warehouse: 'hn',
      cat: 2,
      name: 'Gọng half-rim blue-light (HN)',
      description: 'Nửa viền kim loại, thanh thoát.',
      price: '990000',
      salePrice: null,
      frameMaterial: 'METAL',
      frameShape: 'RECTANGLE',
      lensType: 'BLUE_LIGHT',
      gender: 'WOMEN',
      stock: 16,
    },
    {
      slug: 'kinh-tot-hn-cateye-08',
      warehouse: 'hn',
      cat: 1,
      name: 'Kính mát mắt mèo đỏ rượu (HN)',
      description: 'Màu burgundy, nổi bật mùa thu đông.',
      price: '740000',
      salePrice: '670000',
      frameMaterial: 'ACETATE',
      frameShape: 'CAT_EYE',
      lensType: 'SUNGLASSES',
      gender: 'WOMEN',
      stock: 13,
    },
    {
      slug: 'kinh-tot-hn-aviator-09',
      warehouse: 'hn',
      cat: 1,
      name: 'Aviator xanh lá gradient (HN)',
      description: 'Gradient từ xanh đậm tới trong.',
      price: '920000',
      salePrice: '840000',
      frameMaterial: 'METAL',
      frameShape: 'AVIATOR',
      lensType: 'SUNGLASSES',
      gender: 'MEN',
      stock: 15,
    },
    {
      slug: 'kinh-tot-hn-progressive-10',
      warehouse: 'hn',
      cat: 2,
      name: 'Gọng progressive acetate dày (HN)',
      description: 'Càng kính logo khắc chìm tinh xảo.',
      price: '1650000',
      salePrice: '1490000',
      frameMaterial: 'ACETATE',
      frameShape: 'RECTANGLE',
      lensType: 'PROGRESSIVE',
      gender: 'UNISEX',
      stock: 9,
    },
    {
      slug: 'kinh-tot-hn-entry-11',
      warehouse: 'hn',
      cat: 2,
      name: 'Gọng nhựa basic (HN)',
      description: 'Giá học sinh, nhiều màu.',
      price: '290000',
      salePrice: '249000',
      frameMaterial: 'PLASTIC',
      frameShape: 'SQUARE',
      lensType: 'SINGLE_VISION',
      gender: 'UNISEX',
      stock: 45,
    },
    {
      slug: 'kinh-tot-hn-designer-12',
      warehouse: 'hn',
      cat: 1,
      name: 'Kính mát designer shield (HN)',
      description: 'Mặt nạ một mảnh, phong cách Y2K.',
      price: '1750000',
      salePrice: '1590000',
      frameMaterial: 'PLASTIC',
      frameShape: 'RECTANGLE',
      lensType: 'SUNGLASSES',
      gender: 'UNISEX',
      stock: 7,
    },
    {
      slug: 'kinh-tot-hn-wood-13',
      warehouse: 'hn',
      cat: 1,
      name: 'Kính gỗ walnut (HN)',
      description: 'Vân gỗ óc chó tự nhiên.',
      price: '1280000',
      salePrice: null,
      frameMaterial: 'WOOD',
      frameShape: 'RECTANGLE',
      lensType: 'SUNGLASSES',
      gender: 'MEN',
      stock: 5,
    },
    {
      slug: 'kinh-tot-hn-bifocal-14',
      warehouse: 'hn',
      cat: 2,
      name: 'Gọng hai tròng kim loại vàng (HN)',
      description: 'Oval nhỏ, lịch sự.',
      price: '610000',
      salePrice: '549000',
      frameMaterial: 'METAL',
      frameShape: 'OVAL',
      lensType: 'BIFOCAL',
      gender: 'UNISEX',
      stock: 12,
    },
    {
      slug: 'kinh-tot-hn-flagship-15',
      warehouse: 'hn',
      cat: 1,
      name: 'Kính mát flagship 2 triệu (HN)',
      description: 'Đối trọng flagship kho phía Bắc.',
      price: '2000000',
      salePrice: null,
      frameMaterial: 'TITANIUM',
      frameShape: 'SQUARE',
      lensType: 'SUNGLASSES',
      gender: 'UNISEX',
      stock: 4,
    },
    {
      slug: 'kinh-tot-hn-oval-16',
      warehouse: 'hn',
      cat: 2,
      name: 'Gọng oval vàng champagne (HN)',
      description: 'Mảnh mai, hợp mặt nhỏ.',
      price: '1150000',
      salePrice: '1040000',
      frameMaterial: 'METAL',
      frameShape: 'OVAL',
      lensType: 'SINGLE_VISION',
      gender: 'WOMEN',
      stock: 18,
    },
    {
      slug: 'kinh-tot-hn-club-17',
      warehouse: 'hn',
      cat: 1,
      name: 'Clubmaster xám khói — HN',
      description: 'Tông xám khói hiện đại.',
      price: '670000',
      salePrice: '599000',
      frameMaterial: 'ACETATE',
      frameShape: 'SQUARE',
      lensType: 'SUNGLASSES',
      gender: 'MEN',
      stock: 20,
    },
  ];

  let seedImgIdx = 0;
  for (const row of extraCatalog) {
    const sellerId = row.warehouse === 'hn' ? sellerHn.id : seller.id;
    const categoryId = row.cat === 2 ? cat2.id : cat1.id;
    const imgKey = seedImageKeys[seedImgIdx % seedImageKeys.length];
    seedImgIdx += 1;
    const imgArr = images[imgKey];
    const payload = {
      sellerId,
      categoryId,
      name: row.name,
      description: row.description,
      price: row.price,
      salePrice: row.salePrice,
      images: imgArr,
      condition: 'NEW',
      frameMaterial: row.frameMaterial,
      frameShape: row.frameShape,
      lensType: row.lensType,
      gender: row.gender,
      stock: row.stock,
      isActive: true,
    };
    await prisma.product.upsert({
      where: { slug: row.slug },
      update: { ...payload },
      create: { ...payload, slug: row.slug },
    });
  }

  await prisma.product.upsert({
    where: { slug: 'ray-ban-wayfarer-classic' },
    update: { images: images.img1 },
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
    update: { sellerId: sellerHn.id, images: images.img2 },
    create: {
      sellerId: sellerHn.id,
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
    update: { sellerId: sellerHn.id, images: images.img3 },
    create: {
      sellerId: sellerHn.id,
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
    update: { sellerId: sellerHn.id, images: images.img4 },
    create: {
      sellerId: sellerHn.id,
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
    update: { images: images.img5 },
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
    update: { images: images.img6 },
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
    update: { images: images.img7 },
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
    update: { sellerId: sellerHn.id, images: images.img8 },
    create: {
      sellerId: sellerHn.id,
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
    update: { images: images.img9 },
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
    update: { sellerId: sellerHn.id, images: images.img10 },
    create: {
      sellerId: sellerHn.id,
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
    update: { images: images.img6 },
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
    update: { images: images.img7 },
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
    update: { images: images.img8 },
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


  await prisma.product.upsert({
    where: { slug: 'mock-used-1' },
    update: {
      sellerId: seller.id,
      categoryId: cat1.id,
      name: 'Retro Round Classic (Cũ)',
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
    },
    create: {
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
    },
  });

  await prisma.product.upsert({
    where: { slug: 'mock-used-2' },
    update: {
      sellerId: seller.id,
      categoryId: cat2.id,
      name: 'Titanium Rectangle Frame (Cũ)',
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
    },
    create: {
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
    },
  });

  await prisma.product.upsert({
    where: { slug: 'mock-used-3' },
    update: {
      sellerId: seller.id,
      categoryId: cat1.id,
      name: 'Vintage Cat-Eye Shades (Cũ)',
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
    },
    create: {
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
    },
  });

  await prisma.product.upsert({
    where: { slug: 'mock-used-4' },
    update: {
      sellerId: seller.id,
      categoryId: cat2.id,
      name: 'Half-Rim Business (Cũ)',
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
    },
    create: {
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
    },
  });

  const productCount = await prisma.product.count();
  console.log('Sample products ready. Total rows in products:', productCount);
  if (!resetProducts) {
    console.log('(Seed không xóa SP có sẵn. Reset sạch: đặt SEED_RESET_PRODUCTS=1 rồi chạy lại seed.)');
  }
  console.log('Test credentials:');
  console.log('- Customer: buyer@kinhtot.vn / buyer123');
  console.log('- Seller HCM: seller@kinhtot.vn / seller123');
  console.log('- Seller HN: seller2@kinhtot.vn / seller2123');
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
