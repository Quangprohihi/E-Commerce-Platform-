/**
 * Chuyển một đơn PENDING thành CONFIRMED (để test báo cáo có đơn confirmed).
 * Chạy: node scripts/confirm-one-order.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const prisma = require('../src/config/prisma');

async function main() {
  const order = await prisma.order.findFirst({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  });
  if (!order) {
    console.log('Không có đơn nào đang PENDING.');
    return;
  }
  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'CONFIRMED' },
  });
  console.log('Đã chuyển đơn sang CONFIRMED:', order.id);
  console.log('  Tổng tiền:', order.totalAmount, 'đ');
  console.log('  Ngày tạo:', order.createdAt);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
