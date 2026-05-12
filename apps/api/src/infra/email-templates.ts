import { DEFAULT_LOCALE, type Locale } from '@vitein/i18n-messages';
import type {
  AnnouncementInput,
  CreatorMagicLinkInput,
  ReminderInput,
  RsvpConfirmationInput,
  RsvpNotificationInput,
  SignInMagicLinkInput,
} from './email-types.js';

/**
 * Per-locale email subject + body templates.
 *
 * Templates are kept here in one file rather than split per locale because
 * the volume per locale is small (~30 lines) and visual diff between
 * locales matters more than per-locale isolation. Adding a new locale =
 * add a key to `bundles` plus the matching @vitein/i18n-messages locale.
 *
 * Translations for non-en/non-de locales are AI-generated; native-review
 * workflow + priority order live in `docs/ops/i18n-review.md`.
 */

interface EmailTemplate<Input> {
  subject: (input: Input) => string;
  body: (input: Input) => string;
}

export interface TemplateBundle {
  creatorMagicLink: EmailTemplate<CreatorMagicLinkInput>;
  signInMagicLink: EmailTemplate<SignInMagicLinkInput>;
  rsvpConfirmation: EmailTemplate<RsvpConfirmationInput>;
  rsvpNotification: EmailTemplate<RsvpNotificationInput>;
  reminder: EmailTemplate<ReminderInput>;
  announcement: EmailTemplate<AnnouncementInput>;
}

