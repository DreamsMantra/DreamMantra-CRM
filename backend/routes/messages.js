import { Router } from 'express';
import * as db from '../lib/db.js';
import { sortByDate } from '../lib/store.js';
import { authRequired, loadUser } from '../middleware/auth.js';
import { upload, detectMessageType } from '../lib/upload.js';
import { notifyUser } from '../utils/helpers.js';

const router = Router();

router.use(authRequired, loadUser);

function resolveOtherUser(req) {
  const admin = db.getAdminUser();
  if (req.user.role === 'partner') {
    if (!admin) throw new Error('Admin account not configured');
    return admin;
  }
  const otherId = req.params.otherUserId || req.body.recipientId;
  const other = db.findUser({ id: otherId });
  if (!other || other.role !== 'partner') throw new Error('Partner not found');
  return other;
}

router.get('/inbox', (req, res) => {
  const inbox = db.getInboxForUser(req.user.id, req.user.role);
  if (req.user.role === 'admin') {
    const partners = db.queryUsers({ status: 'all' });
    partners.forEach((p) => {
      if (!inbox.find((i) => i.otherUserId === p.id)) {
        inbox.push({
          otherUserId: p.id,
          otherUserName: p.name,
          otherUserRole: 'partner',
          otherUserAvatar: p.name?.charAt(0) || 'P',
          lastMessage: 'Start conversation',
          lastAt: p.createdAt,
          unread: 0,
          conversationId: db.conversationId(req.user.id, p.id),
        });
      }
    });
  }
  res.json({ inbox: sortByDate(inbox, 'lastAt') });
});

router.get('/thread/:otherUserId?', (req, res) => {
  try {
    const other = req.user.role === 'partner'
      ? db.getAdminUser()
      : db.findUser({ id: req.params.otherUserId });
    if (!other) return res.status(404).json({ message: 'User not found' });
    db.markThreadRead(req.user.id, other.id);
    const messages = db.getThread(req.user.id, other.id);
    res.json({ messages, otherUser: db.userToSafeJSON(other) });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

router.post('/send', upload.single('file'), async (req, res) => {
  try {
    let recipient;
    if (req.user.role === 'partner') {
      recipient = db.getAdminUser();
    } else {
      recipient = db.findUser({ id: req.body.recipientId });
      if (!recipient || recipient.role !== 'partner') {
        return res.status(400).json({ message: 'Invalid recipient' });
      }
    }

    let attachment = null;
    if (req.file) {
      const url = `/api/uploads/${req.file.filename}`;
      attachment = {
        url,
        name: req.file.originalname,
        mime: req.file.mimetype,
        size: req.file.size,
        type: detectMessageType(req.file.mimetype, req.file.originalname),
      };
    }

    const text = req.body.message || req.body.text || '';
    if (!text.trim() && !attachment) {
      return res.status(400).json({ message: 'Message or file required' });
    }

    const msg = db.createDirectMessage({
      senderId: req.user.id,
      senderName: req.user.name,
      senderRole: req.user.role,
      recipientId: recipient.id,
      text,
      attachment,
    });

    await notifyUser(recipient.id, {
      title: `Message from ${req.user.name}`,
      message: text.slice(0, 80) || `Sent ${attachment?.name || 'a file'}`,
      type: 'message',
      link: req.user.role === 'admin' ? '/partner?tab=messages' : '/admin?tab=messages',
    });

    res.status(201).json({ message: msg });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Send failed' });
  }
});

router.patch('/read/:otherUserId', (req, res) => {
  const other = db.findUser({ id: req.params.otherUserId });
  if (!other) return res.status(404).json({ message: 'User not found' });
  db.markThreadRead(req.user.id, other.id);
  res.json({ ok: true });
});

export default router;
