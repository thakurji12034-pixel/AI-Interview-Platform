module.exports = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Forbidden: insufficient role' },
      message: 'Forbidden: insufficient role',
    });
  }
  next();
};
