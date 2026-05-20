import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

// The design-system showcase is a local-development tool only — it must not
// be reachable on staging or production.
export function load() {
  if (!dev) error(404, 'Not found');
}
