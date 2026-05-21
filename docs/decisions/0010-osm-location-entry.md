# 0010 — OpenStreetMap-based location entry

- **Status:** Accepted
- **Date:** 2026-05-21
- **Deciders:** Kim

## Context

An event's location is a plain free-text field — the creator types whatever they like, and the event page shows it as text. We want richer entry: address autocomplete while creating, and a way for guests to get directions. That needs a maps/geocoding provider.

vite.in is GDPR-focused, cost-conscious, open-source, and EU-centric. The location surfaces split in two: the **create flow** (the creator enters an address) and the **event page** (guests, unauthenticated, see it and want directions).

## Decision

Use an **OpenStreetMap-based stack, not Google Maps**, in stages.

**Stage 1 (this ADR's scope):**

- **Create flow** — address autocomplete on the location field, backed by an OSM geocoder (Geoapify — OSM data, free tier, API key). The browser calls a **same-origin server proxy** (`/api/geocode`); the key stays server-side and there is no third-party request from the browser, so no CSP change and no consent concern. Picking a suggestion fills the formatted address as plain text.
- **Event page** — a plain "directions" **link** built from the location text. No embedded map: a link loads nothing third-party until the guest clicks it, so it carries no tracking and needs no consent.
- **Graceful fallback** — with no geocoder key configured (open-source checkouts, self-hosters), the location field is the plain text input it is today.

**Stage 2 (later, separate):** an embedded Leaflet + OSM-tiles map on the event page, and storing `events.location_lat` / `location_lng` (columns already exist) — the map is what actually needs coordinates.

## Alternatives considered

- **Google Maps Platform** — rejected: per-request billing on autocomplete and map loads; an embedded Google map is a tracking surface that needs consent _before_ it loads (heavy for a guest-facing page); the API key burdens self-hosters. A user-clicked external link is fine, but the embedded/autocomplete path is not.
- **Embedded interactive map now** — deferred to Stage 2: it adds consent, CSP, and scope that a directions link does not.
- **Storing lat/lng in Stage 1** — deferred: Stage 1 only needs address text. Coordinates belong with the Stage-2 map, which is the feature that needs them; adding them now would pull in an API/spec/SDK/migration change for no Stage-1 benefit.

## Consequences

- A `GEOAPIFY_API_KEY` env var on the web app; absent → autocomplete silently disabled, plain field remains.
- The geocoder is reached only through the `/api/geocode` server proxy — the key never reaches the browser, no CSP change is needed, and the provider is swappable behind the proxy.
- Stage 1 is **web-only** — no Core API, OpenAPI, SDK, or DB-migration change.
- Stage 2 will add coordinate storage (and its own short ADR note for the embedded map).

## References

- docs/ARCHITECTURE.md §6 (abstractable providers), §9 (privacy)
- Create-page review, 2026-05-21
