const prisma = require('../config/prisma');
const vnpayService = require('./vnpay.service');

async function create(buyerId, body) {
  const { items, shippingAddress, phone, note } = body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error('Danh sách sản phẩm không hợp lệ'), { statusCode: 400 });
  }
  if (!shippingAddress || !phone) {
    throw Object.assign(new Error('Thiếu địa chỉ giao hàng hoặc số điện thoại'), { statusCode: 400 });
  }

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
  });
  if (products.length !== productIds.length) {
    throw Object.assign(new Error('Một hoặc nhiều sản phẩm không tồn tại hoặc đã ngừng bán'), { statusCode: 400 });
  }

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
  let totalAmount = 0;
  const details = [];

  for (const it of items) {
    const product = productMap[it.productId];
    if (!product) throw Object.assign(new Error(`Sản phẩm ${it.productId} không tồn tại`), { statusCode: 400 });
    const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
    if (product.stock < qty) throw Object.assign(new Error(`Sản phẩm ${product.name} không đủ tồn kho`), { statusCode: 400 });
    const price = Number(product.salePrice ?? product.price);
    const lineTotal = price * qty;
    totalAmount += lineTotal;
    details.push({ productId: product.id, quantity: qty, price });
  }

  const order = await prisma.order.create({
    data: {
      buyerId,
      totalAmount,
      shippingAddress,
      phone,
      note: note || null,
      status: 'PENDING',
      details: {
        create: details,
      },
    },
    include: {
      details: { include: { product: { select: { id: true, name: true, slug: true, images: true } } } },
    },
  });

  const decrements = {};
  items.forEach((it) => {
    const qty = Math.max(1, parseInt(it.quantity, 10) || 1);
    decrements[it.productId] = (decrements[it.productId] || 0) + qty;
  });
  for (const [id, dec] of Object.entries(decrements)) {
    await prisma.product.update({ where: { id }, data: { stock: { decrement: dec } } });
  }

  return order;
}

async function getMyOrders(userId) {
  return prisma.order.findMany({
    where: { buyerId: userId },
    include: { details: { include: { product: { select: { id: true, name: true, slug: true, images: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
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
    where.details = {
      some: {
        product: {
          sellerId: userId,
        },
      },
    };
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
  if (userRole !== 'ADMIN' && userRole !== 'SELLER' && userRole !== 'STAFF') {
    throw Object.assign(new Error('Chỉ admin/seller/staff mới được cập nhật trạng thái'), { statusCode: 403 });
  }
  return prisma.order.update({ where: { id: orderId }, data: { status } });
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

async function simulateNextStatus(orderId, userId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw Object.assign(new Error('Đơn hàng không tồn tại'), { statusCode: 404 });
  if (order.buyerId !== userId) throw Object.assign(new Error('Bạn không có quyền thao tác đơn hàng này'), { statusCode: 403 });

  const flow = { PENDING: 'CONFIRMED', CONFIRMED: 'SHIPPING', SHIPPING: 'DELIVERED' };
  const nextStatus = flow[order.status];
  if (!nextStatus) throw Object.assign(new Error('Đơn hàng đã ở trạng thái cuối hoặc đã hủy'), { statusCode: 400 });

  return prisma.order.update({
    where: { id: orderId },
    data: { status: nextStatus },
    include: { details: { include: { product: { select: { id: true, name: true, slug: true, images: true } } } } },
  });
}

module.exports = { create, getMyOrders, getManageOrders, getById, updateStatus, createVnpayPaymentUrl, simulateNextStatus };
