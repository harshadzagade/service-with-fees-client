// Client-side GST & Fee Calculator matching the backend implementation exactly
export function calculateFee({
  calculationType,
  basePrice,
  additionalPrice,
  gstRate,
  isGstExempt,
  submittedData = {},
  includedQuantity = 1
}) {
  const base = Number(basePrice || 0);
  const additional = Number(additionalPrice || 0);
  const rate = isGstExempt ? 0 : Number(gstRate || 0);

  let baseAmount = 0;
  let qtyUsed = 1;
  let addQty = 0;
  let addFee = 0;

  // 1. Resolve qty and semester count dynamically using fuzzy matching
  const qtyKey = Object.keys(submittedData || {}).find(k => 
    k.toLowerCase().includes('copies') || 
    k.toLowerCase().includes('quantity') || 
    k.toLowerCase().includes('qty')
  );
  const qtyVal = qtyKey ? Number(submittedData[qtyKey]) : 1;
  const qty = isNaN(qtyVal) ? 1 : qtyVal;

  const semKey = Object.keys(submittedData || {}).find(k => 
    k.toLowerCase().includes('semester') || 
    k.toLowerCase().includes('sem')
  );
  const semesters = semKey ? submittedData[semKey] : null;
  const semesterCount = Array.isArray(semesters) ? semesters.length : (semesters !== null && semesters !== undefined ? 1 : 1);

  // 2. Calculate Base Price based on type
  switch (calculationType) {
    case 'FIXED': {
      baseAmount = base;
      break;
    }
    case 'FLAT_COPY_WISE': {
      qtyUsed = qty;
      baseAmount = base * qtyUsed;
      break;
    }
    case 'BASE_PLUS_ADDITIONAL': {
      qtyUsed = qty;
      addQty = Math.max(0, qtyUsed - includedQuantity);
      addFee = additional * addQty;
      baseAmount = base + addFee;
      break;
    }
    case 'SEMESTER_WISE': {
      qtyUsed = semesterCount;
      baseAmount = base * qtyUsed;
      break;
    }
    default: {
      baseAmount = base;
    }
  }

  // 3. Calculate GST
  const rawGst = baseAmount * (rate / 100);
  const gstAmount = Math.round(rawGst * 100) / 100; // Retain 2 decimals

  // 4. CGST/SGST Split
  const cgstAmount = Math.round((gstAmount / 2) * 100) / 100;
  const sgstAmount = Math.round((gstAmount - cgstAmount) * 100) / 100;

  // 5. Rounding calculations
  const totalBeforeRoundOff = baseAmount + gstAmount;
  const totalAmount = Math.round(totalBeforeRoundOff);
  const roundOff = Math.round((totalAmount - totalBeforeRoundOff) * 100) / 100;

  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    gstAmount,
    cgstAmount,
    sgstAmount,
    roundOff,
    totalAmount,
    qty: qtyUsed,
    basePrice: base,
    additionalPrice: additional,
    additionalQty: addQty,
    additionalFee: Math.round(addFee * 100) / 100,
  };
}
