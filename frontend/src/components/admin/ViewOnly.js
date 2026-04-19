import React from "react";
import { Eye } from "lucide-react";

/**
 * ViewOnly
 * Wraps admin pages that should be visible to non-superadmins as *read-only*.
 * - Shows a yellow banner
 * - Disables every interactive element inside (buttons, inputs, selects, textareas)
 *   by applying CSS `pointer-events: none` + the native `inert` attribute.
 * - The backend independently enforces `require_superadmin` on mutations, so this is
 *   a UX hint, not a security boundary.
 *
 * Usage: <ViewOnly active={!isSuper}><SomeAdminComponent /></ViewOnly>
 */
export default function ViewOnly({ active, children }) {
  if (!active) return <>{children}</>;
  return (
    <div data-testid="view-only-wrapper" className="space-y-3">
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3 text-sm" data-testid="view-only-banner">
        <Eye size={16} />
        <span>
          <b>View-only mode.</b>&nbsp;You can browse this page but not make changes. Contact a Super Admin to modify any settings.
        </span>
      </div>
      {/* `inert` blocks focus + clicks natively; pointer-events as CSS fallback. */}
      <div className="view-only-content" inert="" style={{ pointerEvents: "none", userSelect: "text", opacity: 0.96 }}>
        {children}
      </div>
    </div>
  );
}
