const crypto = require('crypto');
const prisma = require('../config/prisma');
const vnpayService = require('./vnpay.service');
const shippingConfig = require('../config/shipping.config');
const { calculateSellerOrderShipping, roundMoneyVnd } = require('./shipping/shippingCalculator');

const PAYMENT_VNPAY = 'VNPAY';
const PAYMENT_COD = 'COD';

function assertBuyerDistrictWardIfRequired(district, ward) {
  if (!shippingConfig.requireBuyerDistrictWard) return;
  const d = district?.trim?.() || '';
  const w = ward?.trim?.() || '';
  if (!d || !w) {
    throw Object.assign(
      new Error('Thiếu mã quận/huyện hoặc phường/xã giao hàng (buyerDistrictCode, buyerWardCode).'),
      { statusCode: 400 }
    );
  }
}

function normalizePaymentMethod(raw) {
  const u = String(raw || PAYMENT_VNPAY).toUpperCase();
  if (u === PAYMENT_COD) return PAYMENT_COD;
  return PAYMENT_VNPAY;
}

/** Map GHN ids từ FE (alias) vào cột Order hiện có. */
function normalizeBuyerAddress(body) {
  const p = body.buyerProvinceId ?? body.buyerProvinceCode;
  const d = body.buyerDistrictId ?? body.buyerDistrictCode;
  const w = body.buyerWardCode;
  const pc = p != null && String(p).trim() !== '' ? String(p).trim() : null;
  const dc = d != null && String(d).trim() !== '' ? String(d).trim() : null;
  const wc = w != null && String(w).trim() !== '' ? String(w).trim() : null;
  return { buyerProvinceCode: pc, buyerDistrictCode: dc, buyerWardCode: wc };
}

/**
 * Load products, group by seller, validate stock. Used by quote + create.
 */
async function loadAndGroupItemsForCheckout(items) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error('Danh sách sản phẩm không hợp lệ'), { statusCode: 400 });
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
  });
  if (products.length !== productIds.length) {
    throw Object.assign(new Error('Một hoặc nhiều sản phẩm không tồn tại hoặc đã ngừng bán'), { statusCode: 400 });
  }

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  const bySeller = new Map();

  for (const it of items) {
    const product = productMap[it.productId];
    if (!product) throw Object.assign(new Error(`Sản phẩm ${it.productId} không tồn tại`), { statusCode: 400 });
    const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
    if (product.stock < qty) {
      throw Object.assign(new Error(`Sản phẩm ${product.name} không đủ tồn kho`), { statusCode: 400 });
    }
    const price = Number(product.salePrice ?? product.price);
    const sellerId = product.sellerId;
    if (!bySeller.has(sellerId)) bySeller.set(sellerId, []);
    bySeller.get(sellerId).push({ productId: product.id, quantity: qty, price, product });
  }

  const decrements = {};
  for (const it of items) {
    const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
    decrements[it.productId] = (decrements[it.productId] || 0) + qty;
  }

  return { productMap, bySeller, decrements };
}

/**
 * @param {Map} bySeller
 * @param {{ buyerProvinceCode?: string|null, buyerDistrictCode?: string|null, buyerWardCode?: string|null }} buyerAddress
 * @param {string} paymentMethod
 */
async function computeShippingLines(bySeller, buyerAddress, paymentMethod) {
  const sellerIds = [...bySeller.keys()];
  const profiles = await prisma.sellerProfile.findMany({
    where: { userId: { in: sellerIds } },
    select: {
      userId: true,
      sellerProvinceId: true,
      sellerDistrictId: true,
      sellerWardCode: true,
    },
  });
  const profileMap = Object.fromEntries(profiles.map((p) => [p.userId, p]));

  const { buyerProvinceCode, buyerDistrictCode, buyerWardCode } = buyerAddress;

  const linePromises = [...bySeller.entries()].map(([sellerId, sellerItems]) => {
    const prof = profileMap[sellerId] || {};
    const sellerLines = sellerItems.map(({ quantity, price, product }) => ({
      quantity,
      price,
      product,
    }));
    return calculateSellerOrderShipping({
      sellerId,
      sellerLines,
      sellerProvinceId: prof.sellerProvinceId ?? null,
      sellerDistrictId: prof.sellerDistrictId ?? null,
      sellerWardCode: prof.sellerWardCode ?? null,
      buyerProvinceCode: buyerProvinceCode ?? null,
      buyerDistrictCode: buyerDistrictCode ?? null,
      buyerWardCode: buyerWardCode ?? null,
      paymentMethod,
    });
  });

  const lines = await Promise.all(linePromises);
  const grandTotal = roundMoneyVnd(lines.reduce((s, l) => s + l.lineTotal, 0));
  return { lines, grandTotal };
}

async function shippingQuote(_buyerId, body) {
  const { items, paymentMethod: pmRaw } = body;
  const paymentMethod = normalizePaymentMethod(pmRaw);
  const addr = normalizeBuyerAddress(body);
  assertBuyerDistrictWardIfRequired(addr.buyerDistrictCode, addr.buyerWardCode);
  const { bySeller } = await loadAndGroupItemsForCheckout(items);
  return computeShippingLines(bySeller, addr, paymentMethod);
}

