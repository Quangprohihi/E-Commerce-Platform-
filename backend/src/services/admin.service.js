const prisma = require('../config/prisma');

function buildUserWhere(query = {}) {
  const where = {};
  if (query.role) where.role = query.role;
  if (query.search) {
    where.OR = [
      { email: { contains: query.search, mode: 'insensitive' } },
      { fullName: { contains: query.search, mode: 'insensitive' } },
      { phone: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  return where;
}

function userSelect() {
  return {
    id: true,
    email: true,
    fullName: true,
    phone: true,
    avatar: true,
    role: true,
    createdAt: true,
    sellerProfile: true,
  };
}

async function listUsers(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const where = buildUserWhere(query);

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect(),
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect(),
  });
  if (!user) throw Object.assign(new Error('Người dùng không tồn tại'), { statusCode: 404 });
  return user;
}

async function updateUserById(targetUserId, body = {}, actorRole) {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });
  if (!targetUser) throw Object.assign(new Error('Người dùng không tồn tại'), { statusCode: 404 });

  const data = {};
  if (body.fullName !== undefined) data.fullName = body.fullName;
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.avatar !== undefined) data.avatar = body.avatar;

  if (body.role !== undefined) {
    if (actorRole !== 'ADMIN') {
      throw Object.assign(new Error('Chỉ admin mới được thay đổi role'), { statusCode: 403 });
    }
    data.role = body.role;
  }

  if (Object.keys(data).length) {
    await prisma.user.update({
      where: { id: targetUserId },
      data,
    });
  }

  if (body.sellerProfile !== undefined) {
    const { shopName, description, kycDocument, kycStatus } = body.sellerProfile || {};
    await prisma.sellerProfile.upsert({
      where: { userId: targetUserId },
      update: {
        shopName: shopName !== undefined ? shopName : undefined,
        description: description !== undefined ? description : undefined,
        kycDocument: kycDocument !== undefined ? kycDocument : undefined,
        kycStatus: kycStatus !== undefined ? kycStatus : undefined,
      },
      create: {
        userId: targetUserId,
        shopName: shopName || 'Cửa hàng',
        description: description || null,
        kycDocument: kycDocument || null,
        kycStatus: kycStatus || 'PENDING',
      },
    });
  }

  return getUserById(targetUserId);
}

async function deleteUserById(targetUserId, actorId, actorRole) {
  if (actorRole !== 'ADMIN') {
    throw Object.assign(new Error('Chỉ admin mới được xóa người dùng'), { statusCode: 403 });
  }
  if (targetUserId === actorId) {
    throw Object.assign(new Error('Không thể xóa chính tài khoản của bạn'), { statusCode: 400 });
  }
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!target) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { statusCode: 404 });
  }
  await prisma.user.delete({
    where: { id: targetUserId },
  });
  return { deleted: true, id: targetUserId };
}

module.exports = { listUsers, getUserById, updateUserById, deleteUserById };
