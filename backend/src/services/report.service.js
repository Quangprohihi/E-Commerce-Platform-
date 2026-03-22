const prisma = require('../config/prisma');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const REPORT_TYPES = ['sales', 'users', 'products', 'reviews', 'sellerRevenue', 'categoryRevenue', 'trend'];

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildDateFilter(fromDate, toDate) {
  const filter = {};
  const from = parseDate(fromDate);
  const to = parseDate(toDate);
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.gte = from;
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.lte = end;
    }
  }
  return filter;
}

async function getSummary(reportType, filters = {}) {
  if (!REPORT_TYPES.includes(reportType)) {
    throw Object.assign(new Error('Loại báo cáo không hợp lệ'), { statusCode: 400 });
  }
  const { fromDate, toDate, status } = filters;
  const dateFilter = buildDateFilter(fromDate, toDate);

  if (reportType === 'sales') {
    const where = { ...dateFilter };
    if (status) where.status = status;
    const deliveredWhere = { ...dateFilter, status: 'DELIVERED' };
    const [count, agg, deliveredAgg] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.aggregate({ where, _sum: { totalAmount: true } }),
      prisma.order.aggregate({ where: deliveredWhere, _sum: { totalAmount: true } }),
    ]);
    const totalAmount = agg._sum?.totalAmount != null ? Number(agg._sum.totalAmount) : 0;
    const deliveredAmount = deliveredAgg._sum?.totalAmount != null ? Number(deliveredAgg._sum.totalAmount) : 0;
    return { count, totalAmount, deliveredAmount, reportType: 'sales' };
  }

  if (reportType === 'users') {
    const where = dateFilter;
    const count = await prisma.user.count({ where: Object.keys(where).length ? where : undefined });
    return { count, reportType: 'users' };
  }

  if (reportType === 'products') {
    const where = dateFilter;
    const count = await prisma.product.count({ where: Object.keys(where).length ? where : undefined });
    return { count, reportType: 'products' };
  }

  if (reportType === 'reviews') {
    const where = dateFilter;
    const count = await prisma.review.count({ where: Object.keys(where).length ? where : undefined });
    return { count, reportType: 'reviews' };
  }

  if (reportType === 'sellerRevenue') {
    const where = { ...dateFilter, status: 'DELIVERED' };
    const groups = await prisma.order.groupBy({
      by: ['sellerId'],
      where,
      _sum: { totalAmount: true },
      _count: { id: true },
    });
    const sellerCount = groups.length;
    const totalRevenue = groups.reduce((sum, g) => sum + Number(g._sum?.totalAmount ?? 0), 0);
    return { count: sellerCount, totalRevenue, reportType: 'sellerRevenue' };
  }

  if (reportType === 'categoryRevenue') {
    const dateWhere = Object.keys(dateFilter).length ? dateFilter : {};
    const orderWhere = { ...dateWhere, status: 'DELIVERED' };
    const details = await prisma.orderDetail.findMany({
      where: { order: orderWhere },
      select: {
        quantity: true,
        price: true,
        product: { select: { category: { select: { id: true, name: true } } } },
      },
    });
    const catMap = new Map();
    for (const d of details) {
      const cat = d.product?.category;
      if (!cat) continue;
      const cur = catMap.get(cat.id) || { name: cat.name, revenue: 0, itemCount: 0 };
      cur.revenue += Number(d.price) * d.quantity;
      cur.itemCount += d.quantity;
      catMap.set(cat.id, cur);
    }
    return { count: catMap.size, reportType: 'categoryRevenue' };
  }

  if (reportType === 'trend') {
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 29);
    const from = parseDate(filters.fromDate) || defaultFrom;
    const to = parseDate(filters.toDate) || new Date();
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true, totalAmount: true, status: true },
    });
    const totalDays = Math.ceil((to - from) / 86400000) + 1;
    return { count: orders.length, totalDays, reportType: 'trend' };
  }

  return {};
}

