export function fieldEnabled(fields, key) {
  if (!fields?.length) return true;
  const f = fields.find((x) => x.key === key);
  return f ? f.enabled !== false : true;
}

export function fieldLabel(fields, key, fallback) {
  return fields?.find((x) => x.key === key)?.label || fallback;
}

export function fieldRequired(fields, key, fallback = false) {
  const f = fields?.find((x) => x.key === key);
  return f ? !!f.required : fallback;
}
