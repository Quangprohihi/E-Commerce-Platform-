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

function validateProfileUpdate(body) {
  const { fullName, phone, avatar } = body || {};

  if (!fullName || !String(fullName).trim()) {
    return { ok: false, message: 'Họ tên là bắt buộc' };
  }

  if (!phone || !String(phone).trim()) {
    return { ok: false, message: 'Số điện thoại là bắt buộc' };
  }

  return {
    ok: true,
    data: {
      fullName: String(fullName).trim(),
      phone: String(phone).trim(),
      avatar: avatar ? String(avatar).trim() : null,
    },
  };
}

module.exports = { isValidEmail, validateRegister, validateLogin, validateProfileUpdate };