async function getDetail(reportType, filters = {}, pagination = {}) {
  if (!REPORT_TYPES.includes(reportType)) {
    throw Object.assign(new Error('Loại báo cáo không hợp lệ'), { statusCode: 400 });
  }
  const { fromDate, toDate, status } = filters;
  const dateFilter = buildDateFilter(fromDate, toDate);
  const page = Math.max(1, parseInt(pagination.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 20));
  const skip = (page - 1) * limit;

  if (reportType === 'sales') {
    const where = { ...dateFilter };
    if (status) where.status = status;
    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          buyer: { select: { id: true, fullName: true, email: true, phone: true } },
          details: {
            include: {
              product: { select: { id: true, name: true, slug: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);
    const rows = items.map((o) => ({
      id: o.id,
      buyerName: o.buyer?.fullName,
      buyerEmail: o.buyer?.email,
      totalAmount: Number(o.totalAmount),
      status: o.status,
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt,
      itemCount: o.details?.length ?? 0,
    }));
    return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  if (reportType === 'users') {
    const where = dateFilter;
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where: Object.keys(where).length ? where : undefined,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          createdAt: true,
          sellerProfile: { select: { shopName: true, kycStatus: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: Object.keys(where).length ? where : undefined }),
    ]);
    const rows = items.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      role: u.role,
      shopName: u.sellerProfile?.shopName,
      kycStatus: u.sellerProfile?.kycStatus,
      createdAt: u.createdAt,
    }));
    return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  if (reportType === 'products') {
    const where = dateFilter;
    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where: Object.keys(where).length ? where : undefined,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          salePrice: true,
          stock: true,
          isActive: true,
          condition: true,
          createdAt: true,
          seller: { select: { fullName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.product.count({ where: Object.keys(where).length ? where : undefined }),
    ]);
    const rows = items.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      salePrice: p.salePrice != null ? Number(p.salePrice) : null,
      stock: p.stock,
      isActive: p.isActive,
      condition: p.condition,
      sellerName: p.seller?.fullName,
      createdAt: p.createdAt,
    }));
    return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  if (reportType === 'reviews') {
    const where = dateFilter;
    const [items, total] = await Promise.all([
      prisma.review.findMany({
        where: Object.keys(where).length ? where : undefined,
        include: {
          user: { select: { fullName: true, email: true } },
          product: { select: { name: true, slug: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: Object.keys(where).length ? where : undefined }),
    ]);
    const rows = items.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      userName: r.user?.fullName,
      userEmail: r.user?.email,
      productName: r.product?.name,
      createdAt: r.createdAt,
    }));
    return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  if (reportType === 'sellerRevenue') {
    const where = { ...dateFilter, status: 'DELIVERED' };
    const groups = await prisma.order.groupBy({
      by: ['sellerId'],
      where,
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
    });
    const total = groups.length;
    const pageGroups = groups.slice(skip, skip + limit);
    const sellerIds = pageGroups.map((g) => g.sellerId).filter(Boolean);
    const sellers = sellerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: sellerIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
    const sellerMap = new Map(sellers.map((s) => [s.id, s]));
    const rows = pageGroups.map((g) => ({
      sellerId: g.sellerId,
      sellerName: sellerMap.get(g.sellerId)?.fullName || '--',
      sellerEmail: sellerMap.get(g.sellerId)?.email || '--',
      orderCount: g._count.id,
      revenue: Number(g._sum?.totalAmount ?? 0),
    }));
    return { items: rows, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  if (reportType === 'categoryRevenue') {
    const dateWhere = Object.keys(dateFilter).length ? dateFilter : {};
    const orderWhere = { ...dateWhere, status: 'DELIVERED' };
    const details = await prisma.orderDetail.findMany({
      where: { order: orderWhere },
      select: {
        quantity: true,
        price: true,
        product: { select: { category: { select: { id: true, name: true } } } },
      },
    });
    const catMap = new Map();
    for (const d of details) {
      const cat = d.product?.category;
      if (!cat) continue;
      const cur = catMap.get(cat.id) || { categoryId: cat.id, categoryName: cat.name, revenue: 0, itemCount: 0 };
      cur.revenue += Number(d.price) * d.quantity;
      cur.itemCount += d.quantity;
      catMap.set(cat.id, cur);
    }
    const allRows = Array.from(catMap.values()).sort((a, b) => b.revenue - a.revenue);
    const total = allRows.length;
    const rows = allRows.slice(skip, skip + limit);
    return { items: rows, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  if (reportType === 'trend') {
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 29);
    const from = parseDate(filters.fromDate) || defaultFrom;
    const to = parseDate(filters.toDate) || new Date();
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: from, lte: toEnd } },
      select: { createdAt: true, totalAmount: true, status: true },
      orderBy: { createdAt: 'asc' },
    });
    // Group by date string (YYYY-MM-DD)
    const dayMap = new Map();
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const cur = dayMap.get(key) || { date: key, orderCount: 0, revenue: 0 };
      cur.orderCount += 1;
      if (o.status === 'DELIVERED') cur.revenue += Number(o.totalAmount);
      dayMap.set(key, cur);
    }
    const allRows = Array.from(dayMap.values());
    const total = allRows.length;
    const rows = allRows.slice(skip, skip + limit);
    return { items: rows, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  return { items: [], total: 0, page: 1, limit, totalPages: 0 };
}

