# Project conventions

- Keep canonical and Open Graph URLs on individual content routes, using the public site origin; root metadata must not include canonical links or share images, because inherited tags can override page-specific signals.
- Generate the dynamic sitemap using paginated public reads with existing access policies and return a failure instead of incomplete XML when a source fails; sitemap generation must not bypass public visibility with an admin client.
- Keep SEO advisor AI calls in server-only modules behind bearer verification and a platform_admin role check; stream recommendations to the admin page and never auto-apply generated copy, because suggestions are not verified search data.
- Persist provider access denials in seo_ai_access_state and fail closed while blocked; clear the matching row only after a workspace administrator confirms provider access has been restored, so reloads cannot replay denied work.