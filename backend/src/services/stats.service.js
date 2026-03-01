const prisma = require('../config/prisma');

/** Slug ứng với 6 card danh mục trên homepage (theo thứ tự). */
const HOME_CATEGORY_SLUGS = ['kinh-ram', 'gong-kinh', 'trong-kinh', 'phu-kien'];

/**
 * Lấy thống kê cho trang chủ: tổng SP, tổng KH, % đánh giá tích cực, số SP theo danh mục/kính cũ/chống ánh sáng xanh.
 */
async function getHomeStats() {
  const baseProductWhere = { isActive: true };

  const [
    totalProducts,
    totalCustomers,
    reviewStats,
    categoryCounts,
    usedCount,
    blueLightCount,
    categoriesMeta,
  ] = await Promise.all([
    prisma.product.count({ where: baseProductWhere }),
    prisma.user.count({ where: { role: 'BUYER' } }),
    Promise.all([
      prisma.review.count(),
      prisma.review.count({ where: { rating: { gte: 4 } } }),
    ]).then(([total, positive]) => ({ total, positive })),
    prisma.product.groupBy({
      by: ['categoryId'],
      where: baseProductWhere,
      _count: { id: true },
    }),
    prisma.product.count({ where: { ...baseProductWhere, condition: 'USED' } }),
    prisma.product.count({ where: { ...baseProductWhere, lensType: 'BLUE_LIGHT' } }),
    prisma.category.findMany({
      where: { slug: { in: HOME_CATEGORY_SLUGS } },
      select: { id: true, slug: true, name: true },
    }),
  ]);

  const categoryById = new Map(categoriesMeta.map((c) => [c.id, c]));
  const countBySlug = new Map();
  for (const row of categoryCounts) {
    const cat = categoryById.get(row.categoryId);
    if (cat) countBySlug.set(cat.slug, row._count.id);
  }

  const categories = HOME_CATEGORY_SLUGS.map((slug) => {
    const meta = categoriesMeta.find((c) => c.slug === slug);
    return {
      slug,
      name: meta?.name ?? slug,
      count: countBySlug.get(slug) ?? 0,
    };
  });

  const totalReviews = reviewStats.total;
  const positiveReviewPercent =
    totalReviews > 0 ? Math.round((reviewStats.positive / totalReviews) * 100) : 0;

  return {
    totalProducts,
    totalCustomers,
    positiveReviewPercent,
    categories,
    usedCount,
    blueLightCount,
  };
}

module.exports = { getHomeStats };
