import jwt from 'jsonwebtoken';
import * as db from '../lib/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      partnerType: user.partnerType,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function loadUser(req, res, next) {
  const user = db.findUser({ id: req.auth.id });
  if (!user) return res.status(401).json({ message: 'User not found' });
  req.user = user;
  next();
}

export function adminOnly(req, res, next) {
  if (req.auth?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
}

export function partnerOnly(req, res, next) {
  if (req.auth?.role !== 'partner') return res.status(403).json({ message: 'Partner access required' });
  next();
}

export function activePartnerOnly(req, res, next) {
  if (req.user?.role === 'partner' && req.user.status !== 'active') {
    return res.status(403).json({
      message: 'Your partner account is not active yet. Please wait for admin approval.',
      status: req.user.status,
    });
  }
  next();
}
