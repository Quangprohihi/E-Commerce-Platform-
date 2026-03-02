const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { sign } = require('../utils/jwt');

async function register(data) {
  const { email, password, fullName, phone, role } = data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw Object.assign(new Error('Email đã được sử dụng'), { statusCode: 400 });
  const hashed = bcrypt.hashSync(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      fullName,
      phone: phone || null,
      role: role || 'BUYER',
    },
    select: { id: true, email: true, fullName: true, role: true, phone: true, avatar: true, createdAt: true },
  });
  const token = sign({ userId: user.id });
  return { user, token };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw Object.assign(new Error('Email hoặc mật khẩu không đúng'), { statusCode: 401 });
  const match = bcrypt.compareSync(password, user.password);
  if (!match) throw Object.assign(new Error('Email hoặc mật khẩu không đúng'), { statusCode: 401 });
  const token = sign({ userId: user.id });
  const safe = { id: user.id, email: user.email, fullName: user.fullName, role: user.role, phone: user.phone, avatar: user.avatar };
  return { user: safe, token };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, role: true, phone: true, avatar: true, createdAt: true },
  });
  if (!user) throw Object.assign(new Error('Người dùng không tồn tại'), { statusCode: 404 });
  let sellerProfile = null;
  if (user.role === 'SELLER') {
    sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
  }
  return { ...user, sellerProfile };
}

async function submitKYC(userId, filePath, body = {}) {
  const { shopName, description } = body;
  const profile = await prisma.sellerProfile.upsert({
    where: { userId },
    update: {
      kycDocument: filePath || undefined,
      kycStatus: 'PENDING',
      shopName: shopName || undefined,
      description: description !== undefined ? description : undefined,
    },
    create: {
      userId,
      shopName: shopName || 'Cửa hàng',
      description: description || null,
      kycDocument: filePath || null,
      kycStatus: 'PENDING',
    },
  });
  return profile;
}

module.exports = { register, login, getMe, submitKYC };
