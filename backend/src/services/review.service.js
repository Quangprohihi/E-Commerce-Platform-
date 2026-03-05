const prisma = require('../config/prisma');

async function list(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const where = {};
  if (query.productId) where.productId = query.productId;
  if (query.userId) where.userId = query.userId;

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, avatar: true } },
        product: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function create(userId, productId, rating, comment) {
  if (!productId) throw Object.assign(new Error('Thiếu productId'), { statusCode: 400 });
  const normalizedRating = parseInt(rating, 10);
  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    throw Object.assign(new Error('Rating phải nằm trong khoảng 1-5'), { statusCode: 400 });
  }

  const product = await prisma.product.findFirst({ where: { id: productId, isActive: true } });
  if (!product) throw Object.assign(new Error('Sản phẩm không tồn tại'), { statusCode: 404 });

  // Kiểm tra buyer đã nhận hàng chứa sản phẩm này chưa
  const deliveredOrder = await prisma.order.findFirst({
    where: {
      buyerId: userId,
      status: 'DELIVERED',
      details: { some: { productId } },
    },
  });
  if (!deliveredOrder) {
    throw Object.assign(
      new Error('Bạn chỉ có thể đánh giá sản phẩm từ đơn hàng đã giao thành công'),
      { statusCode: 403 },
    );
  }

  const existingReview = await prisma.review.findFirst({
    where: { userId, productId },
  });
  if (existingReview) {
    throw Object.assign(new Error('Bạn đã đánh giá sản phẩm này rồi'), { statusCode: 400 });
  }

  return prisma.review.create({
    data: {
      userId,
      productId,
      rating: normalizedRating,
      comment: comment || null,
    },
    include: {
      user: { select: { id: true, fullName: true, avatar: true } },
      product: { select: { id: true, name: true, slug: true } },
    },
  });
}

async function remove(reviewId, userId, userRole) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw Object.assign(new Error('Đánh giá không tồn tại'), { statusCode: 404 });

  const canManageAnyFeedback = userRole === 'STAFF' || userRole === 'ADMIN';
  if (!canManageAnyFeedback && review.userId !== userId) {
    throw Object.assign(new Error('Bạn không có quyền xóa đánh giá này'), { statusCode: 403 });
  }

  await prisma.review.delete({ where: { id: reviewId } });
  return { deleted: true };
}

module.exports = { list, create, remove };
