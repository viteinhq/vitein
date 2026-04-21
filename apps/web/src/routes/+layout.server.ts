import { resolveLocale } from '$lib/i18n';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies, request }) => {
  const locale = resolveLocale(cookies.get('locale'), request.headers.get('accept-language'));
  return { locale };
};
