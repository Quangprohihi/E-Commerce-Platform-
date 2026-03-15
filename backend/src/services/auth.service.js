const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { sign } = require('../utils/jwt');
const { sendResetPasswordEmail, assertMailProviderReady, isDevProvider } = require('./mail.service');

const RESET_TOKEN_BYTES = 32;
const DEFAULT_RESET_TOKEN_TTL_MINUTES = 30;
const MIN_RESET_TOKEN_TTL_MINUTES = 5;
const MAX_RESET_TOKEN_TTL_MINUTES = 24 * 60;

function buildJwtPayload(user) {
  return {
    userId: user.id,
    tokenVersion: Number(user.tokenVersion || 0),
  };
}

function getResetTokenTtlMinutes() {
  const parsed = parseInt(process.env.RESET_PASSWORD_TOKEN_TTL_MINUTES, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_RESET_TOKEN_TTL_MINUTES;
  return Math.min(MAX_RESET_TOKEN_TTL_MINUTES, Math.max(MIN_RESET_TOKEN_TTL_MINUTES, parsed));
}

function getFrontendBaseUrl() {
  const raw = String(process.env.FRONTEND_BASE_URL || 'http://localhost:5173').trim();
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

function buildResetUrl(rawToken) {
  return `${getFrontendBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
}

function generateRawResetToken() {
  return crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
}

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function isDirectDemoResetEnabled() {
  const flag = String(process.env.ALLOW_DEMO_PASSWORD_RESET || 'true').trim().toLowerCase();
  return isDevProvider() && flag !== 'false' && flag !== '0' && flag !== 'no';
}

async function register(data) {
  const { email, password, fullName, phone, role } = data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw Object.assign(new Error('Email da duoc su dung'), { statusCode: 400 });

  const hashed = bcrypt.hashSync(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      fullName,
      phone: phone || null,
      role: role || 'BUYER',
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      phone: true,
      avatar: true,
      createdAt: true,
      tokenVersion: true,
    },
  });

  const token = sign(buildJwtPayload(user));
  const safeUser = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };

  return { user: safeUser, token };
}

async function login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw Object.assign(new Error('Email hoac mat khau khong dung'), { statusCode: 401 });

  const match = bcrypt.compareSync(password, user.password);
  if (!match) throw Object.assign(new Error('Email hoac mat khau khong dung'), { statusCode: 401 });

  const token = sign(buildJwtPayload(user));
  const safe = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
  };
  return { user: safe, token };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true, role: true, phone: true, avatar: true, createdAt: true },
  });
  if (!user) throw Object.assign(new Error('Nguoi dung khong ton tai'), { statusCode: 404 });

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
      shopName: shopName || 'Cua hang',
      description: description || null,
      kycDocument: filePath || null,
      kycStatus: 'PENDING',
    },
  });
  return profile;
}

async function updateProfile(userId, data) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: data.fullName,
      phone: data.phone,
      avatar: data.avatar,
    },
    select: { id: true, email: true, fullName: true, role: true, phone: true, avatar: true, createdAt: true },
  });

  let sellerProfile = null;
  if (updated.role === 'SELLER') {
    sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: updated.id } });
  }

  return { ...updated, sellerProfile };
}

async function forgotPassword(email) {
  const providerReady = (() => {
    try {
      assertMailProviderReady();
      return true;
    } catch {
      return false;
    }
  })();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, fullName: true },
  });

  const expiresInMinutes = getResetTokenTtlMinutes();

  if (!user) {
    return {};
  }

  const rawToken = generateRawResetToken();
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const resetUrl = buildResetUrl(rawToken);
  if (providerReady) {
    await sendResetPasswordEmail({
      to: user.email,
      fullName: user.fullName,
      resetUrl,
      expiresInMinutes,
    });
  } else if (isDirectDemoResetEnabled()) {
    // Keep a production-like response while still allowing demo reset without email service.
    console.log('[DemoReset] Email service is not configured. Token flow skipped; direct reset by email is enabled.');
  } else {
    throw Object.assign(new Error('Email service is not configured.'), { statusCode: 500 });
  }

  return {};
}

async function resetPassword(payload = {}) {
  const token = String(payload.token || '').trim();
  const email = String(payload.email || '').trim();
  const newPassword = String(payload.newPassword || '');

  if (!newPassword || newPassword.length < 6) {
    throw Object.assign(new Error('Mat khau moi khong hop le'), { statusCode: 400 });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  if (token) {
    const tokenHash = hashResetToken(token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    const now = new Date();
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now) {
      throw Object.assign(new Error('Token dat lai mat khau khong hop le hoac da het han'), { statusCode: 400 });
    }

    const usedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: {
          password: hashedPassword,
          tokenVersion: { increment: 1 },
        },
      });

      await tx.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          usedAt: null,
        },
        data: { usedAt },
      });
    });

    return { reset: true, mode: 'token' };
  }

  if (!isDirectDemoResetEnabled()) {
    throw Object.assign(new Error('Token dat lai mat khau khong hop le'), { statusCode: 400 });
  }
  if (!email || !isEmail(email)) {
    throw Object.assign(new Error('Email khong hop le'), { statusCode: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    throw Object.assign(new Error('Thong tin dat lai mat khau khong hop le'), { statusCode: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        tokenVersion: { increment: 1 },
      },
    });

    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
  });

  return { reset: true, mode: 'direct' };
}

module.exports = {
  register,
  login,
  getMe,
  submitKYC,
  updateProfile,
  forgotPassword,
  resetPassword,
};
