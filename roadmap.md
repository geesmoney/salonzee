# Local SEO advisor
- [x] Add admin-only phrase/city advisor and navigation.
- [x] Add server-side AI streaming, access checks, cancellation and safe errors.
- [x] Verify permissions, live generation and mobile layout.

# Owner gallery and ticket alerts
- [x] Make owner photo removal and replacement easy to find without deleting unspecified photos.
- [x] Notify the administrator of new support tickets through the existing SMS service.
- [x] Verify actual owner gallery and cancel flow, existing permissions, and ticket/SMS rules with rolled-back tests; no real photos deleted or test SMS sent.

# Platform booking reports
- [x] Add read-only admin reports across all shops with daily, weekly, monthly and status totals.
- [x] Verify totals, server-side admin check, signed-out denial and mobile layout without modifying bookings.

# Starter search guides
- [x] Add four factual customer/owner guides and a public blog index.
- [x] Link guides from navigation, directory and sitemap; improve directory search copy without changing filters or bookings.
- [x] Verify article links, search metadata, sitemap and phone layouts.

# Journal voice rewrite
- [x] Rewrite all four guides in Godwin's conversational style with proper introductions and conclusions.
- [x] Preserve factual limitations, URLs and search metadata; verify articles and phone layouts.

# Analytics submission safeguards
- [x] Validate visit/install submissions and preserve anonymous tracking and existing reports.
- [x] Verify accepted events, rejected malformed events, Google Ads attribution and public pages.
- [ ] After the new tracker is published and verified, revoke legacy browser inserts; blocked on publication to avoid undercounting the live site.
- [ ] Repeated-submission throttling requires informed confirmation of an ad-hoc limit because the backend has no standard limiter.

# Owner booking and update notifications
- [x] Audit existing push subscriptions and booking wiring.
- [x] Add private inbox, opt-in chimes, and push for owner booking/support/listing/profile alerts without extra SMS.
- [x] Verify recipient-only policies, deduplication, signed-in inbox/read receipt, mobile sound controls and push key encryption; temporary alert removed and rolled-back queue tests passed.
- [ ] Verify real phone delivery/sound after publication and owner permission; requires an opted-in owner device.
# Customer accounts and ad conversions
- [x] Customer sign-up/sign-in, My bookings page with spending, password reset, save-booking-to-account after guest booking.
- [ ] Registration conversion for Google Ads; waits on the Registration event snippet label from Google Ads.
- [ ] Booking-completed conversion for Search ads; waits on a new conversion action label from Google Ads.

# Shareable app install link
- [x] Link https://salonzee.com/#install-app directly to a visible install control with manual fallback instructions.
- [x] Verify phone-sized direct-link scrolling, instructions and unchanged ordinary homepage behavior.

# Assisted salon onboarding leads
- [x] Add a short public lead form with campaign attribution, validation and spam safeguards.
- [x] Store leads privately, queue an admin SMS alert and add an admin follow-up page.
- [x] Test a real submission and access rules, remove only the test lead, and verify registration, booking and mobile flows remain unchanged.

# Clear customer account setup
- [x] Make customer account creation visible before and after booking without making an account mandatory.
- [x] Separate customer setup guidance from business registration and give new customers clear next steps.
- [x] Send signed-in customers to My bookings on mobile while preserving owner/admin destinations and the existing booking-claim code; verify role routing, recovery, guest browsing and phone layouts without creating live bookings or SMS.