/** Fetch all detail rows for export (capped for safety) */
async function getDetailForExport(reportType, filters, maxRows = 5000) {
  return getDetail(reportType, filters, { page: 1, limit: maxRows });
}

function formatCell(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

async function exportExcel(reportType, filters) {
  if (!REPORT_TYPES.includes(reportType)) {
    throw Object.assign(new Error('Loại báo cáo không hợp lệ'), { statusCode: 400 });
  }
  const { items } = await getDetailForExport(reportType, filters);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(reportType, { headerFooter: { firstHeader: reportType } });

  if (reportType === 'sales') {
    sheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Người mua', key: 'buyerName', width: 20 },
      { header: 'Email', key: 'buyerEmail', width: 24 },
      { header: 'Tổng tiền', key: 'totalAmount', width: 14 },
      { header: 'Trạng thái', key: 'status', width: 12 },
      { header: 'Thanh toán', key: 'paymentMethod', width: 12 },
      { header: 'Ngày tạo', key: 'createdAt', width: 22 },
    ];
    items.forEach((row, i) => sheet.addRow({ stt: i + 1, ...row }));
  } else if (reportType === 'users') {
    sheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Email', key: 'email', width: 24 },
      { header: 'Họ tên', key: 'fullName', width: 20 },
      { header: 'Điện thoại', key: 'phone', width: 14 },
      { header: 'Role', key: 'role', width: 10 },
      { header: 'Cửa hàng', key: 'shopName', width: 18 },
      { header: 'KYC', key: 'kycStatus', width: 10 },
      { header: 'Ngày tạo', key: 'createdAt', width: 22 },
    ];
    items.forEach((row, i) => sheet.addRow({ stt: i + 1, ...row }));
  } else if (reportType === 'products') {
    sheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Tên', key: 'name', width: 24 },
      { header: 'Slug', key: 'slug', width: 20 },
      { header: 'Giá', key: 'price', width: 12 },
      { header: 'Giá sale', key: 'salePrice', width: 12 },
      { header: 'Tồn kho', key: 'stock', width: 8 },
      { header: 'Active', key: 'isActive', width: 8 },
      { header: 'Tình trạng', key: 'condition', width: 10 },
      { header: 'Seller', key: 'sellerName', width: 18 },
      { header: 'Ngày tạo', key: 'createdAt', width: 22 },
    ];
    items.forEach((row, i) => sheet.addRow({ stt: i + 1, ...row }));
  } else if (reportType === 'reviews') {
    sheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Điểm', key: 'rating', width: 8 },
      { header: 'Bình luận', key: 'comment', width: 30 },
      { header: 'Người đánh giá', key: 'userName', width: 18 },
      { header: 'Email', key: 'userEmail', width: 22 },
      { header: 'Sản phẩm', key: 'productName', width: 20 },
      { header: 'Ngày tạo', key: 'createdAt', width: 22 },
    ];
    items.forEach((row, i) => sheet.addRow({ stt: i + 1, ...row }));
  } else if (reportType === 'sellerRevenue') {
    sheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Seller', key: 'sellerName', width: 22 },
      { header: 'Email', key: 'sellerEmail', width: 26 },
      { header: 'Số đơn', key: 'orderCount', width: 10 },
      { header: 'Doanh thu (VNĐ)', key: 'revenue', width: 18 },
    ];
    items.forEach((row, i) => sheet.addRow({ stt: i + 1, ...row }));
  } else if (reportType === 'categoryRevenue') {
    sheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Danh mục', key: 'categoryName', width: 22 },
      { header: 'Số lượng sản phẩm', key: 'itemCount', width: 20 },
      { header: 'Doanh thu (VNĐ)', key: 'revenue', width: 18 },
    ];
    items.forEach((row, i) => sheet.addRow({ stt: i + 1, ...row }));
  } else if (reportType === 'trend') {
    sheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Ngày', key: 'date', width: 14 },
      { header: 'Số đơn', key: 'orderCount', width: 10 },
      { header: 'Doanh thu DELIVERED (VNĐ)', key: 'revenue', width: 26 },
    ];
    items.forEach((row, i) => sheet.addRow({ stt: i + 1, ...row }));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

