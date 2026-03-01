const prisma = require('../config/prisma');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const REPORT_TYPES = ['sales', 'users', 'products', 'reviews'];

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
    const [count, agg] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
    ]);
    const totalAmount = agg._sum?.totalAmount != null ? Number(agg._sum.totalAmount) : 0;
    return { count, totalAmount, reportType: 'sales' };
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
    const colWidths = reportType === 'sales' ? [30, 70, 90, 60, 50, 50, 80] : reportType === 'users' ? [30, 90, 70, 60, 40, 60, 40, 80] : reportType === 'products' ? [30, 90, 70, 50, 50, 40, 40, 50, 60, 80] : [30, 30, 100, 60, 80, 70, 80];
    const headers = reportType === 'sales'
      ? ['STT', 'Người mua', 'Email', 'Tổng tiền', 'Trạng thái', 'TT', 'Ngày tạo']
      : reportType === 'users'
        ? ['STT', 'Email', 'Họ tên', 'Điện thoại', 'Role', 'Cửa hàng', 'KYC', 'Ngày tạo']
        : reportType === 'products'
          ? ['STT', 'Tên', 'Slug', 'Giá', 'Sale', 'Kho', 'Active', 'Condition', 'Seller', 'Ngày tạo']
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

module.exports = {
  getSummary,
  getDetail,
  getDetailForExport,
  exportExcel,
  exportPdf,
  REPORT_TYPES,
  buildDateFilter,
  parseDate,
};
