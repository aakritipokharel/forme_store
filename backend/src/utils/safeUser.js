const safeUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  ...(user.phone ? { phone: user.phone } : {}),
  ...(user.createdAt ? { createdAt: user.createdAt } : {}),
});

module.exports = safeUser;
