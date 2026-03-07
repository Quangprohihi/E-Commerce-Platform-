const prisma = require('../config/prisma');

/**
 * Số dư khả dụng = tổng tiền từ đơn DELIVERED đã thanh toán - tổng đã rút (APPROVED).
 * Tiền chỉ tính khi đơn đã giao (seller đã hoàn thành) và buyer đã thanh toán.
 */
async function getBalance(sellerId) {
  const [incomeAgg, withdrawnAgg] = await Promise.all([
    prisma.order.aggregate({
      where: {
        sellerId,
        status: 'DELIVERED',
        paymentMethod: { not: null },
      },
      _sum: { totalAmount: true },
    }),
    prisma.withdrawalRequest.aggregate({
      where: { sellerId, status: 'APPROVED' },
      _sum: { amount: true },
    }),
  ]);
  const income = Number(incomeAgg._sum?.totalAmount ?? 0);
  const withdrawn = Number(withdrawnAgg._sum?.amount ?? 0);
  const balance = Math.max(0, income - withdrawn);
  return { balance, income, withdrawn };
}

async function createRequest(sellerId, body) {
  const { amount, note } = body;
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw Object.assign(new Error('Số tiền rút phải lớn hơn 0'), { statusCode: 400 });
  }

  const { balance } = await getBalance(sellerId);
  if (numAmount > balance) {
    throw Object.assign(new Error(`Số dư khả dụng không đủ. Số dư: ${balance.toLocaleString('vi-VN')} đ`), { statusCode: 400 });
  }

  return prisma.withdrawalRequest.create({
    data: {
      sellerId,
      amount: numAmount,
      note: note?.trim() || null,
      status: 'PENDING',
    },
  });
}

async function getMyRequests(sellerId, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.withdrawalRequest.count({ where: { sellerId } }),
  ]);

  const { balance, income, withdrawn } = await getBalance(sellerId);
  return {
    balance,
    income,
    withdrawn,
    requests: items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function listForAdmin(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const where = {};
  if (query.status) where.status = query.status;

  const [items, total] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where,
      include: { seller: { select: { id: true, fullName: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.withdrawalRequest.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

async function updateStatus(id, status, adminNote, userRole) {
  if (!['ADMIN', 'STAFF'].includes(userRole)) {
    throw Object.assign(new Error('Chỉ admin/staff mới được duyệt yêu cầu rút tiền'), { statusCode: 403 });
  }
  const allowed = ['APPROVED', 'REJECTED'];
  if (!allowed.includes(status)) {
    throw Object.assign(new Error('Trạng thái không hợp lệ'), { statusCode: 400 });
  }

  const req = await prisma.withdrawalRequest.findUnique({ where: { id } });
  if (!req) throw Object.assign(new Error('Yêu cầu rút tiền không tồn tại'), { statusCode: 404 });
  if (req.status !== 'PENDING') {
    throw Object.assign(new Error('Yêu cầu đã được xử lý'), { statusCode: 400 });
  }

  if (status === 'APPROVED') {
    const { balance } = await getBalance(req.sellerId);
    if (Number(req.amount) > balance) {
      throw Object.assign(new Error('Số dư seller không đủ để duyệt rút tiền'), { statusCode: 400 });
    }
  }

  return prisma.withdrawalRequest.update({
    where: { id },
    data: {
      status,
      adminNote: adminNote?.trim() || null,
      processedAt: new Date(),
    },
    include: { seller: { select: { id: true, fullName: true, email: true } } },
  });
}

module.exports = {
  getBalance,
  createRequest,
  getMyRequests,
  listForAdmin,
  updateStatus,
};
