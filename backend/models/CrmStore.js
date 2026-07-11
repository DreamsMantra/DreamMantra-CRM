import mongoose from 'mongoose';

const crmStoreSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'main' },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'crm_store', minimize: false }
);

export default mongoose.models.CrmStore || mongoose.model('CrmStore', crmStoreSchema);
