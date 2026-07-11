import { Router } from 'express';
import bcrypt from 'bcryptjs';
import * as db from '../lib/db.js';
import { PARTNER_TYPES } from '../lib/db.js';
import { signToken, authRequired, loadUser } from '../middleware/auth.js';
import { generateReferralCode, generateLoginId, isValidLoginId, normalizeLoginId, generateFranchiseCode } from '../utils/helpers.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, partnerType, organization, city, state, address,
      franchiseName, territory, outletCount, investmentTier, operatingModel } = req.body;
    if (!name?.trim() || !email?.trim() || !password || !partnerType) {
      return res.status(400).json({ message: 'Name, email, password and partner type are required' });
    }
    if (!PARTNER_TYPES.includes(partnerType)) {
      return res.status(400).json({ message: 'Invalid partner type' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (db.findUser({ email: normalizedEmail })) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    let referralCode = generateReferralCode(name);
    while (db.findUser({ referralCode })) referralCode = generateReferralCode(name);

    let loginId = req.body.loginId ? normalizeLoginId(req.body.loginId) : generateLoginId(partnerType);
    if (!isValidLoginId(loginId)) {
      return res.status(400).json({ message: 'Partner ID must be 4–20 characters (letters, numbers, dash, underscore)' });
    }
    while (db.findUser({ loginId })) loginId = generateLoginId(partnerType);

    const hash = await bcrypt.hash(password, 10);
    const user = db.createUser({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || '',
      password: hash,
      role: 'partner',
      partnerType,
      loginId,
      organization: organization?.trim() || '',
      city: city?.trim() || '',
      state: state?.trim() || '',
      address: address?.trim() || '',
      referralCode,
      status: 'pending',
      ...(partnerType === 'franchise' ? {
        franchiseName: franchiseName?.trim() || organization?.trim() || name.trim(),
        territory: territory?.trim() || city?.trim() || '',
        outletCount: Number(outletCount) || 1,
        investmentTier: investmentTier || 'starter',
        operatingModel: operatingModel || 'single_outlet',
        franchiseCode: generateFranchiseCode(territory || city || name),
        royaltyPercent: investmentTier === 'flagship' ? 5 : investmentTier === 'growth' ? 6 : 8,
        commissionRate: 15,
        tier: 'gold',
      } : {}),
    });

    res.status(201).json({
      message: 'Registration successful! Your account is pending admin approval.',
      user: db.userToSafeJSON(user),
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const identifier = (req.body.identifier || req.body.email || '').trim();
    const { password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Partner ID / email and password are required' });
    }

    const user = db.findUserByLoginIdentifier(identifier);
    if (!user) return res.status(401).json({ message: 'Invalid credentials. Check your Partner ID or email.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials. Check your Partner ID or email.' });

    if (user.role === 'partner' && user.status === 'rejected') {
      return res.status(403).json({ message: 'Your registration was rejected. Contact admin for details.' });
    }
    if (user.role === 'partner' && user.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended. Contact admin.' });
    }

    db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });
    const token = signToken(user);
    res.json({ token, user: db.userToSafeJSON(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

router.get('/me', authRequired, loadUser, (req, res) => {
  res.json({ user: db.userToSafeJSON(req.user) });
});

router.put('/profile', authRequired, loadUser, (req, res) => {
  const { name, phone, organization, city, state, address } = req.body;
  const updates = {};
  if (name?.trim()) updates.name = name.trim();
  if (phone !== undefined) updates.phone = phone?.trim() || '';
  if (organization !== undefined) updates.organization = organization?.trim() || '';
  if (city !== undefined) updates.city = city?.trim() || '';
  if (state !== undefined) updates.state = state?.trim() || '';
  if (address !== undefined) updates.address = address?.trim() || '';
  const user = db.updateUser(req.user.id, updates);
  res.json({ user: db.userToSafeJSON(user) });
});

router.put('/change-password', authRequired, loadUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }
  const valid = await bcrypt.compare(currentPassword, req.user.password);
  if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    const updates = { password: hash };
    if (req.user.welcomePending) updates.welcomePending = false;
    db.updateUser(req.user.id, updates);
  res.json({ message: 'Password updated successfully' });
});

export default router;