async function exportPdf(reportType, filters) {
  if (!REPORT_TYPES.includes(reportType)) {
    throw Object.assign(new Error('Loại báo cáo không hợp lệ'), { statusCode: 400 });
  }
  const { items } = await getDetailForExport(reportType, filters);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text(`Báo cáo: ${reportType}`, { underline: true });
    doc.moveDown();
    const rowHeight = 18;
    const colWidths = reportType === 'sales' ? [30, 70, 90, 60, 50, 50, 80]
      : reportType === 'users' ? [30, 90, 70, 60, 40, 60, 40, 80]
      : reportType === 'products' ? [30, 90, 70, 50, 50, 40, 40, 50, 60, 80]
      : reportType === 'sellerRevenue' ? [30, 100, 130, 50, 100]
      : reportType === 'categoryRevenue' ? [30, 120, 80, 100]
      : reportType === 'trend' ? [30, 80, 60, 120]
      : [30, 30, 100, 60, 80, 70, 80];
    const headers = reportType === 'sales'
      ? ['STT', 'Người mua', 'Email', 'Tổng tiền', 'Trạng thái', 'TT', 'Ngày tạo']
      : reportType === 'users'
        ? ['STT', 'Email', 'Họ tên', 'Điện thoại', 'Role', 'Cửa hàng', 'KYC', 'Ngày tạo']
        : reportType === 'products'
          ? ['STT', 'Tên', 'Slug', 'Giá', 'Sale', 'Kho', 'Active', 'Condition', 'Seller', 'Ngày tạo']
          : reportType === 'sellerRevenue'
            ? ['STT', 'Seller', 'Email', 'Số đơn', 'Doanh thu']
            : reportType === 'categoryRevenue'
              ? ['STT', 'Danh mục', 'Số lượng', 'Doanh thu']
              : reportType === 'trend'
                ? ['STT', 'Ngày', 'Số đơn', 'Doanh thu DELIVERED']
                : ['STT', 'Điểm', 'Bình luận', 'User', 'Email', 'Sản phẩm', 'Ngày tạo'];
    let y = doc.y;
    headers.forEach((h, i) => {
      doc.fontSize(8).font('Helvetica-Bold').text(h, 40 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: colWidths[i], align: 'left' });
    });
    doc.moveDown(0.5);
    y = doc.y;
    doc.font('Helvetica');
    items.slice(0, 40).forEach((row, i) => {
      const vals = reportType === 'sales'
        ? [i + 1, row.buyerName, row.buyerEmail, row.totalAmount, row.status, row.paymentMethod || '', row.createdAt]
        : reportType === 'users'
          ? [i + 1, row.email, row.fullName, row.phone, row.role, row.shopName || '', row.kycStatus || '', row.createdAt]
          : reportType === 'products'
            ? [i + 1, row.name, row.slug, row.price, row.salePrice, row.stock, row.isActive, row.condition, row.sellerName || '', row.createdAt]
            : reportType === 'sellerRevenue'
              ? [i + 1, row.sellerName, row.sellerEmail, row.orderCount, row.revenue]
              : reportType === 'categoryRevenue'
                ? [i + 1, row.categoryName, row.itemCount, row.revenue]
                : reportType === 'trend'
                  ? [i + 1, row.date, row.orderCount, row.revenue]
                  : [i + 1, row.rating, (row.comment || '').slice(0, 30), row.userName, row.userEmail, row.productName, row.createdAt];
      vals.forEach((v, i) => {
        doc.fontSize(7).text(formatCell(v), 40 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: colWidths[i], align: 'left' });
      });
      y += rowHeight;
    });
    if (items.length > 40) {
      doc.fontSize(9).text(`... và ${items.length - 40} dòng khác (tải Excel để xem đầy đủ).`, 40, y);
    }
    doc.end();
  });
}

