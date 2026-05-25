const standardizeMajorSection = (val) => {
  if (!val) return '';
  // Normalize all variations of newlines/carriage returns to spaces
  let cleaned = String(val).replace(/\r\n/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ');
  
  // Match patterns like (APR-BRND) ANUPPUR-BORIDAND or (APR-BRND)ANUPPUR-BORIDAND
  const match = cleaned.match(/^\(([^)]+)\)([\s\S]+)$/);
  if (match) {
    const code = match[1].trim();
    const name = match[2].replace(/\s+/g, ' ').trim();
    return `(${code}) ${name}`;
  }
  return cleaned.replace(/\s+/g, ' ').trim();
};

const standardizeString = (val) => {
  if (!val) return '';
  return String(val).replace(/\s+/g, ' ').trim();
};

module.exports = {
  standardizeMajorSection,
  standardizeString
};
