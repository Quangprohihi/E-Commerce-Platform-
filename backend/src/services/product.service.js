const prisma = require('../config/prisma');
const { cloudinary, hasCloudinaryConfig } = require('../config/cloudinary');

function flattenImageValues(images) {
  if (!images) return [];
  if (Array.isArray(images)) return images;
  return [images];
}

function extractCloudinaryPublicIdFromUrl(url) {
  if (typeof url !== 'string') return null;
  if (!url.includes('res.cloudinary.com')) return null;

  const uploadMarker = '/upload/';
  const markerIndex = url.indexOf(uploadMarker);
  if (markerIndex === -1) return null;

  let pathPart = url.slice(markerIndex + uploadMarker.length);
  pathPart = pathPart.split('?')[0];

  const segments = pathPart.split('/').filter(Boolean);
  if (!segments.length) return null;

  let startIndex = 0;
  if (segments[0].includes(',') || /^[a-z]_[^/]+/.test(segments[0])) {
    startIndex = 1;
  }
  if (segments[startIndex] && /^v\d+$/.test(segments[startIndex])) {
    startIndex += 1;
  }

  const publicIdWithExt = segments.slice(startIndex).join('/');
  if (!publicIdWithExt) return null;

  return publicIdWithExt.replace(/\.[^/.?]+$/, '');
}

function extractCloudinaryPublicIds(images) {
  const values = flattenImageValues(images);
  const publicIds = values
    .map((item) => {
      if (typeof item === 'string') return extractCloudinaryPublicIdFromUrl(item);
      if (item && typeof item === 'object') {
        if (typeof item.publicId === 'string') return item.publicId;
        if (typeof item.url === 'string') return extractCloudinaryPublicIdFromUrl(item.url);
      }
      return null;
    })
    .filter(Boolean);

  return [...new Set(publicIds)];
}

async function deleteCloudinaryImages(images) {
  if (!hasCloudinaryConfig) return { attempted: 0, deleted: 0 };

  const uniquePublicIds = extractCloudinaryPublicIds(images);
  if (!uniquePublicIds.length) return { attempted: 0, deleted: 0 };

  let deleted = 0;
  for (const publicId of uniquePublicIds) {
    try {
      const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
      if (result?.result === 'ok' || result?.result === 'not found') deleted += 1;
    } catch {
      // Không chặn thao tác xóa sản phẩm nếu xóa ảnh cloud thất bại
    }
  }

  return { attempted: uniquePublicIds.length, deleted };
}

function buildWhere(query) {
  const where = { isActive: true };
  if (query.frameShape) where.frameShape = query.frameShape;
  if (query.frameMaterial) where.frameMaterial = query.frameMaterial;
  if (query.condition) where.condition = query.condition;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { description: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

async function getList(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 12));
  const skip = (page - 1) * limit;
  const where = buildWhere(query);

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        seller: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getBySlug(slug) {
  const product = await prisma.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      seller: { select: { id: true, fullName: true } },
    },
  });
  if (!product) throw Object.assign(new Error('Sản phẩm không tồn tại'), { statusCode: 404 });
  return product;
}

async function ensureSellerExists(sellerId) {
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    select: { id: true, role: true },
    include: { sellerProfile: true },
  });
  if (!seller || seller.role !== 'SELLER') {
    throw Object.assign(new Error('Seller không hợp lệ'), { statusCode: 400 });
  }

  if (!seller.sellerProfile || seller.sellerProfile.kycStatus !== 'APPROVED') {
    throw Object.assign(new Error('Tài khoản Seller chưa được duyệt KYC. Hãy hoàn tất thủ tục để có thể đăng bán sản phẩm.'), { statusCode: 403 });
  }
}

async function create(actorId, userRole, data) {
  let sellerId = actorId;
  if (userRole === 'STAFF' || userRole === 'ADMIN') {
    if (!data.sellerId) {
      throw Object.assign(new Error('Thiếu sellerId khi tạo sản phẩm bằng tài khoản staff/admin'), { statusCode: 400 });
    }
    sellerId = data.sellerId;
  } else if (userRole !== 'SELLER') {
    throw Object.assign(new Error('Bạn không có quyền tạo sản phẩm'), { statusCode: 403 });
  }
  await ensureSellerExists(sellerId);

  const payload = { ...data };
  delete payload.sellerId;

  const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) throw Object.assign(new Error('Slug đã tồn tại'), { statusCode: 400 });
  return prisma.product.create({
    data: {
      ...payload,
      slug: data.slug || slug,
      sellerId,
      images: data.images ? (Array.isArray(data.images) ? data.images : [data.images]) : null,
    },
    include: { category: true },
  });
}

async function update(productId, userId, userRole, data) {
  const canManageAllProducts = userRole === 'STAFF' || userRole === 'ADMIN';
  const product = await prisma.product.findFirst({
    where: canManageAllProducts ? { id: productId } : { id: productId, sellerId: userId },
  });
  if (!product) throw Object.assign(new Error('Sản phẩm không tồn tại'), { statusCode: 404 });

  const payload = { ...data };
  if (payload.sellerId) {
    if (!canManageAllProducts) {
      throw Object.assign(new Error('Bạn không có quyền đổi seller của sản phẩm'), { statusCode: 403 });
    }
    await ensureSellerExists(payload.sellerId);
  }

  const nextImages = data.images !== undefined
    ? (Array.isArray(data.images) ? data.images : [data.images])
    : undefined;

  const previousImagePublicIds = data.images !== undefined
    ? extractCloudinaryPublicIds(product.images)
    : [];

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      ...payload,
      images: nextImages,
    },
    include: { category: true },
  });

  let cloudinaryCleanup = { attempted: 0, deleted: 0 };
  if (data.images !== undefined) {
    const nextImagePublicIds = extractCloudinaryPublicIds(nextImages);
    const removedPublicIds = previousImagePublicIds.filter((publicId) => !nextImagePublicIds.includes(publicId));
    cloudinaryCleanup = await deleteCloudinaryImages(removedPublicIds.map((publicId) => ({ publicId })));
  }

  return { ...updated, cloudinaryCleanup };
}

async function remove(productId, userId, userRole) {
  const canManageAllProducts = userRole === 'STAFF' || userRole === 'ADMIN';
  const product = await prisma.product.findFirst({
    where: canManageAllProducts ? { id: productId } : { id: productId, sellerId: userId },
  });
  if (!product) throw Object.assign(new Error('Sản phẩm không tồn tại'), { statusCode: 404 });

  const cloudinaryCleanup = await deleteCloudinaryImages(product.images);
  await prisma.product.update({ where: { id: productId }, data: { isActive: false } });
  return { deleted: true, cloudinaryCleanup };
}

module.exports = { getList, getBySlug, create, update, remove };
