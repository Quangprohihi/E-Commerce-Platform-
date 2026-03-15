const { verify } = require('../utils/jwt');
const { sendUnauthorized } = require('../utils/response');
const prisma = require('../config/prisma');

function isDecodedTokenInvalid(decoded) {
  return !decoded || !decoded.userId;
}

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(res, 'Token khong hop le hoac thieu');
    }

    const token = authHeader.slice(7);
    const decoded = verify(token);
    if (isDecodedTokenInvalid(decoded)) {
      return sendUnauthorized(res, 'Token khong hop le hoac da het han');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        avatar: true,
      },
    });

    if (!user) return sendUnauthorized(res, 'Nguoi dung khong ton tai');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.slice(7);
    const decoded = verify(token);
    if (isDecodedTokenInvalid(decoded)) return next();

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        avatar: true,
      },
    });

    if (user) {
      req.user = user;
    }

    next();
  } catch {
    next();
  }
}

module.exports = { authMiddleware, optionalAuth };
