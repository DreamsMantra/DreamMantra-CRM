/** Normalize lead create/update payload for B2C student vs B2B business */

export function normalizeLeadInput(data) {
  const leadType = data.leadType === 'business' ? 'business' : 'student';

  if (leadType === 'business') {
    const companyName = (data.companyName || '').trim();
    const contactPerson = (data.contactPerson || '').trim();
    const contactPhone = (data.contactPhone || data.studentPhone || '').trim();
    if (!companyName || !contactPerson || !contactPhone) {
      const err = new Error('Company name, contact person and phone are required for B2B leads');
      err.status = 400;
      throw err;
    }
    const dealValue = Number(data.dealValue || data.expectedValue) || 0;
    return {
      leadType: 'business',
      companyName,
      contactPerson,
      contactPhone,
      contactEmail: (data.contactEmail || data.studentEmail || '').trim().toLowerCase(),
      businessType: data.businessType || 'other',
      estimatedStudents: Number(data.estimatedStudents) || 0,
      dealValue,
      city: (data.city || '').trim(),
      state: (data.state || '').trim(),
      notes: (data.notes || '').trim(),
      priority: data.priority || 'medium',
      interestedIn: Array.isArray(data.interestedIn) ? data.interestedIn : [],
      expectedValue: dealValue,
      studentName: companyName,
      studentPhone: contactPhone,
      studentEmail: (data.contactEmail || data.studentEmail || '').trim().toLowerCase(),
    };
  }

  const studentName = (data.studentName || '').trim();
  const studentPhone = (data.studentPhone || '').trim();
  if (!studentName || !studentPhone) {
    const err = new Error('Student name and phone are required for B2C leads');
    err.status = 400;
    throw err;
  }

  return {
    leadType: 'student',
    studentName,
    studentPhone,
    studentEmail: (data.studentEmail || '').trim().toLowerCase(),
    parentName: (data.parentName || '').trim(),
    parentPhone: (data.parentPhone || '').trim(),
    classGrade: (data.classGrade || '').trim(),
    stream: (data.stream || '').trim(),
    city: (data.city || '').trim(),
    state: (data.state || '').trim(),
    schoolCollege: (data.schoolCollege || '').trim(),
    interestedIn: Array.isArray(data.interestedIn) ? data.interestedIn : [],
    notes: (data.notes || '').trim(),
    priority: data.priority || 'medium',
    gender: data.gender || '',
    dateOfBirth: data.dateOfBirth || '',
    budget: data.budget || '',
    preferredContactTime: data.preferredContactTime || '',
    pincode: data.pincode || '',
    whatsappOptIn: data.whatsappOptIn !== false,
    expectedValue: Number(data.expectedValue) || 0,
  };
}