/**
 * Tổng quan doanh thu cố định 3 năm gần nhất (chỉ đơn DELIVERED).
 * Dùng raw query để aggregate theo năm/quý/tháng, tránh load toàn bộ orders.
 * @returns {{ totalRevenue: number, byYear: { year: number, revenue: number }[], byQuarter: { year: number, quarter: number, revenue: number }[], byMonth: { year: number, month: number, revenue: number }[] }}
 */
async function getRevenueOverview3y() {
  const toDate = new Date();
  toDate.setHours(23, 59, 59, 999);
  const fromDate = new Date(toDate);
  fromDate.setFullYear(fromDate.getFullYear() - 3);
  fromDate.setHours(0, 0, 0, 0);

  const { Prisma } = require('@prisma/client');

  const [totalRow, byYearRows, byQuarterRows, byMonthRows] = await Promise.all([
    prisma.$queryRaw(Prisma.sql`
      SELECT COALESCE(SUM(total_amount), 0)::float AS total
      FROM orders
      WHERE status = 'DELIVERED'
        AND created_at >= ${fromDate}
        AND created_at <= ${toDate}
    `),
    prisma.$queryRaw(Prisma.sql`
      SELECT EXTRACT(YEAR FROM created_at)::int AS year,
             COALESCE(SUM(total_amount), 0)::float AS revenue
      FROM orders
      WHERE status = 'DELIVERED'
        AND created_at >= ${fromDate}
        AND created_at <= ${toDate}
      GROUP BY EXTRACT(YEAR FROM created_at)
      ORDER BY year ASC
    `),
    prisma.$queryRaw(Prisma.sql`
      SELECT EXTRACT(YEAR FROM created_at)::int AS year,
             EXTRACT(QUARTER FROM created_at)::int AS quarter,
             COALESCE(SUM(total_amount), 0)::float AS revenue
      FROM orders
      WHERE status = 'DELIVERED'
        AND created_at >= ${fromDate}
        AND created_at <= ${toDate}
      GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(QUARTER FROM created_at)
      ORDER BY year ASC, quarter ASC
    `),
    prisma.$queryRaw(Prisma.sql`
      SELECT EXTRACT(YEAR FROM created_at)::int AS year,
             EXTRACT(MONTH FROM created_at)::int AS month,
             COALESCE(SUM(total_amount), 0)::float AS revenue
      FROM orders
      WHERE status = 'DELIVERED'
        AND created_at >= ${fromDate}
        AND created_at <= ${toDate}
      GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
      ORDER BY year ASC, month ASC
    `),
  ]);

  const totalRevenue = Number(totalRow?.[0]?.total ?? 0);
  const byYear = (byYearRows || []).map((r) => ({
    year: Number(r.year),
    revenue: Number(r.revenue ?? 0),
  }));
  const byQuarter = (byQuarterRows || []).map((r) => ({
    year: Number(r.year),
    quarter: Number(r.quarter),
    revenue: Number(r.revenue ?? 0),
  }));
  const byMonth = (byMonthRows || []).map((r) => ({
    year: Number(r.year),
    month: Number(r.month),
    revenue: Number(r.revenue ?? 0),
  }));

  return { totalRevenue, byYear, byQuarter, byMonth };
}

module.exports = {
  getSummary,
  getDetail,
  getDetailForExport,
  exportExcel,
  exportPdf,
  getRevenueOverview3y,
  REPORT_TYPES,
  buildDateFilter,
  parseDate,
};
