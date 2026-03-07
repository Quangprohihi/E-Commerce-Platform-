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

/**
 * Lấy KPIs tổng quan cho Admin Dashboard trong 1 call duy nhất.
 * @param {{ startDate?: string|null, endDate?: string|null }} options
 */
async function getAdminStats({ startDate, endDate } = {}) {
  // Build date boundaries for the selected period
  const now = new Date();
  const fromDate = startDate
    ? new Date(`${startDate}T00:00:00`)
    : (() => { const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d; })();
  const toDate = endDate
    ? new Date(`${endDate}T23:59:59`)
    : (() => { const d = new Date(now); d.setHours(23, 59, 59, 999); return d; })();

  const dateFilter = { gte: fromDate, lte: toDate };
  const diffDays = Math.max(1, Math.round((toDate - fromDate) / 86_400_000) + 1);

  const [
    totalRevenueAgg,
    totalGmvAgg,
    orderGroups,
    pendingWithdrawals,
    userGroups,
    recentOrders,
    topSellerGroups,
    trendOrders,
    userTrendRows,
    topProductGroups,
    lowStockRaw,
  ] = await Promise.all([
    // Doanh thu thực (chỉ đơn DELIVERED trong khoảng)
    prisma.order.aggregate({
      where: { status: 'DELIVERED', createdAt: dateFilter },
      _sum: { totalAmount: true },
    }),
    // GMV (tất cả đơn không CANCELLED trong khoảng)
    prisma.order.aggregate({
      where: { status: { not: 'CANCELLED' }, createdAt: dateFilter },
      _sum: { totalAmount: true },
    }),
    // Số đơn theo trạng thái trong khoảng
    prisma.order.groupBy({
      by: ['status'],
      where: { createdAt: dateFilter },
      _count: { id: true },
    }),
    // Yêu cầu rút tiền đang chờ (luôn là số hiện tại, không lọc ngày)
    prisma.withdrawalRequest.count({ where: { status: 'PENDING' } }),
    // Số user theo role (luôn là tổng cộng)
    prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
    // 6 đơn gần nhất trong khoảng
    prisma.order.findMany({
      where: { createdAt: dateFilter },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true, status: true, totalAmount: true, createdAt: true,
        buyer: { select: { fullName: true, email: true } },
      },
    }),
    // Top sellers trong khoảng
    prisma.order.groupBy({
      by: ['sellerId'],
      where: { status: 'DELIVERED', createdAt: dateFilter },
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 5,
    }),
    // Revenue trend trong khoảng
    prisma.order.findMany({
      where: { createdAt: dateFilter },
      select: { createdAt: true, totalAmount: true, status: true },
      orderBy: { createdAt: 'asc' },
    }),
    // User growth trend trong khoảng
    prisma.user.findMany({
      where: { createdAt: dateFilter },
      select: { createdAt: true, role: true },
      orderBy: { createdAt: 'asc' },
    }),
    // Top 5 products by quantity sold trong khoảng
    prisma.orderDetail.groupBy({
      by: ['productId'],
      where: { order: { status: 'DELIVERED', createdAt: dateFilter } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),
    // Sản phẩm sắp hết hàng (luôn là tồn kho hiện tại)
    prisma.product.findMany({
      where: { stock: { lte: 5 }, isActive: true },
      select: {
        id: true, name: true, stock: true,
        seller: { select: { fullName: true, email: true } },
      },
      orderBy: { stock: 'asc' },
      take: 10,
    }),
  ]);

  const orderCountByStatus = {};
  for (const g of orderGroups) orderCountByStatus[g.status] = g._count.id;

  const userCountByRole = {};
  for (const g of userGroups) userCountByRole[g.role] = g._count.id;

  // Resolve seller names
  const sellerIds = topSellerGroups.map((g) => g.sellerId).filter(Boolean);
  const sellers = sellerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: sellerIds } },
        select: { id: true, fullName: true, email: true },
      })
    : [];
  const sellerMap = new Map(sellers.map((s) => [s.id, s]));
  const topSellers = topSellerGroups.map((g) => ({
    sellerId: g.sellerId,
    sellerName: sellerMap.get(g.sellerId)?.fullName || sellerMap.get(g.sellerId)?.email || g.sellerId,
    revenue: Number(g._sum?.totalAmount ?? 0),
    orderCount: g._count.id,
  }));

  // Build revenue trend for the selected range (fill all days)
  const trendMap = new Map();
  for (let i = 0; i < diffDays; i++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    trendMap.set(key, { date: key, revenue: 0, gmv: 0 });
  }
  for (const o of trendOrders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    if (trendMap.has(key)) {
      const cur = trendMap.get(key);
      if (o.status !== 'CANCELLED') cur.gmv += Number(o.totalAmount);
      if (o.status === 'DELIVERED') cur.revenue += Number(o.totalAmount);
    }
  }
  const revenueTrend = Array.from(trendMap.values());

  // Build user growth trend for the selected range
  const userTrendMap = new Map();
  for (let i = 0; i < diffDays; i++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    userTrendMap.set(key, { date: key, newUsers: 0, newSellers: 0 });
  }
  for (const u of userTrendRows) {
    const key = u.createdAt.toISOString().slice(0, 10);
    if (userTrendMap.has(key)) {
      const cur = userTrendMap.get(key);
      cur.newUsers += 1;
      if (u.role === 'SELLER') cur.newSellers += 1;
    }
  }
  const userGrowthTrend = Array.from(userTrendMap.values());

  // Resolve top product names
  const productIds = topProductGroups.map((g) => g.productId).filter(Boolean);
  const products = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      })
    : [];
  const productMap = new Map(products.map((p) => [p.id, p]));
  const topProducts = topProductGroups.map((g) => ({
    productId: g.productId,
    productName: productMap.get(g.productId)?.name || g.productId,
    quantitySold: g._sum?.quantity ?? 0,
  }));

  const lowStockProducts = lowStockRaw.map((p) => ({
    id: p.id,
    name: p.name,
    stock: p.stock,
    sellerName: p.seller?.fullName || p.seller?.email || '--',
  }));

  return {
    totalRevenue: Number(totalRevenueAgg._sum?.totalAmount ?? 0),
    totalGmv: Number(totalGmvAgg._sum?.totalAmount ?? 0),
    orderCounts: {
      total: Object.values(orderCountByStatus).reduce((a, b) => a + b, 0),
      pending: orderCountByStatus.PENDING ?? 0,
      confirmed: orderCountByStatus.CONFIRMED ?? 0,
      shipping: orderCountByStatus.SHIPPING ?? 0,
      delivered: orderCountByStatus.DELIVERED ?? 0,
      cancelled: orderCountByStatus.CANCELLED ?? 0,
    },
    pendingWithdrawals,
    userCounts: {
      total: Object.values(userCountByRole).reduce((a, b) => a + b, 0),
      buyers: userCountByRole.BUYER ?? 0,
      sellers: userCountByRole.SELLER ?? 0,
      staff: userCountByRole.STAFF ?? 0,
      admins: userCountByRole.ADMIN ?? 0,
    },
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      createdAt: o.createdAt,
      buyerName: o.buyer?.fullName || o.buyer?.email || '--',
    })),
    topSellers,
    revenueTrend,
    userGrowthTrend,
    topProducts,
    lowStockProducts,
  };
}

module.exports = { getHomeStats, getAdminStats };
