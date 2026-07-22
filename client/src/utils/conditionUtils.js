/**
 * conditionUtils.js
 * Shared utilities for dynamic cable condition classification.
 *
 * Classification rules (per quad reading):
 *   - Extremely Critical : any non-missing value is <= 10
 *   - Critical           : any non-missing value is < 20 (and > 10)
 *   - Excellent          : all non-missing values are exactly 100
 *   - Good               : all non-missing values are > 20, and NOT all are 100
 *                          (also the default when all three values are missing/"-")
 *
 * Missing / "-" values are neutral — they inherit the category of the
 * non-missing values and never independently block a better or worse result.
 *
 * Entry-level condition = worst quad condition across all quadReadings:
 *   Extremely Critical > Critical > Good > Excellent
 */

const PRIORITY = { 'Extremely Critical': 4, Critical: 3, Good: 2, Excellent: 1 };

/**
 * Classifies a single quad reading row.
 * @param {object} q  - quadReading object with insulationL1E, insulationL2E, insulationL1L2
 * @returns {'Excellent'|'Good'|'Critical'|'Extremely Critical'}
 */
export function getQuadCondition(q) {
  const raw = [q.insulationL1E, q.insulationL2E, q.insulationL1L2];

  // Parse only real numeric values; treat "-", null, undefined, "", NaN as missing
  const numeric = raw
    .map((v) => {
      if (v === null || v === undefined || v === '' || v === '-' || v === '—') return null;
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    })
    .filter((v) => v !== null);

  // Priority 1: Extremely Critical — any known value is <= 10
  if (numeric.some((v) => v <= 10)) {
    return 'Extremely Critical';
  }

  // Priority 2: Critical — any known value is < 20 (and > 10)
  if (numeric.some((v) => v < 20)) {
    return 'Critical';
  }

  // Priority 3: Excellent — every known value equals 100
  // (if all are missing, defaults to Excellent which is then treated as Good below)
  if (numeric.length === 0 || numeric.every((v) => v === 100)) {
    // But only truly Excellent if there are values to confirm it
    // If all missing → treat as Good (safe/unknown default)
    if (numeric.length === 0) return 'Good';
    return 'Excellent';
  }

  // Priority 4: Good — all known values are > 20
  return 'Good';
}

/**
 * Derives the entry-level condition as the worst condition across all quad readings.
 * Extremely Critical > Critical > Good > Excellent
 * @param {object} entry  - entry object with a quadReadings array
 * @returns {'Excellent'|'Good'|'Critical'|'Extremely Critical'}
 */
export function getEntryCondition(entry) {
  const readings = entry?.quadReadings;
  if (!readings || readings.length === 0) return 'Good';

  let worst = 'Excellent';
  for (const q of readings) {
    const cond = getQuadCondition(q);
    if ((PRIORITY[cond] || 0) > (PRIORITY[worst] || 0)) {
      worst = cond;
      if (worst === 'Extremely Critical') break; // Can't get worse
    }
  }
  return worst;
}

/**
 * Computes dashboard card counts from an array of entries.
 * @param {Array} entries
 * @returns {{ total: number, excellent: number, good: number, critical: number, extremelyCritical: number, healthScore: number }}
 */
export function getDashboardStats(entries) {
  if (!entries || entries.length === 0) {
    return { total: 0, excellent: 0, good: 0, critical: 0, extremelyCritical: 0, healthScore: 0 };
  }

  let excellent = 0;
  let good = 0;
  let critical = 0;
  let extremelyCritical = 0;

  for (const entry of entries) {
    const cond = getEntryCondition(entry);
    if (cond === 'Extremely Critical') extremelyCritical++;
    else if (cond === 'Critical') critical++;
    else if (cond === 'Excellent') excellent++;
    else good++;
  }

  const total = entries.length;
  const healthScore = total > 0 ? Math.round((excellent / total) * 100) : 0;

  return { total, excellent, good, critical, extremelyCritical, healthScore };
}

/**
 * Computes the lowest insulation metric across all quads for a given entry.
 * Checks: insulationL1E (L1/E), insulationL2E (L2/E), insulationL1L2 (L1/L2).
 * @param {object} entry
 * @returns {{ metric: string, quadNo: string, value: number, rawValue: string } | null}
 */
export function getLowestMetric(entry) {
  const readings = entry?.quadReadings;
  if (!readings || readings.length === 0) return null;

  let minObj = null;

  for (const q of readings) {
    const rawQuadNo = q.quadNo !== undefined && q.quadNo !== null ? String(q.quadNo).trim() : '';
    const quadLabel = rawQuadNo.toLowerCase().startsWith('quad')
      ? rawQuadNo
      : rawQuadNo ? `Quad ${rawQuadNo}` : 'Quad ?';

    const metrics = [
      { name: 'L1/E', valStr: q.insulationL1E },
      { name: 'L2/E', valStr: q.insulationL2E },
      { name: 'L1/L2', valStr: q.insulationL1L2 },
    ];

    for (const m of metrics) {
      if (m.valStr === null || m.valStr === undefined || m.valStr === '' || m.valStr === '-' || m.valStr === '—') continue;
      const num = parseFloat(m.valStr);
      if (isNaN(num)) continue;

      if (!minObj || num < minObj.value) {
        minObj = {
          metric: m.name,
          quadNo: quadLabel,
          value: num,
          rawValue: m.valStr
        };
      }
    }
  }

  return minObj;
}

/**
 * Formats the lowest metric analysis as plain text (e.g. for Excel export).
 * @param {object} entry
 * @returns {string}
 */
export function formatLowestMetricText(entry) {
  const lowest = getLowestMetric(entry);
  if (!lowest) return '—';
  return `${lowest.metric} (${lowest.rawValue} MΩ) - ${lowest.quadNo}`;
}

