/**
 * Splits a reference person's display into a 2-line label:
 *   - primary:   the person's name (e.g. "Late Shri Ramswaroop Ji Panchariya")
 *   - secondary: contextual subtitle (spouse name, family branch, etc.)
 *
 * Resolution order:
 *   1. If `description` is provided, use it verbatim as secondary.
 *   2. Else if `name` contains "(...)", strip the brackets out → primary is the
 *      part before the first "(", secondary is the bracketed contents.
 *   3. Else: secondary = "" (single-line item).
 */
export function splitReferenceLabel({ name = "", description = "" } = {}) {
  const desc = (description || "").trim();
  if (desc) return { primary: name.trim(), secondary: desc };

  const m = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (m) return { primary: m[1].trim(), secondary: m[2].trim() };

  return { primary: name.trim(), secondary: "" };
}
