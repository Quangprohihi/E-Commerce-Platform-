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
    const orderGroupId = req.query.orderGroupId || null;
    const vnpQuery = Object.fromEntries(
      Object.entries(req.query).filter(([key]) => key.startsWith('vnp_'))
    );
    const verify = vnpayService.verifyReturnUrl(vnpQuery);
    if (!verify.isVerified) {
      return redirectResult(res, 'fail', null, 'Xac thuc chu ky that bai');
    }
    const txnRef = verify.vnp_TxnRef || vnpQuery.vnp_TxnRef;

    if (verify.isSuccess && txnRef) {
      const receivedAmount = verify.vnp_Amount ?? vnpQuery.vnp_Amount ?? 0;
      const vnpTransactionNo = verify.vnp_TransactionNo ?? vnpQuery.vnp_TransactionNo ?? null;

      if (orderGroupId) {
        const orders = await prisma.order.findMany({ where: { orderGroupId, status: 'PENDING' } });
        if (orders.length > 0) {
          const expectedTotal = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
          if (vnpayService.amountsMatchVnd(expectedTotal, receivedAmount)) {
            await prisma.order.updateMany({
              where: { orderGroupId },
              data: { status: 'CONFIRMED', vnpTransactionNo },
            });
            const firstOrderId = orders[0].id;
            return redirectResult(res, 'success', firstOrderId);
          }
        }
      } else {
        const order = await prisma.order.findUnique({ where: { id: txnRef } });
        if (order && order.status === 'PENDING') {
          const expectedAmount = Number(order.totalAmount);
          if (vnpayService.amountsMatchVnd(expectedAmount, receivedAmount)) {
            await prisma.order.update({
              where: { id: txnRef },
              data: { status: 'CONFIRMED', vnpTransactionNo },
            });
            return redirectResult(res, 'success', txnRef);
          }
        }
      }
      return redirectResult(res, 'success', txnRef);
    }
    return redirectResult(res, 'fail', txnRef, verify.message || 'Thanh toan that bai');
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

    const txnRef = verify.vnp_TxnRef || req.query.vnp_TxnRef;
    if (!txnRef) return res.json(IpnOrderNotFound);

    const receivedAmount = verify.vnp_Amount;
    const vnpTransactionNo = verify.vnp_TransactionNo || req.query.vnp_TransactionNo || null;

    let order = await prisma.order.findUnique({ where: { id: txnRef } });
    if (order) {
      if (order.status !== 'PENDING') return res.json(InpOrderAlreadyConfirmed);
      const expectedAmount = Number(order.totalAmount);
      if (!vnpayService.amountsMatchVnd(expectedAmount, receivedAmount)) {
        return res.json(IpnInvalidAmount);
      }
      await prisma.order.update({
        where: { id: txnRef },
        data: { status: 'CONFIRMED', vnpTransactionNo },
      });
      return res.json(IpnSuccess);
    }

    const orders = await prisma.order.findMany({ where: { orderGroupId: txnRef, status: 'PENDING' } });
    if (orders.length === 0) return res.json(IpnOrderNotFound);
    const expectedTotal = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
    if (!vnpayService.amountsMatchVnd(expectedTotal, receivedAmount)) {
      return res.json(IpnInvalidAmount);
    }
    await prisma.order.updateMany({
      where: { orderGroupId: txnRef },
      data: { status: 'CONFIRMED', vnpTransactionNo },
    });
    return res.json(IpnSuccess);
  } catch (err) {
    console.error('VNPAY IPN error:', err);
    return res.json(IpnUnknownError);
  }
}

module.exports = { vnpayReturn, vnpayIpn };
