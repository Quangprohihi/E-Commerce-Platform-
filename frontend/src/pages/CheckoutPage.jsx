import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const PAYMENT_COD = 'COD';
const PAYMENT_VNPAY = 'VNPAY';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_VNPAY);
  const [form, setForm] = useState({
    shippingAddress: '',
    phone: '',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cart');
      const parsed = raw ? JSON.parse(raw) : [];
      setCart(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCart([]);
    }
  }, []);

  const total = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const price = Number(item.salePrice ?? item.price ?? 0);
        return sum + price * (Number(item.quantity) || 1);
      }, 0),
    [cart]
  );

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cart.length) {
      setError('Giỏ hàng trống.');
      return;
    }
    if (!form.shippingAddress?.trim() || !form.phone?.trim()) {
      setError('Vui lòng nhập địa chỉ giao hàng và số điện thoại.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const items = cart.map((item) => ({
        productId: item.id,
        quantity: Math.max(1, Number(item.quantity) || 1),
      }));
      const orderRes = await api.post('/orders', {
        items,
        shippingAddress: form.shippingAddress.trim(),
        phone: form.phone.trim(),
        note: form.note?.trim() || undefined,
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
      navigate('/account/orders', { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

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
            <p className="text-xs uppercase tracking-[0.16em] text-[#7f786f]">Tạm tính</p>
            <p className="font-serif text-3xl mt-2">{new Intl.NumberFormat('vi-VN').format(total)} đ</p>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
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
