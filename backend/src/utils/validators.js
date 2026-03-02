function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateRegister(body) {
  const { email, password, fullName, role } = body || {};
  if (!email || !password || !fullName) return { ok: false, message: 'Thiếu email, mật khẩu hoặc họ tên' };
  if (!isValidEmail(email)) return { ok: false, message: 'Email không hợp lệ' };
  if (password.length < 6) return { ok: false, message: 'Mật khẩu tối thiểu 6 ký tự' };

  const finalRole = (role === 'SELLER') ? 'SELLER' : 'BUYER';

  return { ok: true, data: { email, password, fullName, role: finalRole, phone: body.phone } };
}

function validateLogin(body) {
  const { email, password } = body || {};
  if (!email || !password) return { ok: false, message: 'Thiếu email hoặc mật khẩu' };
  return { ok: true, data: { email, password } };
}

module.exports = { isValidEmail, validateRegister, validateLogin };
