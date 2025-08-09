// Turn "6 → 3 → 11 → 1 → 13" into [6,3,11,1,13]
export function toArrowString(nums) {
  return nums.join(" \u2192 "); // " → "
}

export function parsePath(str) {
  return String(str)
    .split(/[\-\u2192>]+/)     // handles "->" and "→"
    .map(s => parseInt(s.trim(), 10))
    .filter(n => Number.isFinite(n));
}

// Rotate so it starts at 1; ensure it *ends* with 1
export function normalizeToStartAtOne(nums) {
  if (!nums?.length) return [];
  const i = nums.indexOf(1);
  const rotated = i >= 0 ? [...nums.slice(i), ...nums.slice(0, i)] : nums.slice();
  if (rotated[rotated.length - 1] !== 1) rotated.push(1);
  return rotated;
}
