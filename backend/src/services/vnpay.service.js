const { VNPay, dateFormat, getDateInGMT7 } = require('vnpay');

const vnpayHost = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn';
const testMode = process.env.NODE_ENV !== 'production';

const tmnCode = (process.env.VNPAY_TMN_CODE || '').trim();
const secureSecret = (process.env.VNPAY_SECRET || '').trim();
if (!tmnCode || !secureSecret) {
  console.warn('VNPAY: Cấu hình VNPAY_TMN_CODE (8 ký tự) và VNPAY_SECRET trong file .env từ tài khoản sandbox VNPAY.');
}
const vnpay = new VNPay({
  tmnCode,
  secureSecret,
  vnpayHost,
  testMode,
  hashAlgorithm: 'SHA512',
});

/**
 * OrderInfo: Tiếng Việt không dấu, không ký tự đặc biệt (theo quy định VNPAY).
 */
function sanitizeOrderInfo(str) {
  if (typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 255);
}

/**
 * Build VNPAY payment URL for an order.
 * @param {string} orderId - Order ID (used as vnp_TxnRef)
 * @param {number} amountVnd - Total amount in VND
 * @param {string} orderInfo - Order description (no accents recommended)
 * @param {string} clientIp - Customer IP
 * @returns {string} Payment URL to redirect user to
 */
function buildPaymentUrl(orderId, amountVnd, orderInfo, clientIp) {
  const port = process.env.PORT || 5000;
  const returnUrl =
    process.env.VNPAY_RETURN_URL ||
    (process.env.NODE_ENV !== 'production' ? `http://localhost:${port}/api/payment/vnpay/return` : null);
  if (!returnUrl) throw new Error('VNPAY_RETURN_URL is not configured. Thêm VNPAY_RETURN_URL vào file .env của backend.');

  const rawOrderInfo = orderInfo || `Thanh toan don hang ${orderId}`;
  const safeOrderInfo = sanitizeOrderInfo(rawOrderInfo) || `Don hang ${orderId}`;
  const amount = Math.round(Number(amountVnd) || 0);
  if (amount <= 0) throw new Error('Invalid amount for VNPAY');

  const nowGMT7 = getDateInGMT7();
  const expireDate = new Date(nowGMT7.getTime() + 15 * 60 * 1000);

  const paymentUrl = vnpay.buildPaymentUrl({
    vnp_Amount: amount,
    vnp_IpAddr: clientIp || '127.0.0.1',
    vnp_TxnRef: String(orderId),
    vnp_OrderInfo: safeOrderInfo,
    vnp_ReturnUrl: returnUrl,
    vnp_Locale: 'vn',
    vnp_ExpireDate: dateFormat(expireDate, 'yyyyMMddHHmmss'),
  });

  return paymentUrl;
}

/**
 * Build VNPAY payment URL for a group of orders (one payment for total).
 * vnp_TxnRef = orderGroupId; return URL includes orderGroupId so callback can update all orders.
 */
function buildPaymentUrlForGroup(orderGroupId, amountVnd, orderInfo, clientIp) {
  const port = process.env.PORT || 5000;
  const baseReturnUrl =
    process.env.VNPAY_RETURN_URL ||
    (process.env.NODE_ENV !== 'production' ? `http://localhost:${port}/api/payment/vnpay/return` : null);
  if (!baseReturnUrl) throw new Error('VNPAY_RETURN_URL is not configured.');
  const returnUrl = `${baseReturnUrl}${baseReturnUrl.includes('?') ? '&' : '?'}orderGroupId=${encodeURIComponent(orderGroupId)}`;

  const rawOrderInfo = orderInfo || `Thanh toan nhom don ${orderGroupId}`;
  const safeOrderInfo = sanitizeOrderInfo(rawOrderInfo) || `Nhom don ${orderGroupId}`;
  const amount = Math.round(Number(amountVnd) || 0);
  if (amount <= 0) throw new Error('Invalid amount for VNPAY');

  const nowGMT7 = getDateInGMT7();
  const expireDate = new Date(nowGMT7.getTime() + 15 * 60 * 1000);

  const paymentUrl = vnpay.buildPaymentUrl({
    vnp_Amount: amount,
    vnp_IpAddr: clientIp || '127.0.0.1',
    vnp_TxnRef: String(orderGroupId),
    vnp_OrderInfo: safeOrderInfo,
    vnp_ReturnUrl: returnUrl,
    vnp_Locale: 'vn',
    vnp_ExpireDate: dateFormat(expireDate, 'yyyyMMddHHmmss'),
  });

  return paymentUrl;
}

/**
 * Verify query params from VNPAY return URL redirect.
 * @param {object} query - req.query from return URL
 * @returns {object} { isVerified, isSuccess, message, ... }
 */
function verifyReturnUrl(query) {
  return vnpay.verifyReturnUrl(query);
}

/**
 * Verify query params from VNPAY IPN (server-to-server) call.
 * @param {object} query - req.query from IPN
 * @returns {object} Verification result with isVerified, isSuccess, vnp_TxnRef, vnp_Amount, etc.
 */
function verifyIpnCall(query) {
  return vnpay.verifyIpnCall(query);
}

module.exports = {
  buildPaymentUrl,
  buildPaymentUrlForGroup,
  verifyReturnUrl,
  verifyIpnCall,
};