const en: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `Manage your event: ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `Your event "${eventTitle}" is live on vite.in.`,
        '',
        'Use the link below to manage it — view RSVPs, edit details, send reminders:',
        manageUrl,
        '',
        'Keep this link private. Anyone with the link can manage the event.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'Your vite.in sign-in link',
    body: ({ url }) =>
      [
        'Click the link below to sign in to vite.in:',
        url,
        '',
        'This link expires in 10 minutes. If you did not request it, you can ignore this email.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `RSVP recorded: ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const verb =
        status === 'yes' ? 'going to' : status === 'maybe' ? 'tentatively attending' : 'declining';
      return [
        `Thanks — we recorded your RSVP for "${eventTitle}".`,
        `You are ${verb} this event.`,
        '',
        'Event details:',
        eventUrl,
        '',
        'You can update your RSVP any time by re-submitting the form.',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `New RSVP for ${eventTitle}`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `New RSVP on "${eventTitle}": ${guestName} — ${status}${extras}.`,
        '',
        'Manage your event and see all RSVPs:',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `Reminder: ${eventTitle}`,
    body: ({ eventTitle, startsAt, eventUrl }) =>
      [
        `Reminder: "${eventTitle}" is coming up at ${startsAt.toISOString()}.`,
        '',
        'Event details:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date' ? `Save the date — ${eventTitle}` : `You're invited: ${eventTitle}`,
    body: ({ eventTitle, startsAt, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `Save the date: "${eventTitle}" — ${startsAt.toISOString()}.`,
          '',
          'The full invitation with location and details will follow. For now, please hold the date in your calendar.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `You're invited to "${eventTitle}" on ${startsAt.toISOString()}.`,
        '',
        'Details and RSVP:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const de: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `Event verwalten: ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `Dein Event „${eventTitle}" ist auf vite.in online.`,
        '',
        'Über diesen Link kannst du es verwalten — RSVPs sehen, Details ändern, Erinnerungen senden:',
        manageUrl,
        '',
        'Behalte diesen Link für dich. Wer ihn hat, kann das Event verwalten.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'Dein vite.in Anmelde-Link',
    body: ({ url }) =>
      [
        'Klick auf den Link, um dich bei vite.in anzumelden:',
        url,
        '',
        'Der Link läuft in 10 Minuten ab. Wenn du ihn nicht angefordert hast, kannst du diese E-Mail ignorieren.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `Zusage registriert: ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const verb =
        status === 'yes' ? 'zusagst' : status === 'maybe' ? 'vielleicht kommst' : 'absagst';
      return [
        `Danke — wir haben deine Antwort für „${eventTitle}" gespeichert.`,
        `Du ${verb} bei diesem Event.`,
        '',
        'Event-Details:',
        eventUrl,
        '',
        'Du kannst deine Antwort jederzeit aktualisieren, indem du das Formular erneut absendest.',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `Neue Antwort für ${eventTitle}`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `Neue Antwort für „${eventTitle}": ${guestName} — ${status}${extras}.`,
        '',
        'Event verwalten und alle Antworten sehen:',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `Erinnerung: ${eventTitle}`,
    body: ({ eventTitle, startsAt, eventUrl }) =>
      [
        `Erinnerung: „${eventTitle}" findet am ${startsAt.toISOString()} statt.`,
        '',
        'Event-Details:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date' ? `Save the Date — ${eventTitle}` : `Einladung: ${eventTitle}`,
    body: ({ eventTitle, startsAt, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `Save the Date: „${eventTitle}" — ${startsAt.toISOString()}.`,
          '',
          'Die vollständige Einladung mit Ort und Details folgt. Bitte halte dir den Termin bereits jetzt frei.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `Du bist eingeladen zu „${eventTitle}" am ${startsAt.toISOString()}.`,
        '',
        'Details und Zu-/Absage:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const fr: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `Gérez votre événement : ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `Votre événement « ${eventTitle} » est en ligne sur vite.in.`,
        '',
        'Utilisez le lien ci-dessous pour le gérer — voir les RSVP, modifier les détails, envoyer des rappels :',
        manageUrl,
        '',
        "Gardez ce lien privé. Toute personne qui le possède peut gérer l'événement.",
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'Votre lien de connexion vite.in',
    body: ({ url }) =>
      [
        'Cliquez sur le lien ci-dessous pour vous connecter à vite.in :',
        url,
        '',
        "Ce lien expire dans 10 minutes. Si vous ne l'avez pas demandé, vous pouvez ignorer cet e-mail.",
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `RSVP enregistré : ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const verb =
        status === 'yes'
          ? 'participez à'
          : status === 'maybe'
            ? 'participez peut-être à'
            : 'déclinez';
      return [
        `Merci — nous avons enregistré votre réponse pour « ${eventTitle} ».`,
        `Vous ${verb} cet événement.`,
        '',
        "Détails de l'événement :",
        eventUrl,
        '',
        'Vous pouvez modifier votre réponse à tout moment en soumettant à nouveau le formulaire.',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `Nouvelle réponse pour ${eventTitle}`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `Nouvelle réponse pour « ${eventTitle} » : ${guestName} — ${status}${extras}.`,
        '',
        'Gérez votre événement et voyez toutes les réponses :',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `Rappel : ${eventTitle}`,
    body: ({ eventTitle, startsAt, eventUrl }) =>
      [
        `Rappel : « ${eventTitle} » a lieu le ${startsAt.toISOString()}.`,
        '',
        "Détails de l'événement :",
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date'
        ? `Réservez la date — ${eventTitle}`
        : `Vous êtes invité(e) : ${eventTitle}`,
    body: ({ eventTitle, startsAt, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `Réservez la date : « ${eventTitle} » — ${startsAt.toISOString()}.`,
          '',
          "L'invitation complète avec le lieu et les détails suivra. Pour l'instant, veuillez bloquer cette date dans votre agenda.",
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `Vous êtes invité(e) à « ${eventTitle} » le ${startsAt.toISOString()}.`,
        '',
        'Détails et RSVP :',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const es: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `Gestiona tu evento: ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `Tu evento «${eventTitle}» está en línea en vite.in.`,
        '',
        'Usa este enlace para gestionarlo — ver respuestas, editar detalles, enviar recordatorios:',
        manageUrl,
        '',
        'Mantén este enlace privado. Cualquier persona con el enlace puede gestionar el evento.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'Tu enlace de inicio de sesión en vite.in',
    body: ({ url }) =>
      [
        'Haz clic en el enlace para iniciar sesión en vite.in:',
        url,
        '',
        'El enlace caduca en 10 minutos. Si no lo solicitaste, puedes ignorar este correo.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `Respuesta registrada: ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const verb =
        status === 'yes'
          ? 'asistirás a'
          : status === 'maybe'
            ? 'tal vez asistirás a'
            : 'no asistirás a';
      return [
        `Gracias — registramos tu respuesta para «${eventTitle}».`,
        `${verb} este evento.`,
        '',
        'Detalles del evento:',
        eventUrl,
        '',
        'Puedes actualizar tu respuesta en cualquier momento volviendo a enviar el formulario.',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `Nueva respuesta para ${eventTitle}`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `Nueva respuesta para «${eventTitle}»: ${guestName} — ${status}${extras}.`,
        '',
        'Gestiona tu evento y ve todas las respuestas:',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `Recordatorio: ${eventTitle}`,
    body: ({ eventTitle, startsAt, eventUrl }) =>
      [
        `Recordatorio: «${eventTitle}» tendrá lugar el ${startsAt.toISOString()}.`,
        '',
        'Detalles del evento:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date'
        ? `Reserva la fecha — ${eventTitle}`
        : `Estás invitado/a: ${eventTitle}`,
    body: ({ eventTitle, startsAt, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `Reserva la fecha: «${eventTitle}» — ${startsAt.toISOString()}.`,
          '',
          'La invitación completa con el lugar y los detalles llegará después. Por ahora, por favor reserva la fecha en tu calendario.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `Estás invitado/a a «${eventTitle}» el ${startsAt.toISOString()}.`,
        '',
        'Detalles y respuesta:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const it: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `Gestisci il tuo evento: ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `Il tuo evento «${eventTitle}» è online su vite.in.`,
        '',
        'Usa il link per gestirlo — vedere le risposte, modificare i dettagli, inviare promemoria:',
        manageUrl,
        '',
        "Mantieni questo link privato. Chiunque lo possieda può gestire l'evento.",
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'Il tuo link di accesso a vite.in',
    body: ({ url }) =>
      [
        'Clicca sul link per accedere a vite.in:',
        url,
        '',
        "Il link scade tra 10 minuti. Se non l'hai richiesto, puoi ignorare questa email.",
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `Risposta registrata: ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const verb =
        status === 'yes'
          ? 'parteciperai a'
          : status === 'maybe'
            ? 'forse parteciperai a'
            : 'non parteciperai a';
      return [
        `Grazie — abbiamo registrato la tua risposta per «${eventTitle}».`,
        `${verb} questo evento.`,
        '',
        "Dettagli dell'evento:",
        eventUrl,
        '',
        'Puoi aggiornare la tua risposta in qualsiasi momento reinviando il modulo.',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `Nuova risposta per ${eventTitle}`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `Nuova risposta per «${eventTitle}»: ${guestName} — ${status}${extras}.`,
        '',
        'Gestisci il tuo evento e vedi tutte le risposte:',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `Promemoria: ${eventTitle}`,
    body: ({ eventTitle, startsAt, eventUrl }) =>
      [
        `Promemoria: «${eventTitle}» si terrà il ${startsAt.toISOString()}.`,
        '',
        "Dettagli dell'evento:",
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date' ? `Save the date — ${eventTitle}` : `Sei invitato/a: ${eventTitle}`,
    body: ({ eventTitle, startsAt, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `Save the date: «${eventTitle}» — ${startsAt.toISOString()}.`,
          '',
          "L'invito completo con luogo e dettagli arriverà più avanti. Per ora, tieni la data libera in calendario.",
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `Sei invitato/a a «${eventTitle}» il ${startsAt.toISOString()}.`,
        '',
        'Dettagli e risposta:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const pt: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `Gerencie seu evento: ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `Seu evento «${eventTitle}» está no ar em vite.in.`,
        '',
        'Use o link para gerenciá-lo — ver respostas, editar detalhes, enviar lembretes:',
        manageUrl,
        '',
        'Mantenha este link privado. Qualquer pessoa com o link pode gerenciar o evento.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'Seu link de entrada no vite.in',
    body: ({ url }) =>
      [
        'Clique no link para entrar no vite.in:',
        url,
        '',
        'O link expira em 10 minutos. Se você não solicitou, pode ignorar este e-mail.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `Resposta registrada: ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const verb = status === 'yes' ? 'vai a' : status === 'maybe' ? 'talvez vá a' : 'não vai a';
      return [
        `Obrigado — registramos sua resposta para «${eventTitle}».`,
        `Você ${verb} este evento.`,
        '',
        'Detalhes do evento:',
        eventUrl,
        '',
        'Você pode atualizar sua resposta a qualquer momento reenviando o formulário.',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `Nova resposta para ${eventTitle}`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `Nova resposta para «${eventTitle}»: ${guestName} — ${status}${extras}.`,
        '',
        'Gerencie seu evento e veja todas as respostas:',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `Lembrete: ${eventTitle}`,
    body: ({ eventTitle, startsAt, eventUrl }) =>
      [
        `Lembrete: «${eventTitle}» acontece em ${startsAt.toISOString()}.`,
        '',
        'Detalhes do evento:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date'
        ? `Save the date — ${eventTitle}`
        : `Você está convidado(a): ${eventTitle}`,
    body: ({ eventTitle, startsAt, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `Save the date: «${eventTitle}» — ${startsAt.toISOString()}.`,
          '',
          'O convite completo com local e detalhes virá em seguida. Por enquanto, reserve a data na agenda.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `Você está convidado(a) para «${eventTitle}» em ${startsAt.toISOString()}.`,
        '',
        'Detalhes e confirmação:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const nl: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `Beheer je evenement: ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `Je evenement "${eventTitle}" staat online op vite.in.`,
        '',
        'Gebruik deze link om het te beheren — reacties bekijken, details bewerken, herinneringen versturen:',
        manageUrl,
        '',
        'Houd deze link privé. Iedereen met de link kan het evenement beheren.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'Je vite.in inloglink',
    body: ({ url }) =>
      [
        'Klik op de link om in te loggen bij vite.in:',
        url,
        '',
        'De link verloopt over 10 minuten. Heb je deze niet aangevraagd? Dan kun je deze e-mail negeren.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `Reactie geregistreerd: ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const verb =
        status === 'yes'
          ? 'komt naar'
          : status === 'maybe'
            ? 'komt misschien naar'
            : 'komt niet naar';
      return [
        `Bedankt — we hebben je reactie voor "${eventTitle}" geregistreerd.`,
        `Je ${verb} dit evenement.`,
        '',
        'Evenementdetails:',
        eventUrl,
        '',
        'Je kunt je reactie altijd bijwerken door het formulier opnieuw in te dienen.',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `Nieuwe reactie voor ${eventTitle}`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `Nieuwe reactie voor "${eventTitle}": ${guestName} — ${status}${extras}.`,
        '',
        'Beheer je evenement en zie alle reacties:',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `Herinnering: ${eventTitle}`,
    body: ({ eventTitle, startsAt, eventUrl }) =>
      [
        `Herinnering: "${eventTitle}" vindt plaats op ${startsAt.toISOString()}.`,
        '',
        'Evenementdetails:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date'
        ? `Save the date — ${eventTitle}`
        : `Je bent uitgenodigd: ${eventTitle}`,
    body: ({ eventTitle, startsAt, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `Save the date: "${eventTitle}" — ${startsAt.toISOString()}.`,
          '',
          'De volledige uitnodiging met locatie en details volgt nog. Houd de datum voor nu vrij in je agenda.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `Je bent uitgenodigd voor "${eventTitle}" op ${startsAt.toISOString()}.`,
        '',
        'Details en reactie:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const pl: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `Zarządzaj swoim wydarzeniem: ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `Twoje wydarzenie „${eventTitle}" jest dostępne na vite.in.`,
        '',
        'Skorzystaj z linku, aby nim zarządzać — zobaczyć odpowiedzi, edytować szczegóły, wysyłać przypomnienia:',
        manageUrl,
        '',
        'Zachowaj ten link prywatny. Każda osoba z linkiem może zarządzać wydarzeniem.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'Twój link logowania vite.in',
    body: ({ url }) =>
      [
        'Kliknij link, aby zalogować się do vite.in:',
        url,
        '',
        'Link wygasa za 10 minut. Jeśli go nie żądałeś, możesz zignorować tę wiadomość.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `Odpowiedź zapisana: ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const verb =
        status === 'yes'
          ? 'przyjdziesz na'
          : status === 'maybe'
            ? 'może przyjdziesz na'
            : 'nie przyjdziesz na';
      return [
        `Dziękujemy — zapisaliśmy Twoją odpowiedź dla „${eventTitle}".`,
        `${verb} to wydarzenie.`,
        '',
        'Szczegóły wydarzenia:',
        eventUrl,
        '',
        'Możesz zaktualizować odpowiedź w dowolnym momencie, wysyłając formularz ponownie.',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `Nowa odpowiedź dla ${eventTitle}`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `Nowa odpowiedź dla „${eventTitle}": ${guestName} — ${status}${extras}.`,
        '',
        'Zarządzaj swoim wydarzeniem i zobacz wszystkie odpowiedzi:',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `Przypomnienie: ${eventTitle}`,
    body: ({ eventTitle, startsAt, eventUrl }) =>
      [
        `Przypomnienie: „${eventTitle}" odbywa się ${startsAt.toISOString()}.`,
        '',
        'Szczegóły wydarzenia:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date'
        ? `Save the date — ${eventTitle}`
        : `Jesteś zaproszony(a): ${eventTitle}`,
    body: ({ eventTitle, startsAt, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `Save the date: „${eventTitle}" — ${startsAt.toISOString()}.`,
          '',
          'Pełne zaproszenie z miejscem i szczegółami pojawi się później. Na razie prosimy o zarezerwowanie daty w kalendarzu.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `Jesteś zaproszony(a) na „${eventTitle}" ${startsAt.toISOString()}.`,
        '',
        'Szczegóły i odpowiedź:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const bundles: Record<Locale, TemplateBundle> = { en, de, fr, es, it, pt, nl, pl };

/**
 * Look up a template bundle for a given locale, with English fallback.
 * Returned bundle is always non-null so callers don't need to null-check.
 */
export function templatesFor(locale: Locale | undefined): TemplateBundle {
  if (locale && bundles[locale]) return bundles[locale];
  return bundles[DEFAULT_LOCALE];
}
