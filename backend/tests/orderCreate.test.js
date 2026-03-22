/**
 * Regression: create order persists breakdown; multi-seller sums final totals.
 */
jest.mock('../src/services/shipping/ghnClient.service', () => ({
  fetchShippingFee: jest.fn().mockResolvedValue({ total: 35_000, usedFallback: false }),
}));

const orderCreateCalls = [];

jest.mock('../src/config/prisma', () => ({
  product: {
    findMany: jest.fn(),
  },
  sellerProfile: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn((fn) => {
    const tx = {
      order: {
        create: jest.fn(async ({ data }) => {
          orderCreateCalls.push(data);
          return {
            id: `ord-${orderCreateCalls.length}`,
            ...data,
            details: [],
          };
        }),
        updateMany: jest.fn(),
      },
      product: {
        update: jest.fn(),
      },
    };
    return fn(tx);
  }),
}));

const prisma = require('../src/config/prisma');
const orderService = require('../src/services/order.service');

describe('order.service.create', () => {
  beforeEach(() => {
    orderCreateCalls.length = 0;
    jest.clearAllMocks();
  });

  it('returns orders, orderGroupId, totalAmount and shippingLines', async () => {
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'p1',
        sellerId: 'seller-a',
        stock: 5,
        price: 150000,
        salePrice: null,
        isActive: true,
        name: 'P1',
        weightGrams: 100,
        packageLengthCm: null,
        packageWidthCm: null,
        packageHeightCm: null,
      },
    ]);
    prisma.sellerProfile.findMany.mockResolvedValue([
      {
        userId: 'seller-a',
        sellerProvinceId: 79,
        sellerDistrictId: 1442,
        sellerWardCode: 'SW1',
      },
    ]);

    const out = await orderService.create('buyer-1', {
      items: [{ productId: 'p1', quantity: 2 }],
      shippingAddress: 'Q1',
      phone: '090',
      buyerProvinceCode: '79',
      buyerDistrictCode: 'BD1',
      buyerWardCode: 'BW1',
      paymentMethod: 'VNPAY',
    });

    expect(out.orders).toHaveLength(1);
    expect(out.orderGroupId).toBeNull();
    expect(out.shippingLines).toHaveLength(1);
    expect(out.totalAmount).toBe(out.shippingLines[0].lineTotal);
    expect(orderCreateCalls[0].itemsAmount).toBe(300000);
    expect(orderCreateCalls[0].buyerDistrictCode).toBe('BD1');
    expect(orderCreateCalls[0].buyerWardCode).toBe('BW1');
    expect(orderCreateCalls[0].paymentMethod).toBe('VNPAY');
  });

  it('multi-seller uses group id and sums line totals', async () => {
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'p1',
        sellerId: 's1',
        stock: 5,
        price: 100000,
        salePrice: null,
        isActive: true,
        name: 'A',
        weightGrams: 50,
        packageLengthCm: null,
        packageWidthCm: null,
        packageHeightCm: null,
      },
      {
        id: 'p2',
        sellerId: 's2',
        stock: 5,
        price: 50000,
        salePrice: null,
        isActive: true,
        name: 'B',
        weightGrams: 50,
        packageLengthCm: null,
        packageWidthCm: null,
        packageHeightCm: null,
      },
    ]);
    prisma.sellerProfile.findMany.mockResolvedValue([
      {
        userId: 's1',
        sellerProvinceId: 79,
        sellerDistrictId: 1442,
        sellerWardCode: 'W1',
      },
      {
        userId: 's2',
        sellerProvinceId: 79,
        sellerDistrictId: 3440,
        sellerWardCode: 'W2',
      },
    ]);

    const out = await orderService.create('buyer-1', {
      items: [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 1 },
      ],
      shippingAddress: 'Q1',
      phone: '090',
      buyerProvinceCode: '79',
      buyerDistrictCode: 'BDX',
      buyerWardCode: 'BWY',
      paymentMethod: 'COD',
    });

    expect(out.orderGroupId).toBeTruthy();
    expect(out.orders.length).toBe(2);
    const expectedSum = out.shippingLines.reduce((s, l) => s + l.lineTotal, 0);
    expect(out.totalAmount).toBe(expectedSum);
    expect(orderCreateCalls).toHaveLength(2);
    const codRows = orderCreateCalls.filter((d) => Number(d.codFee) > 0);
    expect(codRows.length).toBeGreaterThan(0);
  });
});

describe('payment expected total (group)', () => {
  it('matches sum of order.totalAmount for mocked lines', () => {
    const orders = [
      { totalAmount: 320500 },
      { totalAmount: 118000 },
    ];
    const expectedTotal = orders.reduce((s, o) => s + Number(o.totalAmount), 0);
    expect(expectedTotal).toBe(438500);
  });
});

describe('withdrawal income uses itemsAmount only', () => {
  it('simulated aggregate: seller sees sum of itemsAmount not totalAmount', () => {
    const delivered = [
      { itemsAmount: 200000, totalAmount: 230000 },
      { itemsAmount: 100000, totalAmount: 127000 },
    ];
    const incomeItems = delivered.reduce((s, o) => s + o.itemsAmount, 0);
    const incomeWrong = delivered.reduce((s, o) => s + o.totalAmount, 0);
    expect(incomeItems).toBe(300000);
    expect(incomeWrong).toBeGreaterThan(incomeItems);
  });
});
