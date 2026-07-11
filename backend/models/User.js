import mongoose from 'mongoose';

export const PARTNER_TYPES = [
  'referral_partner',
  'teacher',
  'school',
  'college',
  'coaching_center',
  'influencer',
  'counsellor',
];

export const USER_ROLES = ['admin', 'partner'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: 'partner' },
    partnerType: {
      type: String,
      enum: [...PARTNER_TYPES, null],
      default: null,
    },
    organization: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    address: { type: String, trim: true },
    referralCode: { type: String, unique: true, sparse: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'rejected'],
      default: 'pending',
    },
    commissionRate: { type: Number, default: 10, min: 0, max: 100 },
    totalLeads: { type: Number, default: 0 },
    convertedLeads: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    partnerType: this.partnerType,
    organization: this.organization,
    city: this.city,
    state: this.state,
    address: this.address,
    referralCode: this.referralCode,
    status: this.status,
    commissionRate: this.commissionRate,
    totalLeads: this.totalLeads,
    convertedLeads: this.convertedLeads,
    totalEarnings: this.totalEarnings,
    notes: this.notes,
    createdAt: this.createdAt,
    lastLoginAt: this.lastLoginAt,
  };
};

export default mongoose.model('User', userSchema);
