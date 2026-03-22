import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PAYMENT_COD = 'COD';
const PAYMENT_VNPAY = 'VNPAY';

function formatVnd(n) {
  return new Intl.NumberFormat('vi-VN').format(Number(n) || 0);
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_VNPAY);

  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [buyerProvinceId, setBuyerProvinceId] = useState('');
  const [buyerDistrictId, setBuyerDistrictId] = useState('');
  const [buyerWardCode, setBuyerWardCode] = useState('');
  const [addrLoading, setAddrLoading] = useState({ provinces: true, districts: false, wards: false });
  const [addrError, setAddrError] = useState('');

  const [form, setForm] = useState({
    shippingAddress: '',
    phone: '',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  const quoteAbortRef = useRef(null);
  const quoteRequestIdRef = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cart');
      const parsed = raw ? JSON.parse(raw) : [];
      setCart(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCart([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setAddrLoading((s) => ({ ...s, provinces: true }));
      setAddrError('');
      try {
        const res = await api.get('/shipping/provinces');
        const list = res.data?.data?.provinces;
        if (!cancelled) {
          setProvinces(Array.isArray(list) ? list : []);
        }
      } catch {
        if (!cancelled) {
          setAddrError('Không tải được danh sách tỉnh/thành (GHN). Kiểm tra GHN_TOKEN trên server.');
          setProvinces([]);
        }
      } finally {
        if (!cancelled) setAddrLoading((s) => ({ ...s, provinces: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!buyerProvinceId) {
      setDistricts([]);
      setBuyerDistrictId('');
      setWards([]);
      setBuyerWardCode('');
      return;
    }
    let cancelled = false;
    (async () => {
      setAddrLoading((s) => ({ ...s, districts: true }));
      setAddrError('');
      try {
        const res = await api.get('/shipping/districts', { params: { provinceId: buyerProvinceId } });
        const list = res.data?.data?.districts;
        if (!cancelled) {
          setDistricts(Array.isArray(list) ? list : []);
          setBuyerDistrictId('');
          setWards([]);
          setBuyerWardCode('');
        }
      } catch {
        if (!cancelled) {
          setDistricts([]);
          setBuyerDistrictId('');
          setWards([]);
          setBuyerWardCode('');
          setAddrError('Không tải được quận/huyện.');
        }
      } finally {
        if (!cancelled) setAddrLoading((s) => ({ ...s, districts: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [buyerProvinceId]);

  useEffect(() => {
    if (!buyerDistrictId) {
      setWards([]);
      setBuyerWardCode('');
      return;
    }
    let cancelled = false;
    (async () => {
      setAddrLoading((s) => ({ ...s, wards: true }));
      setAddrError('');
      try {
        const res = await api.get('/shipping/wards', { params: { districtId: buyerDistrictId } });
        const list = res.data?.data?.wards;
        if (!cancelled) {
          setWards(Array.isArray(list) ? list : []);
          setBuyerWardCode('');
        }
      } catch {
        if (!cancelled) {
          setWards([]);
          setBuyerWardCode('');
          setAddrError('Không tải được phường/xã.');
        }
      } finally {
        if (!cancelled) setAddrLoading((s) => ({ ...s, wards: false }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [buyerDistrictId]);

  const cartItemsPayload = useMemo(
    () =>
      cart.map((item) => ({
        productId: item.id,
        quantity: Math.max(1, Number(item.quantity) || 1),
      })),
    [cart]
  );

  const clientItemsSubtotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const price = Number(item.salePrice ?? item.price ?? 0);
        return sum + price * (Number(item.quantity) || 1);
      }, 0),
    [cart]
  );

  const fetchQuote = useCallback(async () => {
    if (!cartItemsPayload.length) {
      setQuote(null);
      return;
    }
    if (!buyerDistrictId || !buyerWardCode) {
      setQuote(null);
      setQuoteError('');
      return;
    }
    if (addrLoading.districts || addrLoading.wards) {
      return;
    }

    quoteAbortRef.current?.abort();
    const ac = new AbortController();
    quoteAbortRef.current = ac;
    const reqId = ++quoteRequestIdRef.current;

    const payload = {
      items: cartItemsPayload,
      buyerProvinceCode: buyerProvinceId || undefined,
      buyerDistrictCode: buyerDistrictId,
      buyerWardCode,
      paymentMethod,
    };

    setQuoteLoading(true);
    setQuoteError('');
    try {
      const res = await api.post('/orders/shipping-quote', payload, { signal: ac.signal });
      if (reqId !== quoteRequestIdRef.current) return;
      setQuote(res.data?.data ?? null);
    } catch (err) {
      if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError' || err.message === 'canceled') {
        return;
      }
      if (reqId !== quoteRequestIdRef.current) return;
      const message = err.response?.data?.message || 'Không lấy được báo giá vận chuyển.';
      setQuoteError(message);
      setQuote(null);
    } finally {
      if (reqId === quoteRequestIdRef.current) {
        setQuoteLoading(false);
      }
    }
  }, [
    cartItemsPayload,
    buyerProvinceId,
    buyerDistrictId,
    buyerWardCode,
    paymentMethod,
    addrLoading.districts,
    addrLoading.wards,
  ]);

  const debounceRef = useRef(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchQuote();
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchQuote]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cart.length) {
      setError('Giỏ hàng trống.');
      return;
    }
    if (!buyerProvinceId || !buyerDistrictId || !buyerWardCode) {
      setError('Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện và Phường/Xã (GHN).');
      return;
    }
    if (!form.shippingAddress?.trim() || !form.phone?.trim()) {
      setError('Vui lòng nhập địa chỉ giao hàng và số điện thoại.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const items = cartItemsPayload;
      const orderRes = await api.post('/orders', {
        items,
        shippingAddress: form.shippingAddress.trim(),
        phone: form.phone.trim(),
        note: form.note?.trim() || undefined,
        buyerProvinceCode: buyerProvinceId,
        buyerDistrictCode: buyerDistrictId,
        buyerWardCode,
        paymentMethod,
      });
      const data = orderRes.data?.data;
      const orders = Array.isArray(data?.orders) ? data.orders : data?.id ? [data] : [];
      const orderGroupId = data?.orderGroupId || null;
      if (!orders.length) {
        setError('Tạo đơn hàng thất bại.');
        return;
      }

      if (paymentMethod === PAYMENT_VNPAY) {
        let paymentUrl;
        if (orderGroupId && orders.length > 1) {
          const urlRes = await api.post('/orders/pay-group', { orderGroupId });
          paymentUrl = urlRes.data?.data?.paymentUrl;
        } else {
          const urlRes = await api.post(`/orders/${orders[0].id}/vnpay-url`);
          paymentUrl = urlRes.data?.data?.paymentUrl;
        }
        if (paymentUrl) {
          localStorage.removeItem('cart');
          window.dispatchEvent(new Event('cart-updated'));
          window.location.href = paymentUrl;
          return;
        }
        setError('Không thể tạo link thanh toán VNPAY.');
        return;
      }

      localStorage.removeItem('cart');
      window.dispatchEvent(new Event('cart-updated'));
      if (role === 'BUYER') {
        navigate('/account/orders', { replace: true });
      } else {
        const oid = orders[0]?.id ? String(orders[0].id) : '';
        navigate(`/payment/result?status=success&orderId=${encodeURIComponent(oid)}`, { replace: true });
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const lines = quote?.lines;
  const grandTotal = quote?.grandTotal;
  const sumShipping = lines?.reduce((s, l) => s + (Number(l.shippingFee) || 0), 0) ?? 0;
  const sumShipDisc = lines?.reduce((s, l) => s + (Number(l.shippingDiscount) || 0), 0) ?? 0;
  const sumCod = lines?.reduce((s, l) => s + (Number(l.codFee) || 0), 0) ?? 0;
  const quotedItems = lines?.reduce((s, l) => s + (Number(l.itemsSubtotal) || 0), 0) ?? null;

  const addressReady = Boolean(buyerProvinceId && buyerDistrictId && buyerWardCode);

  if (cart.length === 0 && !loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-310 mx-auto text-center glass-strong rounded-3xl p-8">
          <p className="text-text-muted mb-4">Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi thanh toán.</p>
          <Link to="/cart" className="inline-flex px-6 py-3 rounded-full bg-primary text-white text-xs uppercase tracking-[0.16em]">
            Xem giỏ hàng
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-310 mx-auto">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#7f786f] mb-5">
          <Link to="/" className="hover:text-primary">Trang chủ</Link>
          <span>/</span>
          <Link to="/cart" className="hover:text-primary">Giỏ hàng</Link>
          <span>/</span>
          <span className="text-primary">Thanh toán</span>
        </div>
        <h1 className="font-serif text-3xl md:text-5xl mb-8">Thanh toán</h1>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6">
            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-[#7f786f] mb-4">Thông tin giao hàng</h2>
              <div className="space-y-4">
                {addrError && <p className="text-xs text-amber-800">{addrError}</p>}
                <div>
                  <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-2" htmlFor="buyerProvince">
                    Tỉnh / Thành phố (GHN) *
                  </label>
                  <select
                    id="buyerProvince"
                    value={buyerProvinceId}
                    onChange={(e) => {
                      setBuyerProvinceId(e.target.value);
                      setBuyerDistrictId('');
                      setBuyerWardCode('');
                      setDistricts([]);
                      setWards([]);
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-black/15 bg-white/70"
                    disabled={addrLoading.provinces}
                    required
                  >
                    <option value="">— Chọn tỉnh/thành —</option>
                    {provinces.map((p) => (
                      <option key={p.provinceId} value={String(p.provinceId)}>
                        {p.name}
                        {p.code ? ` (${p.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-2" htmlFor="buyerDistrict">
                    Quận / Huyện (GHN) *
                  </label>
                  <select
                    id="buyerDistrict"
                    value={buyerDistrictId}
                    onChange={(e) => {
                      setBuyerDistrictId(e.target.value);
                      setBuyerWardCode('');
                      setWards([]);
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-black/15 bg-white/70"
                    disabled={!buyerProvinceId || addrLoading.districts}
                    required
                  >
                    <option value="">— Chọn quận/huyện —</option>
                    {districts.map((d) => (
                      <option key={d.districtId} value={String(d.districtId)}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-2" htmlFor="buyerWard">
                    Phường / Xã (GHN) *
                  </label>
                  <select
                    id="buyerWard"
                    value={buyerWardCode}
                    onChange={(e) => setBuyerWardCode(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-black/15 bg-white/70"
                    disabled={!buyerDistrictId || addrLoading.wards}
                    required
                  >
                    <option value="">— Chọn phường/xã —</option>
                    {wards.map((w, idx) => (
                      <option key={`${buyerDistrictId}-${w.wardCode}-${idx}`} value={w.wardCode}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-2" htmlFor="shippingAddress">
                    Địa chỉ giao hàng *
                  </label>
                  <input
                    id="shippingAddress"
                    type="text"
                    value={form.shippingAddress}
                    onChange={(e) => handleChange('shippingAddress', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-black/15 bg-white/70"
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-2" htmlFor="phone">
                    Số điện thoại *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-black/15 bg-white/70"
                    placeholder="0912345678"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-2" htmlFor="note">
                    Ghi chú
                  </label>
                  <textarea
                    id="note"
                    value={form.note}
                    onChange={(e) => handleChange('note', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-black/15 bg-white/70 min-h-[80px]"
                    placeholder="Ghi chú cho đơn hàng (tùy chọn)"
                  />
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-5">
              <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-[#7f786f] mb-4">Phương thức thanh toán</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-black/15 bg-white/70 cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value={PAYMENT_VNPAY}
                    checked={paymentMethod === PAYMENT_VNPAY}
                    onChange={() => setPaymentMethod(PAYMENT_VNPAY)}
                  />
                  <span>Thanh toán qua VNPAY</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-black/15 bg-white/70 cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value={PAYMENT_COD}
                    checked={paymentMethod === PAYMENT_COD}
                    onChange={() => setPaymentMethod(PAYMENT_COD)}
                  />
                  <span>Thanh toán khi nhận hàng (COD)</span>
                </label>
              </div>
            </div>
          </div>

          <aside className="glass-strong rounded-2xl p-5 h-fit sticky top-24">
            <p className="text-xs uppercase tracking-[0.16em] text-[#7f786f]">Tạm tính hàng</p>
            <p className="font-serif text-2xl mt-1">
              {formatVnd(quotedItems != null ? quotedItems : clientItemsSubtotal)} đ
            </p>
            {quoteLoading && <p className="mt-2 text-xs text-[#7f786f]">Đang tính phí vận chuyển…</p>}
            {quoteError && <p className="mt-2 text-xs text-amber-700">{quoteError}</p>}
            {!addressReady && cartItemsPayload.length > 0 && (
              <p className="mt-2 text-xs text-[#7f786f]">Chọn đủ tỉnh, quận, phường để xem phí GHN.</p>
            )}
            {lines?.length > 0 && (
              <ul className="mt-3 text-sm space-y-1 text-[#5c564d] border-t border-black/10 pt-3">
                <li className="flex justify-between gap-2">
                  <span>Phí vận chuyển</span>
                  <span>{formatVnd(sumShipping)} đ</span>
                </li>
                <li className="flex justify-between gap-2">
                  <span>Giảm phí ship</span>
                  <span className="text-emerald-700">−{formatVnd(sumShipDisc)} đ</span>
                </li>
                {paymentMethod === PAYMENT_COD && (
                  <li className="flex justify-between gap-2">
                    <span>Phụ phí COD</span>
                    <span>{formatVnd(sumCod)} đ</span>
                  </li>
                )}
              </ul>
            )}
            <p className="text-xs uppercase tracking-[0.16em] text-[#7f786f] mt-4">Tổng thanh toán</p>
            <p className="font-serif text-3xl mt-1 text-primary">
              {grandTotal != null ? `${formatVnd(grandTotal)} đ` : '—'}
            </p>
            <p className="text-[10px] text-text-muted mt-1 leading-snug">
              Số tiền cuối do máy chủ xác định khi đặt hàng; báo giá trên có thể thay đổi nếu giỏ hoặc địa chỉ đổi.
            </p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || (quoteLoading && !quoteError) || !addressReady}
              className="mt-5 w-full h-11 rounded-full bg-primary text-white text-xs uppercase tracking-[0.16em] hover:bg-primary-soft transition-colors disabled:opacity-60"
            >
              {loading ? 'Đang xử lý...' : paymentMethod === PAYMENT_VNPAY ? 'Thanh toán qua VNPAY' : 'Đặt hàng'}
            </button>
          </aside>
        </form>
      </div>
    </div>
  );
}
