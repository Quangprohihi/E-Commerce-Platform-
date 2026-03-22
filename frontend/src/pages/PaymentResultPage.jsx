import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRoleHomePath } from '../utils/auth';

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const { role } = useAuth();
  const status = searchParams.get('status') || 'fail';
  const orderId = searchParams.get('orderId') || '';
  const message = searchParams.get('message') || '';

  const isSuccess = status === 'success';
  const ordersLink = role === 'BUYER' ? '/account/orders' : role ? getRoleHomePath(role) : '/';
  const ordersLabel = role === 'BUYER' ? 'Xem đơn hàng' : role ? 'Về trang quản lý' : 'Trang chủ';

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center">
      <div className="max-w-md w-full glass-strong rounded-3xl p-8 text-center">
        <div className={`inline-flex w-16 h-16 rounded-full items-center justify-center mb-6 ${isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isSuccess ? (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <h1 className="font-serif text-2xl md:text-3xl mb-2">
          {isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại'}
        </h1>
        {!isSuccess && message && <p className="text-text-muted text-sm mb-4">{decodeURIComponent(String(message))}</p>}
        {orderId && <p className="text-sm text-[#7f786f] mb-6">Mã đơn hàng: {orderId.slice(0, 12)}...</p>}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={ordersLink}
            className="inline-flex px-6 py-3 rounded-full bg-primary text-white text-xs uppercase tracking-[0.16em] hover:bg-primary-soft transition-colors"
          >
            {ordersLabel}
          </Link>
          <Link
            to="/"
            className="inline-flex px-6 py-3 rounded-full border border-black/15 text-xs uppercase tracking-[0.16em] hover:bg-white/80"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
