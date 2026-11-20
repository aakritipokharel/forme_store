const jwt = require('jsonwebtoken');
const User = require('../models/User');

const requireAuth = async (request, response, next) => {
  const authorization = request.get('Authorization');
  if (!authorization) {
    return response.status(401).json({
      success: false,
      message: 'Authentication is required',
    });
  }

  const [scheme, token, ...extraParts] = authorization.trim().split(/\s+/);
  if (scheme !== 'Bearer' || !token || extraParts.length > 0) {
    return response.status(401).json({
      success: false,
      message: 'Authorization must use a Bearer token',
    });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new Error('JWT_SECRET is not configured'));
  }

  let payload;
  try {
    payload = jwt.verify(token, secret);
  } catch {
    return response.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  if (!payload || typeof payload !== 'object' || typeof payload.sub !== 'string') {
    return response.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    return response.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  request.user = user;
  return next();
};

const requireAdmin = (request, response, next) => {
  if (!request.user) {
    return response.status(401).json({
      success: false,
      message: 'Authentication is required',
    });
  }

  if (request.user.role !== 'admin') {
    return response.status(403).json({
      success: false,
      message: 'Administrator access is required',
    });
  }

  return next();
};

module.exports = {
  requireAuth,
  requireAdmin,
};
