# Project conventions

- Keep canonical and Open Graph URLs on individual content routes, using the public site origin; root metadata must not include canonical links or share images, because inherited tags can override page-specific signals.
- Generate the dynamic sitemap using paginated public reads with existing access policies and return a failure instead of incomplete XML when a source fails; sitemap generation must not bypass public visibility with an admin client.