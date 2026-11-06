# Project conventions

- Keep canonical and Open Graph URLs on individual content routes, using the public site origin; root metadata must not include canonical links or share images, because inherited tags can override page-specific signals.
- Generate the dynamic sitemap using paginated public reads with existing access policies and return a failure instead of incomplete XML when a source fails; sitemap generation must not bypass public visibility with an admin client.
- Keep SEO advisor AI calls in server-only modules behind bearer verification and a platform_admin role check; stream recommendations to the admin page and never auto-apply generated copy, because suggestions are not verified search data.
- Persist provider access denials in seo_ai_access_state and fail closed while blocked; clear the matching row only after a workspace administrator confirms provider access has been restored, so reloads cannot replay denied work.
- Keep Features page walkthroughs isolated from live booking and owner workflows, and label their sample data so previews cannot mutate records or imply actual business results.
- Delete gallery rows with an ownership-scoped, returning query before best-effort storage cleanup; keep destructive photo actions visible on touch devices and behind confirmation to protect live covers.
- Queue new support ticket alerts on insertion using the existing SMS queue, excluding admin-created tickets and message bodies to avoid duplicate and sensitive notifications.
- Text the shop owner through the same SMS queue when support replies or a ticket is resolved or closed, alerting once per owner turn so a burst of internal replies cannot spam them; keep message bodies out of owner alerts.