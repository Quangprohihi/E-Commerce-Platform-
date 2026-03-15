function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateRegister(body) {
  const { email, password, fullName, role } = body || {};
  if (!email || !password || !fullName) return { ok: false, message: 'Thieu email, mat khau hoac ho ten' };
  if (!isValidEmail(email)) return { ok: false, message: 'Email khong hop le' };
  if (password.length < 6) return { ok: false, message: 'Mat khau toi thieu 6 ky tu' };

  const finalRole = role === 'SELLER' ? 'SELLER' : 'BUYER';
  return { ok: true, data: { email, password, fullName, role: finalRole, phone: body.phone } };
}

function validateLogin(body) {
  const { email, password } = body || {};
  if (!email || !password) return { ok: false, message: 'Thieu email hoac mat khau' };
  return { ok: true, data: { email, password } };
}

function validateForgotPassword(body) {
  const email = String(body?.email || '').trim();
  if (!email) return { ok: false, message: 'Thieu email' };
  if (!isValidEmail(email)) return { ok: false, message: 'Email khong hop le' };
  return { ok: true, data: { email } };
}

function validateResetPassword(body) {
  const token = String(body?.token || '').trim();
  const email = String(body?.email || '').trim();
  const newPassword = String(body?.newPassword || '');

  if (!token && !email) return { ok: false, message: 'Thieu thong tin dat lai mat khau' };
  if (email && !isValidEmail(email)) return { ok: false, message: 'Email khong hop le' };
  if (!newPassword) return { ok: false, message: 'Thieu mat khau moi' };
  if (newPassword.length < 6) return { ok: false, message: 'Mat khau toi thieu 6 ky tu' };

  return { ok: true, data: { token, email, newPassword } };
}

function validateProfileUpdate(body) {
  const { fullName, phone, avatar } = body || {};

  if (!fullName || !String(fullName).trim()) {
    return { ok: false, message: 'Ho ten la bat buoc' };
  }

  if (!phone || !String(phone).trim()) {
    return { ok: false, message: 'So dien thoai la bat buoc' };
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

module.exports = {
  isValidEmail,
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateProfileUpdate,
};
