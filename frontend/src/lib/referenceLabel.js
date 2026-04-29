/**
 * Splits a reference person's display into a 2-line label:
 *   - primary:   the person's name (e.g. "Late Shri Ramswaroop Ji Panchariya")
 *   - secondary: contextual subtitle (spouse name, family branch, etc.)
 *
 * Resolution order:
 *   1. If lang === "hi" and name_hi is present, use name_hi as primary.
 *   2. If lang === "hi" and description_hi is present, use it as secondary.
 *   3. Else if `description` is provided, use it verbatim as secondary.
 *   4. Else if `name` contains "(...)", strip the brackets out → primary is the
 *      part before the first "(", secondary is the bracketed contents.
 *   5. Else: secondary = "" (single-line item).
 */
export function splitReferenceLabel({ name = "", name_hi = "", description = "", description_hi = "" } = {}, lang = "en") {
  const isHi = lang === "hi";
  const displayName = (isHi && name_hi) ? name_hi : name;
  const displayDesc = (isHi && description_hi) ? description_hi : (description || "").trim();

  if (displayDesc) return { primary: displayName.trim(), secondary: displayDesc };

  const m = displayName.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (m) return { primary: m[1].trim(), secondary: m[2].trim() };

  return { primary: displayName.trim(), secondary: "" };
}
