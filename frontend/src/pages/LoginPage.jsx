import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getRoleHomePath } from '../utils/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, role, login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    navigate(getRoleHomePath(role), { replace: true });
  }, [isAuthenticated, navigate, role]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', form);
      const payload = res.data?.data || {};
      login(payload.user, payload.token);
      navigate(getRoleHomePath(payload.user?.role), { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-16 px-4">
      <div className="max-w-md mx-auto glass-strong rounded-3xl p-6 md:p-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#7f786f] mb-2">KÍNH TỐT</p>
        <h1 className="font-serif text-3xl mb-6">Đăng nhập</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full h-11 rounded-full px-4 border border-black/10 bg-white/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-[0.12em] text-[#7f786f] mb-2" htmlFor="password">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className="w-full h-11 rounded-full pl-4 pr-12 border border-black/10 bg-white/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="********"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7f786f] hover:text-primary transition-colors"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="mt-2 text-right">
              <Link
                to={form.email.trim() ? `/forgot-password?email=${encodeURIComponent(form.email.trim())}` : '/forgot-password'}
                className="text-xs text-primary hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-full bg-primary text-white text-xs uppercase tracking-[0.16em] hover:bg-primary-soft transition-colors disabled:opacity-60"
          >
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="mt-5 text-sm text-text-muted">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-primary hover:underline">
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
}
