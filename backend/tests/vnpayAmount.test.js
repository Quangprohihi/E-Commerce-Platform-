const { amountsMatchVnd } = require('../src/services/vnpay.service');

describe('amountsMatchVnd', () => {
  it('matches exact VND', () => {
    expect(amountsMatchVnd(100000, 100000)).toBe(true);
    expect(amountsMatchVnd(100000, 100001, 2)).toBe(true);
  });
  it('matches when gateway sends x100 minor units', () => {
    expect(amountsMatchVnd(100000, 10000000)).toBe(true);
  });
  it('rejects mismatch', () => {
    expect(amountsMatchVnd(100000, 9990000)).toBe(false);
  });
});