async function create(buyerId, body) {
  const { items, shippingAddress, phone, note, paymentMethod: pmRaw } = body;
  if (!shippingAddress || !phone) {
    throw Object.assign(new Error('Thiếu địa chỉ giao hàng hoặc số điện thoại'), { statusCode: 400 });
  }

  const paymentMethod = normalizePaymentMethod(pmRaw);
  const addr = normalizeBuyerAddress(body);
  assertBuyerDistrictWardIfRequired(addr.buyerDistrictCode, addr.buyerWardCode);
  const { bySeller, decrements } = await loadAndGroupItemsForCheckout(items);
  const { lines: shippingLines, grandTotal } = await computeShippingLines(bySeller, addr, paymentMethod);

  const lineBySeller = Object.fromEntries(shippingLines.map((l) => [l.sellerId, l]));
  const orderGroupId = bySeller.size > 1 ? crypto.randomUUID() : null;

  const createdOrders = await prisma.$transaction(async (tx) => {
    const orders = [];
    for (const [sellerId, sellerItems] of bySeller) {
      const ship = lineBySeller[sellerId];
      const details = sellerItems.map(({ productId, quantity, price }) => ({
        productId,
        quantity,
        price,
      }));

      const itemsAmount = roundMoneyVnd(ship.itemsAmount);
      const shippingFee = roundMoneyVnd(ship.shippingFee);
      const shippingDiscount = roundMoneyVnd(ship.shippingDiscount);
      const codFee = roundMoneyVnd(ship.codFee);
      const totalAmount = roundMoneyVnd(ship.lineTotal);

      const order = await tx.order.create({
        data: {
          buyerId,
          sellerId,
          totalAmount,
          itemsAmount,
          shippingFee,
          shippingDiscount,
          codFee,
          buyerProvinceCode: addr.buyerProvinceCode,
          buyerDistrictCode: addr.buyerDistrictCode,
          buyerWardCode: addr.buyerWardCode,
          shippingAddress,
          phone,
          note: note || null,
          status: 'PENDING',
          paymentMethod,
          details: { create: details },
        },
        include: {
          details: { include: { product: { select: { id: true, name: true, slug: true, images: true } } } },
        },
      });
      orders.push(order);
    }
    if (orderGroupId && orders.length > 0) {
      await tx.order.updateMany({
        where: { id: { in: orders.map((o) => o.id) } },
        data: { orderGroupId },
      });
    }
    for (const [id, dec] of Object.entries(decrements)) {
      await tx.product.update({ where: { id }, data: { stock: { decrement: dec } } });
    }
    return orders;
  });

  return {
    orders: createdOrders,
    orderGroupId,
    totalAmount: grandTotal,
    shippingLines,
  };
}

async function getMyOrders(userId, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const where = { buyerId: userId };

  const [items, total, pendingCount, deliveredCount] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { details: { include: { product: { select: { id: true, name: true, slug: true, images: true } } } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
    prisma.order.count({ where: { ...where, status: 'PENDING' } }),
    prisma.order.count({ where: { ...where, status: 'DELIVERED' } }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    pendingCount,
    deliveredCount,
  };
}

async function getManageOrders(userId, userRole, query = {}) {
  if (!['SELLER', 'STAFF', 'ADMIN'].includes(userRole)) {
    throw Object.assign(new Error('Bạn không có quyền xem danh sách đơn hàng quản trị'), { statusCode: 403 });
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = {};
  if (query.status) where.status = query.status;
  if (query.orderId) {
    where.id = { contains: query.orderId, mode: 'insensitive' };
  }
  if (query.search) {
    where.OR = [
      { id: { contains: query.search, mode: 'insensitive' } },
      { buyer: { fullName: { contains: query.search, mode: 'insensitive' } } },
      { buyer: { email: { contains: query.search, mode: 'insensitive' } } },
      { buyer: { phone: { contains: query.search, mode: 'insensitive' } } },
    ];
  }

  if (userRole === 'SELLER') {
    where.OR = [
      { sellerId: userId },
      { sellerId: null, details: { some: { product: { sellerId: userId } } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        buyer: { select: { id: true, fullName: true, email: true, phone: true } },
        details: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                sellerId: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

async function getById(orderId, userId, isStaffOrAdminOrSeller = false) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { details: { include: { product: true } }, buyer: { select: { id: true, fullName: true, email: true, phone: true } } },
  });
  if (!order) throw Object.assign(new Error('Đơn hàng không tồn tại'), { statusCode: 404 });
  if (!isStaffOrAdminOrSeller && order.buyerId !== userId) {
    throw Object.assign(new Error('Bạn không có quyền xem đơn hàng này'), { statusCode: 403 });
  }
  return order;
}

async function updateStatus(orderId, status, userId, userRole) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw Object.assign(new Error('Đơn hàng không tồn tại'), { statusCode: 404 });
  const allowed = ['CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'];
  if (!allowed.includes(status)) throw Object.assign(new Error('Trạng thái không hợp lệ'), { statusCode: 400 });

  if (status === 'CANCELLED' && order.buyerId === userId) {
    return prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
  }

  if (status === 'DELIVERED') {
    if (order.status !== 'SHIPPING') {
      throw Object.assign(new Error('Chỉ đơn đang giao mới có thể chuyển sang Đã giao'), { statusCode: 400 });
    }
    if (order.buyerId === userId) {
      return prisma.order.update({ where: { id: orderId }, data: { status: 'DELIVERED' } });
    }
    if (userRole === 'ADMIN') {
      return prisma.order.update({ where: { id: orderId }, data: { status: 'DELIVERED' } });
    }
    throw Object.assign(new Error('Chỉ buyer mới được xác nhận đã nhận hàng, hoặc Admin để ghi đè'), { statusCode: 403 });
  }

  if (userRole !== 'ADMIN' && userRole !== 'SELLER' && userRole !== 'STAFF') {
    throw Object.assign(new Error('Chỉ admin/seller/staff mới được cập nhật trạng thái'), { statusCode: 403 });
  }

  const data = { status };
  if (status === 'SHIPPING') data.shippedAt = new Date();
  return prisma.order.update({ where: { id: orderId }, data });
}

async function createVnpayPaymentUrl(orderId, userId, req) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw Object.assign(new Error('Đơn hàng không tồn tại'), { statusCode: 404 });
  if (order.buyerId !== userId) throw Object.assign(new Error('Bạn không có quyền thanh toán đơn hàng này'), { statusCode: 403 });
  if (order.status !== 'PENDING') throw Object.assign(new Error('Đơn hàng không ở trạng thái chờ thanh toán'), { statusCode: 400 });

  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded?.[0])?.trim() || req.socket?.remoteAddress || req.ip || '127.0.0.1';
  const orderInfo = `Thanh toan don hang ${orderId}`;
  const amountVnd = Number(order.totalAmount);
  const paymentUrl = vnpayService.buildPaymentUrl(orderId, amountVnd, orderInfo, clientIp);
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentMethod: 'VNPAY' },
  });
  return { paymentUrl };
}

