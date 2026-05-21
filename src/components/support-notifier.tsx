// Realtime CDC for support tables was removed to prevent cross-tenant data
// leaks. New-ticket / new-reply toasts now fire from the support pages
// themselves via react-query polling (see admin.support.tsx and
// salon.support.tsx). This global notifier is intentionally a no-op so the
// component can stay mounted at the root without behavioural surprises.
export function SupportNotifier() {
  return null;
}
