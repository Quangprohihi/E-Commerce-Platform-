const vnpayService = require('../services/vnpay.service');
const prisma = require('../config/prisma');
const {
  IpnSuccess,
  IpnFailChecksum,
  IpnInvalidAmount,
  IpnOrderNotFound,
  InpOrderAlreadyConfirmed,
  IpnUnknownError,
} = require('vnpay');

const frontendResultUrl = process.env.FRONTEND_PAYMENT_RESULT_URL || 'http://localhost:5173/payment/result';

function redirectResult(res, status, orderId, message) {
  const url = new URL(frontendResultUrl);
  url.searchParams.set('status', status);
  if (orderId) url.searchParams.set('orderId', orderId);
  if (message) url.searchParams.set('message', encodeURIComponent(message));
  return res.redirect(302, url.toString());
}

async function vnpayReturn(req, res, next) {
  try {
    const verify = vnpayService.verifyReturnUrl(req.query);
    if (!verify.isVerified) {
      return redirectResult(res, 'fail', null, 'Xac thuc chu ky that bai');
    }
    const orderId = verify.vnp_TxnRef || req.query.vnp_TxnRef;
    if (verify.isSuccess && orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (order && order.status === 'PENDING') {
        const receivedAmount = Number(verify.vnp_Amount ?? req.query.vnp_Amount);
        const expectedAmount = Number(order.totalAmount);
        if (!Number.isNaN(receivedAmount) && !Number.isNaN(expectedAmount) && Math.abs(receivedAmount - expectedAmount) <= 1) {
          const vnpTransactionNo = verify.vnp_TransactionNo ?? req.query.vnp_TransactionNo ?? null;
          await prisma.order.update({
            where: { id: orderId },
            data: { status: 'CONFIRMED', vnpTransactionNo },
          });
        }
      }
      return redirectResult(res, 'success', orderId);
    }
    return redirectResult(res, 'fail', orderId, verify.message || 'Thanh toan that bai');
  } catch (err) {
    console.error('VNPAY return error:', err);
    return redirectResult(res, 'fail', null, 'Loi xac thuc');
  }
}

async function vnpayIpn(req, res, next) {
  try {
    const verify = vnpayService.verifyIpnCall(req.query);
    if (!verify.isVerified) {
      return res.json(IpnFailChecksum);
    }
    if (!verify.isSuccess) {
      return res.json(IpnUnknownError);
    }

    const orderId = verify.vnp_TxnRef || req.query.vnp_TxnRef;
    if (!orderId) return res.json(IpnOrderNotFound);

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return res.json(IpnOrderNotFound);
    if (order.status !== 'PENDING') return res.json(InpOrderAlreadyConfirmed);

    const expectedAmount = Number(order.totalAmount);
    const receivedAmount = Number(verify.vnp_Amount);
    if (Number.isNaN(receivedAmount) || Math.abs(receivedAmount - expectedAmount) > 1) {
      return res.json(IpnInvalidAmount);
    }

    const vnpTransactionNo = verify.vnp_TransactionNo || req.query.vnp_TransactionNo || null;
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CONFIRMED', vnpTransactionNo },
    });

    return res.json(IpnSuccess);
  } catch (err) {
    console.error('VNPAY IPN error:', err);
    return res.json(IpnUnknownError);
  }
}

module.exports = { vnpayReturn, vnpayIpn };