async function createVnpayPaymentUrlForGroup(orderGroupId, userId, req) {
  const orders = await prisma.order.findMany({
    where: { orderGroupId, buyerId: userId, status: 'PENDING' },
  });
  if (!orders.length) throw Object.assign(new Error('Không tìm thấy đơn hàng hoặc đã thanh toán'), { statusCode: 404 });
  const totalAmount = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  if (totalAmount <= 0) throw Object.assign(new Error('Tổng tiền không hợp lệ'), { statusCode: 400 });

  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded?.[0])?.trim() || req.socket?.remoteAddress || req.ip || '127.0.0.1';
  const orderInfo = `Thanh toan nhom don ${orderGroupId}`;
  const paymentUrl = vnpayService.buildPaymentUrlForGroup(orderGroupId, totalAmount, orderInfo, clientIp);
  await prisma.order.updateMany({
    where: { orderGroupId, buyerId: userId },
    data: { paymentMethod: 'VNPAY' },
  });
  return { paymentUrl };
}

async function simulateNextStatus(orderId, userId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw Object.assign(new Error('Đơn hàng không tồn tại'), { statusCode: 404 });
  if (order.buyerId !== userId) throw Object.assign(new Error('Bạn không có quyền thao tác đơn hàng này'), { statusCode: 403 });

  const flow = { PENDING: 'CONFIRMED', CONFIRMED: 'SHIPPING', SHIPPING: 'DELIVERED' };
  const nextStatus = flow[order.status];
  if (!nextStatus) throw Object.assign(new Error('Đơn hàng đã ở trạng thái cuối hoặc đã hủy'), { statusCode: 400 });

  const data = { status: nextStatus };
  if (nextStatus === 'SHIPPING') data.shippedAt = new Date();
  return prisma.order.update({
    where: { id: orderId },
    data,
    include: { details: { include: { product: { select: { id: true, name: true, slug: true, images: true } } } } },
  });
}

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

async function autoDeliverAfter5Hours() {
  const cutoff = new Date(Date.now() - FIVE_HOURS_MS);
  const updated = await prisma.order.updateMany({
    where: {
      status: 'SHIPPING',
      shippedAt: { not: null, lte: cutoff },
    },
    data: { status: 'DELIVERED' },
  });
  return updated.count;
}

function startAutoDeliverJob(intervalMs = 10 * 60 * 1000) {
  setInterval(async () => {
    try {
      const count = await autoDeliverAfter5Hours();
      if (count > 0) console.log(`[Auto-deliver] Đã tự động chuyển ${count} đơn SHIPPING -> DELIVERED (sau 5h).`);
    } catch (err) {
      console.error('[Auto-deliver] Lỗi:', err.message);
    }
  }, intervalMs);
}

module.exports = {
  create,
  shippingQuote,
  getMyOrders,
  getManageOrders,
  getById,
  updateStatus,
  createVnpayPaymentUrl,
  createVnpayPaymentUrlForGroup,
  simulateNextStatus,
  autoDeliverAfter5Hours,
  startAutoDeliverJob,
  loadAndGroupItemsForCheckout,
  computeShippingLines,
  normalizePaymentMethod,
};
