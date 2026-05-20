# 0007 — Media upload hardening

- **Status:** Accepted
- **Date:** 2026-05-20
- **Deciders:** Kim

## Context

ARCHITECTURE §9.1 lists "re-encode on server (Cloudflare Images)" as the mitigation for image-upload abuse. The shipped implementation does not do this — `domain/media/media.ts` writes the raw uploaded bytes to R2 after a magic-number MIME sniff. The `event_media.width/height` columns were also never populated.

Server-side re-encoding (decode → re-encode to a canonical image) is the strong mitigation: it strips EXIF metadata, neutralises polyglot files, and normalises malformed inputs. But it requires **Cloudflare Images**, a paid add-on that is not enabled on the account — enabling it is a billing/ops decision for Kim, not a code change.

## Decision

**Phase 1 accepts raw image uploads — no server-side re-encode — with hardened validation.** Mitigations in place:

- Magic-number MIME sniff against a five-format allowlist (`mime.ts`); the client `Content-Type` is never trusted.
- 10 MiB byte-size cap.
- **New:** header-only dimension extraction (`dimensions.ts`) populates `width/height` and enforces a 100 MP pixel-count ceiling as defence-in-depth against decompression-bomb inputs.
- 10-media-per-event quota.
- Media is served from a **separate origin** (`media.vite.in`) with the sniffed `Content-Type`, so a polyglot file cannot execute script in the `vite.in` app origin.

Server-side re-encode is **deferred** — tracked as a follow-up, gated on enabling Cloudflare Images.

## Alternatives considered

- **Enable Cloudflare Images now and re-encode.** The architecturally-correct end state, but a paid product and an account decision. Not blocking Phase 1.
- **In-Worker re-encode via a WASM image library.** Avoids the paid product but adds significant bundle weight (Workers' 10 MB limit) and CPU cost. Rejected.
- **Accept raw uploads with hardened validation (chosen).** Ships now; the residual risk is bounded and documented.

## Consequences

- **Residual risk:** EXIF/GPS metadata embedded in user photos is stored and served as-is — a privacy exposure that only re-encoding removes. Polyglot files remain possible but are neutralised for XSS by cross-origin serving + correct `Content-Type`.
- vite.in never decodes uploaded images server-side, so decompression bombs are not a server-side threat; the 100 MP cap is UX hygiene + defence-in-depth.
- AVIF dimensions are not parsed (the value lives in a nested ISO-BMFF `ispe` box); AVIF uploads store `null` width/height until a parser or re-encode lands.
- **Follow-up:** enable Cloudflare Images and add a re-encode step in `uploadMedia` — this also resolves the EXIF residual and would supersede the relevant part of this ADR.

## References

- ARCHITECTURE.md §9.1 (security — image upload abuse)
- `apps/api/src/domain/media/` — `media.ts`, `mime.ts`, `dimensions.ts`
