import axios from "axios";
import { toast } from "sonner";

// Global axios interceptor: when the backend rejects a write with 403
// (super-admin-only mutation), show a clear warning toast so the
// normal admin understands it was a permission issue, not a bug.
// Applied once at app boot from App.js.
let INSTALLED = false;
export function installRoleInterceptor() {
  if (INSTALLED) return;
  INSTALLED = true;
  axios.interceptors.response.use(
    (res) => res,
    (err) => {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || "";
      // Only fire our warning for "super admin required" style rejections.
      // Ignore the initial /auth/me probe on startup.
      const url = err?.config?.url || "";
      const isAuthProbe = url.includes("/auth/me") || url.includes("/auth/login");
      if (status === 403 && !isAuthProbe) {
        const msg = /super\s*admin/i.test(detail)
          ? "You cannot change these settings. Contact the super admin for this."
          : (detail || "You do not have permission to perform this action.");
        toast.warning(msg, { duration: 4500 });
      }
      return Promise.reject(err);
    }
  );
}

// Helper to short-circuit optimistic UI writes before hitting the backend.
// Pass `isSuper`; returns true if the write is allowed, else shows the
// warning and returns false.
export function assertWritable(isSuper) {
  if (isSuper) return true;
  toast.warning("You cannot change these settings. Contact the super admin for this.", { duration: 4000 });
  return false;
}
