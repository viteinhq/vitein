import * as m from '$lib/paraglide/messages.js';

/**
 * Server-returned error codes (stable, language-agnostic) mapped to
 * localized messages via Paraglide. Server actions return `{ error: code }`;
 * the Svelte component renders with `{localizeError(form.error, { status })}`.
 *
 * Keeping this in one file means adding a new error code = one JSON entry
 * + one line here. No message text ever lives in route code.
 */
export function localizeError(code: unknown, params?: { status?: unknown }): string {
  const statusStr =
    typeof params?.status === 'number' || typeof params?.status === 'string'
      ? String(params.status)
      : '';
  switch (code) {
    case 'create_missing_fields':
      return m.err_create_missing_fields();
    case 'create_failed':
      return m.err_create_failed();
    case 'signin_email_required':
      return m.err_signin_email_required();
    case 'signin_magic_link_http':
      return m.err_signin_magic_link_http({ status: statusStr });
    case 'rsvp_name_required':
      return m.err_rsvp_name_required();
    case 'rsvp_event_not_found':
      return m.err_rsvp_event_not_found();
    case 'rsvp_failed':
      return m.err_rsvp_failed();
    case 'claim_http':
      return m.err_claim_http({ status: statusStr });
    case 'manage_missing_token':
      return m.err_manage_missing_token();
    case 'manage_event_not_found':
      return m.err_manage_event_not_found();
    case 'manage_no_changes':
      return m.err_manage_no_changes();
    case 'manage_save_failed':
      return m.err_manage_save_failed();
    case 'manage_reminder_failed':
      return m.err_manage_reminder_failed();
    case 'manage_pick_image':
      return m.err_manage_pick_image();
    case 'manage_image_too_large':
      return m.err_manage_image_too_large();
    case 'manage_missing_media_id':
      return m.err_manage_missing_media_id();
    case 'manage_delete_failed':
      return m.err_manage_delete_failed();
    case 'manage_upload_http':
      return m.err_manage_upload_http({ status: statusStr });
    case 'upgrade_http':
      return m.err_upgrade_http({ status: statusStr });
    case 'http_event_not_found':
      return m.err_http_event_not_found();
    case 'http_creator_token_required':
      return m.err_http_creator_token_required();
    case 'http_creator_token_invalid':
      return m.err_http_creator_token_invalid();
    case 'http_missing_token_or_callback':
      return m.err_http_missing_token_or_callback();
    case 'pwd_required':
      return m.err_pwd_required();
    case 'pwd_invalid':
      return m.err_pwd_invalid();
    case 'pwd_event_not_found':
      return m.err_pwd_event_not_found();
    case 'pwd_failed':
      return m.err_pwd_failed();
    case 'manage_password_too_short':
      return m.err_manage_password_too_short();
    case 'manage_password_plus_required':
      return m.err_manage_password_plus_required();
    case 'manage_password_failed':
      return m.err_manage_password_failed();
    case 'announcement_plus_required':
      return m.err_announcement_plus_required();
    case 'announcement_already_sent':
      return m.err_announcement_already_sent();
    case 'announcement_no_guests':
      return m.err_announcement_no_guests();
    case 'announcement_too_many':
      return m.err_announcement_too_many({ max: String(params?.status ?? '100') });
    case 'announcement_http':
      return m.err_announcement_http({ status: statusStr });
    default:
      return m.err_unknown();
  }
}
