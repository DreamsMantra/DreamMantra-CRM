import { statusMeta } from '../utils/constants';

export default function StatusBadge({ status }) {
  const meta = statusMeta(status);
  return <span className={`dm-badge ${meta.color}`}>{meta.label}</span>;
}
