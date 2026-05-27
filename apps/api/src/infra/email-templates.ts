import { DEFAULT_LOCALE, type Locale } from '@vitein/i18n-messages';
import type {
  AnnouncementInput,
  CreatorMagicLinkInput,
  CreatorRecoveryInput,
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
  creatorRecovery: EmailTemplate<CreatorRecoveryInput>;
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
  creatorRecovery: {
    subject: () => 'Your vite.in event management links',
    body: ({ events }) =>
      [
        'Here are management links for your events on vite.in:',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        'Keep these links private. Anyone with a link can manage that event.',
        'If you did not request this email, you can ignore it.',
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
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `Reminder: "${eventTitle}" is coming up at ${startsAtFormatted}.`,
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
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `Save the date: "${eventTitle}" — ${startsAtFormatted}.`,
          '',
          'The full invitation with location and details will follow. For now, please hold the date in your calendar.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `You're invited to "${eventTitle}" on ${startsAtFormatted}.`,
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
  creatorRecovery: {
    subject: () => 'Deine vite.in Event-Verwaltungslinks',
    body: ({ events }) =>
      [
        'Hier sind die Verwaltungslinks für deine Events auf vite.in:',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        'Behalte diese Links für dich. Wer einen Link hat, kann das jeweilige Event verwalten.',
        'Wenn du diese E-Mail nicht angefordert hast, kannst du sie ignorieren.',
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
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `Erinnerung: „${eventTitle}" findet am ${startsAtFormatted} statt.`,
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
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `Save the Date: „${eventTitle}" — ${startsAtFormatted}.`,
          '',
          'Die vollständige Einladung mit Ort und Details folgt. Bitte halte dir den Termin bereits jetzt frei.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `Du bist eingeladen zu „${eventTitle}" am ${startsAtFormatted}.`,
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
  creatorRecovery: {
    subject: () => "Vos liens de gestion d'événements vite.in",
    body: ({ events }) =>
      [
        'Voici les liens de gestion de vos événements sur vite.in :',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        "Gardez ces liens privés. Toute personne qui possède un lien peut gérer l'événement correspondant.",
        "Si vous n'avez pas demandé cet e-mail, vous pouvez l'ignorer.",
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
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `Rappel : « ${eventTitle} » a lieu le ${startsAtFormatted}.`,
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
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `Réservez la date : « ${eventTitle} » — ${startsAtFormatted}.`,
          '',
          "L'invitation complète avec le lieu et les détails suivra. Pour l'instant, veuillez bloquer cette date dans votre agenda.",
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `Vous êtes invité(e) à « ${eventTitle} » le ${startsAtFormatted}.`,
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
  creatorRecovery: {
    subject: () => 'Tus enlaces de gestión de eventos de vite.in',
    body: ({ events }) =>
      [
        'Aquí tienes los enlaces de gestión de tus eventos en vite.in:',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        'Mantén estos enlaces privados. Cualquier persona con un enlace puede gestionar ese evento.',
        'Si no solicitaste este correo, puedes ignorarlo.',
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
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `Recordatorio: «${eventTitle}» tendrá lugar el ${startsAtFormatted}.`,
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
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `Reserva la fecha: «${eventTitle}» — ${startsAtFormatted}.`,
          '',
          'La invitación completa con el lugar y los detalles llegará después. Por ahora, por favor reserva la fecha en tu calendario.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `Estás invitado/a a «${eventTitle}» el ${startsAtFormatted}.`,
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
  creatorRecovery: {
    subject: () => 'I tuoi link di gestione eventi vite.in',
    body: ({ events }) =>
      [
        'Ecco i link di gestione dei tuoi eventi su vite.in:',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        "Mantieni questi link privati. Chiunque possieda un link può gestire quell'evento.",
        'Se non hai richiesto questa email, puoi ignorarla.',
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
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `Promemoria: «${eventTitle}» si terrà il ${startsAtFormatted}.`,
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
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `Save the date: «${eventTitle}» — ${startsAtFormatted}.`,
          '',
          "L'invito completo con luogo e dettagli arriverà più avanti. Per ora, tieni la data libera in calendario.",
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `Sei invitato/a a «${eventTitle}» il ${startsAtFormatted}.`,
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
  creatorRecovery: {
    subject: () => 'Seus links de gerenciamento de eventos vite.in',
    body: ({ events }) =>
      [
        'Aqui estão os links de gerenciamento dos seus eventos em vite.in:',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        'Mantenha estes links privados. Qualquer pessoa com um link pode gerenciar esse evento.',
        'Se você não solicitou este e-mail, pode ignorá-lo.',
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
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `Lembrete: «${eventTitle}» acontece em ${startsAtFormatted}.`,
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
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `Save the date: «${eventTitle}» — ${startsAtFormatted}.`,
          '',
          'O convite completo com local e detalhes virá em seguida. Por enquanto, reserve a data na agenda.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `Você está convidado(a) para «${eventTitle}» em ${startsAtFormatted}.`,
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
  creatorRecovery: {
    subject: () => 'Je vite.in-links voor evenementbeheer',
    body: ({ events }) =>
      [
        'Hier zijn de beheerlinks voor je evenementen op vite.in:',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        'Houd deze links privé. Iedereen met een link kan dat evenement beheren.',
        'Als je deze e-mail niet hebt aangevraagd, kun je hem negeren.',
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
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `Herinnering: "${eventTitle}" vindt plaats op ${startsAtFormatted}.`,
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
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `Save the date: "${eventTitle}" — ${startsAtFormatted}.`,
          '',
          'De volledige uitnodiging met locatie en details volgt nog. Houd de datum voor nu vrij in je agenda.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `Je bent uitgenodigd voor "${eventTitle}" op ${startsAtFormatted}.`,
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
  creatorRecovery: {
    subject: () => 'Twoje linki do zarządzania wydarzeniami vite.in',
    body: ({ events }) =>
      [
        'Oto linki do zarządzania Twoimi wydarzeniami na vite.in:',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        'Zachowaj te linki prywatne. Każda osoba z linkiem może zarządzać danym wydarzeniem.',
        'Jeśli nie prosiłeś o tę wiadomość, możesz ją zignorować.',
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
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `Przypomnienie: „${eventTitle}" odbywa się ${startsAtFormatted}.`,
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
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `Save the date: „${eventTitle}" — ${startsAtFormatted}.`,
          '',
          'Pełne zaproszenie z miejscem i szczegółami pojawi się później. Na razie prosimy o zarezerwowanie daty w kalendarzu.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `Jesteś zaproszony(a) na „${eventTitle}" ${startsAtFormatted}.`,
        '',
        'Szczegóły i odpowiedź:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const hi: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `अपना इवेंट प्रबंधित करें: ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `आपका इवेंट "${eventTitle}" vite.in पर लाइव है।`,
        '',
        'इसे प्रबंधित करने के लिए नीचे दिए गए लिंक का उपयोग करें — RSVP देखें, विवरण संपादित करें, अनुस्मारक भेजें:',
        manageUrl,
        '',
        'यह लिंक निजी रखें। जिसके पास यह लिंक है, वह इवेंट प्रबंधित कर सकता है।',
        '',
        '— vite.in',
      ].join('\n'),
  },
  creatorRecovery: {
    subject: () => 'आपके vite.in इवेंट प्रबंधन लिंक',
    body: ({ events }) =>
      [
        'vite.in पर आपके इवेंट्स के लिए प्रबंधन लिंक यहाँ हैं:',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        'ये लिंक निजी रखें। जिसके पास लिंक है, वह उस इवेंट को प्रबंधित कर सकता है।',
        'यदि आपने यह ईमेल अनुरोधित नहीं किया है, तो आप इसे अनदेखा कर सकते हैं।',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'आपका vite.in साइन-इन लिंक',
    body: ({ url }) =>
      [
        'vite.in में साइन इन करने के लिए नीचे दिए गए लिंक पर क्लिक करें:',
        url,
        '',
        'यह लिंक 10 मिनट में समाप्त हो जाएगा। यदि आपने इसका अनुरोध नहीं किया, तो आप इस ईमेल को अनदेखा कर सकते हैं।',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `RSVP दर्ज किया गया: ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const line =
        status === 'yes'
          ? 'आप इस इवेंट में शामिल हो रहे हैं।'
          : status === 'maybe'
            ? 'आप शायद इस इवेंट में शामिल होंगे।'
            : 'आप इस इवेंट में शामिल नहीं हो रहे हैं।';
      return [
        `धन्यवाद — हमने "${eventTitle}" के लिए आपका RSVP दर्ज कर लिया है।`,
        line,
        '',
        'इवेंट विवरण:',
        eventUrl,
        '',
        'आप फ़ॉर्म दोबारा सबमिट करके अपना RSVP कभी भी अपडेट कर सकते हैं।',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `${eventTitle} के लिए नया RSVP`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `"${eventTitle}" पर नया RSVP: ${guestName} — ${status}${extras}.`,
        '',
        'अपना इवेंट प्रबंधित करें और सभी RSVP देखें:',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `अनुस्मारक: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `अनुस्मारक: "${eventTitle}" ${startsAtFormatted} को होने वाला है।`,
        '',
        'इवेंट विवरण:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date'
        ? `तारीख़ सुरक्षित रखें — ${eventTitle}`
        : `आप आमंत्रित हैं: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `तारीख़ सुरक्षित रखें: "${eventTitle}" — ${startsAtFormatted}.`,
          '',
          'स्थान और विवरण के साथ पूरा आमंत्रण बाद में आएगा। फ़िलहाल, कृपया अपने कैलेंडर में यह तारीख़ सुरक्षित रखें।',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `आप "${eventTitle}" में ${startsAtFormatted} को आमंत्रित हैं।`,
        '',
        'विवरण और RSVP:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const bn: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `আপনার ইভেন্ট পরিচালনা করুন: ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `আপনার ইভেন্ট "${eventTitle}" vite.in-এ লাইভ রয়েছে।`,
        '',
        'এটি পরিচালনা করতে নিচের লিঙ্কটি ব্যবহার করুন — RSVP দেখুন, বিবরণ সম্পাদনা করুন, অনুস্মারক পাঠান:',
        manageUrl,
        '',
        'এই লিঙ্কটি গোপন রাখুন। যার কাছে লিঙ্ক আছে সে ইভেন্ট পরিচালনা করতে পারে।',
        '',
        '— vite.in',
      ].join('\n'),
  },
  creatorRecovery: {
    subject: () => 'আপনার vite.in ইভেন্ট পরিচালনার লিঙ্ক',
    body: ({ events }) =>
      [
        'vite.in-এ আপনার ইভেন্টগুলির পরিচালনা লিঙ্ক এখানে রয়েছে:',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        'এই লিঙ্কগুলি গোপন রাখুন। যার কাছে লিঙ্ক আছে সে সেই ইভেন্ট পরিচালনা করতে পারে।',
        'আপনি যদি এই ইমেলের অনুরোধ না করে থাকেন, তবে এটি উপেক্ষা করতে পারেন।',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'আপনার vite.in সাইন-ইন লিঙ্ক',
    body: ({ url }) =>
      [
        'vite.in-এ সাইন ইন করতে নিচের লিঙ্কে ক্লিক করুন:',
        url,
        '',
        'এই লিঙ্কটি ১০ মিনিটে মেয়াদোত্তীর্ণ হবে। আপনি যদি এটির অনুরোধ না করে থাকেন, তবে এই ইমেলটি উপেক্ষা করতে পারেন।',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `RSVP রেকর্ড করা হয়েছে: ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const line =
        status === 'yes'
          ? 'আপনি এই ইভেন্টে যোগ দিচ্ছেন।'
          : status === 'maybe'
            ? 'আপনি সম্ভবত এই ইভেন্টে যোগ দেবেন।'
            : 'আপনি এই ইভেন্টে যোগ দিচ্ছেন না।';
      return [
        `ধন্যবাদ — আমরা "${eventTitle}"-এর জন্য আপনার RSVP রেকর্ড করেছি।`,
        line,
        '',
        'ইভেন্ট বিবরণ:',
        eventUrl,
        '',
        'আপনি ফর্মটি আবার জমা দিয়ে যেকোনো সময় আপনার RSVP আপডেট করতে পারেন।',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `${eventTitle}-এর জন্য নতুন RSVP`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `"${eventTitle}"-এ নতুন RSVP: ${guestName} — ${status}${extras}.`,
        '',
        'আপনার ইভেন্ট পরিচালনা করুন এবং সমস্ত RSVP দেখুন:',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `অনুস্মারক: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `অনুস্মারক: "${eventTitle}" ${startsAtFormatted}-এ অনুষ্ঠিত হবে।`,
        '',
        'ইভেন্ট বিবরণ:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date'
        ? `তারিখ সংরক্ষণ করুন — ${eventTitle}`
        : `আপনি আমন্ত্রিত: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `তারিখ সংরক্ষণ করুন: "${eventTitle}" — ${startsAtFormatted}.`,
          '',
          'স্থান ও বিবরণসহ সম্পূর্ণ আমন্ত্রণ পরে আসবে। আপাতত, অনুগ্রহ করে আপনার ক্যালেন্ডারে তারিখটি সংরক্ষণ করুন।',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `আপনি "${eventTitle}"-এ ${startsAtFormatted}-এ আমন্ত্রিত।`,
        '',
        'বিবরণ ও RSVP:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const ta: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `உங்கள் நிகழ்வை நிர்வகிக்கவும்: ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `உங்கள் நிகழ்வு "${eventTitle}" vite.in-இல் செயலில் உள்ளது.`,
        '',
        'அதை நிர்வகிக்க கீழே உள்ள இணைப்பைப் பயன்படுத்தவும் — RSVP-களைப் பார்க்க, விவரங்களைத் திருத்த, நினைவூட்டல்களை அனுப்ப:',
        manageUrl,
        '',
        'இந்த இணைப்பை தனிப்பட்டதாக வைத்திருங்கள். இணைப்பு உள்ள எவரும் நிகழ்வை நிர்வகிக்க முடியும்.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  creatorRecovery: {
    subject: () => 'உங்கள் vite.in நிகழ்வு நிர்வாக இணைப்புகள்',
    body: ({ events }) =>
      [
        'vite.in-இல் உங்கள் நிகழ்வுகளுக்கான நிர்வாக இணைப்புகள் இங்கே:',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        'இந்த இணைப்புகளை தனிப்பட்டதாக வைத்திருங்கள். இணைப்பு உள்ள எவரும் அந்த நிகழ்வை நிர்வகிக்க முடியும்.',
        'இந்த மின்னஞ்சலை நீங்கள் கோரவில்லை என்றால், அதைப் புறக்கணிக்கலாம்.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'உங்கள் vite.in உள்நுழைவு இணைப்பு',
    body: ({ url }) =>
      [
        'vite.in-இல் உள்நுழைய கீழே உள்ள இணைப்பைக் கிளிக் செய்யவும்:',
        url,
        '',
        'இந்த இணைப்பு 10 நிமிடங்களில் காலாவதியாகும். நீங்கள் இதைக் கோரவில்லை எனில், இந்த மின்னஞ்சலைப் புறக்கணிக்கலாம்.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `RSVP பதிவு செய்யப்பட்டது: ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const line =
        status === 'yes'
          ? 'நீங்கள் இந்த நிகழ்வில் கலந்துகொள்கிறீர்கள்.'
          : status === 'maybe'
            ? 'நீங்கள் இந்த நிகழ்வில் கலந்துகொள்ளக்கூடும்.'
            : 'நீங்கள் இந்த நிகழ்வில் கலந்துகொள்ளவில்லை.';
      return [
        `நன்றி — "${eventTitle}"-க்கான உங்கள் RSVP-ஐ பதிவு செய்தோம்.`,
        line,
        '',
        'நிகழ்வு விவரங்கள்:',
        eventUrl,
        '',
        'படிவத்தை மீண்டும் சமர்ப்பித்து உங்கள் RSVP-ஐ எப்போது வேண்டுமானாலும் புதுப்பிக்கலாம்.',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `${eventTitle}-க்கான புதிய RSVP`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `"${eventTitle}"-இல் புதிய RSVP: ${guestName} — ${status}${extras}.`,
        '',
        'உங்கள் நிகழ்வை நிர்வகித்து அனைத்து RSVP-களையும் பாருங்கள்:',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `நினைவூட்டல்: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `நினைவூட்டல்: "${eventTitle}" ${startsAtFormatted} அன்று நடைபெறுகிறது.`,
        '',
        'நிகழ்வு விவரங்கள்:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date'
        ? `தேதியை குறித்துக்கொள்ளுங்கள் — ${eventTitle}`
        : `நீங்கள் அழைக்கப்பட்டுள்ளீர்கள்: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `தேதியை குறித்துக்கொள்ளுங்கள்: "${eventTitle}" — ${startsAtFormatted}.`,
          '',
          'இடம் மற்றும் விவரங்களுடன் முழு அழைப்பிதழ் பின்னர் வரும். தற்போதைக்கு, உங்கள் நாட்காட்டியில் இந்தத் தேதியை ஒதுக்கி வைக்கவும்.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `"${eventTitle}"-க்கு ${startsAtFormatted} அன்று நீங்கள் அழைக்கப்பட்டுள்ளீர்கள்.`,
        '',
        'விவரங்கள் மற்றும் RSVP:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const te: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `మీ ఈవెంట్‌ను నిర్వహించండి: ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `మీ ఈవెంట్ "${eventTitle}" vite.in‌లో లైవ్‌లో ఉంది.`,
        '',
        'దీన్ని నిర్వహించడానికి కింది లింక్‌ను ఉపయోగించండి — RSVP‌లను చూడండి, వివరాలను సవరించండి, రిమైండర్‌లను పంపండి:',
        manageUrl,
        '',
        'ఈ లింక్‌ను గోప్యంగా ఉంచండి. లింక్ ఉన్న ఎవరైనా ఈవెంట్‌ను నిర్వహించగలరు.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  creatorRecovery: {
    subject: () => 'మీ vite.in ఈవెంట్ నిర్వహణ లింక్‌లు',
    body: ({ events }) =>
      [
        'vite.inలో మీ ఈవెంట్‌ల నిర్వహణ లింక్‌లు ఇక్కడ ఉన్నాయి:',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        'ఈ లింక్‌లను గోప్యంగా ఉంచండి. లింక్ ఉన్న ఎవరైనా ఆ ఈవెంట్‌ను నిర్వహించగలరు.',
        'మీరు ఈ ఇమెయిల్‌ను అభ్యర్థించకపోతే, దాన్ని విస్మరించవచ్చు.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'మీ vite.in సైన్-ఇన్ లింక్',
    body: ({ url }) =>
      [
        'vite.in‌లో సైన్ ఇన్ చేయడానికి కింది లింక్‌పై క్లిక్ చేయండి:',
        url,
        '',
        'ఈ లింక్ 10 నిమిషాల్లో గడువు ముగుస్తుంది. మీరు దీన్ని అభ్యర్థించకపోతే, ఈ ఇమెయిల్‌ను విస్మరించవచ్చు.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `RSVP నమోదు చేయబడింది: ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const line =
        status === 'yes'
          ? 'మీరు ఈ ఈవెంట్‌కు హాజరవుతున్నారు.'
          : status === 'maybe'
            ? 'మీరు బహుశా ఈ ఈవెంట్‌కు హాజరవుతారు.'
            : 'మీరు ఈ ఈవెంట్‌కు హాజరు కావడం లేదు.';
      return [
        `ధన్యవాదాలు — "${eventTitle}" కోసం మీ RSVP‌ను మేము నమోదు చేశాము.`,
        line,
        '',
        'ఈవెంట్ వివరాలు:',
        eventUrl,
        '',
        'ఫారమ్‌ను మళ్లీ సమర్పించడం ద్వారా మీ RSVP‌ను ఎప్పుడైనా అప్‌డేట్ చేయవచ్చు.',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `${eventTitle} కోసం కొత్త RSVP`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `"${eventTitle}"‌లో కొత్త RSVP: ${guestName} — ${status}${extras}.`,
        '',
        'మీ ఈవెంట్‌ను నిర్వహించి అన్ని RSVP‌లను చూడండి:',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `రిమైండర్: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `రిమైండర్: "${eventTitle}" ${startsAtFormatted}‌న జరగనుంది.`,
        '',
        'ఈవెంట్ వివరాలు:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date'
        ? `తేదీని గుర్తుంచుకోండి — ${eventTitle}`
        : `మీరు ఆహ్వానించబడ్డారు: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `తేదీని గుర్తుంచుకోండి: "${eventTitle}" — ${startsAtFormatted}.`,
          '',
          'స్థలం మరియు వివరాలతో పూర్తి ఆహ్వానం తర్వాత వస్తుంది. ప్రస్తుతానికి, దయచేసి మీ క్యాలెండర్‌లో ఈ తేదీని కేటాయించి ఉంచండి.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `"${eventTitle}"‌కు ${startsAtFormatted}‌న మీరు ఆహ్వానించబడ్డారు.`,
        '',
        'వివరాలు మరియు RSVP:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const mr: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `तुमचा इव्हेंट व्यवस्थापित करा: ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `तुमचा इव्हेंट "${eventTitle}" vite.in वर लाइव्ह आहे.`,
        '',
        'तो व्यवस्थापित करण्यासाठी खालील लिंक वापरा — RSVP पाहा, तपशील संपादित करा, स्मरणपत्रे पाठवा:',
        manageUrl,
        '',
        'ही लिंक खाजगी ठेवा. ज्याच्याकडे लिंक आहे तो इव्हेंट व्यवस्थापित करू शकतो.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  creatorRecovery: {
    subject: () => 'तुमचे vite.in इव्हेंट व्यवस्थापन लिंक',
    body: ({ events }) =>
      [
        'vite.in वर तुमच्या इव्हेंट्ससाठी व्यवस्थापन लिंक येथे आहेत:',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        'या लिंक खाजगी ठेवा. ज्याच्याकडे लिंक आहे तो तो इव्हेंट व्यवस्थापित करू शकतो.',
        'तुम्ही हा ईमेल विनंती केला नसेल, तर तुम्ही त्याकडे दुर्लक्ष करू शकता.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'तुमची vite.in साइन-इन लिंक',
    body: ({ url }) =>
      [
        'vite.in वर साइन इन करण्यासाठी खालील लिंकवर क्लिक करा:',
        url,
        '',
        'ही लिंक 10 मिनिटांत कालबाह्य होईल. तुम्ही याची विनंती केली नसल्यास, हा ईमेल दुर्लक्षित करू शकता.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `RSVP नोंदवले गेले: ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const line =
        status === 'yes'
          ? 'तुम्ही या इव्हेंटला उपस्थित राहत आहात.'
          : status === 'maybe'
            ? 'तुम्ही कदाचित या इव्हेंटला उपस्थित राहाल.'
            : 'तुम्ही या इव्हेंटला उपस्थित राहत नाही.';
      return [
        `धन्यवाद — आम्ही "${eventTitle}" साठी तुमचे RSVP नोंदवले आहे.`,
        line,
        '',
        'इव्हेंट तपशील:',
        eventUrl,
        '',
        'फॉर्म पुन्हा सबमिट करून तुम्ही तुमचे RSVP कधीही अपडेट करू शकता.',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `${eventTitle} साठी नवीन RSVP`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `"${eventTitle}" वर नवीन RSVP: ${guestName} — ${status}${extras}.`,
        '',
        'तुमचा इव्हेंट व्यवस्थापित करा आणि सर्व RSVP पाहा:',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `स्मरणपत्र: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `स्मरणपत्र: "${eventTitle}" ${startsAtFormatted} रोजी होणार आहे.`,
        '',
        'इव्हेंट तपशील:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date'
        ? `तारीख राखून ठेवा — ${eventTitle}`
        : `तुम्हाला आमंत्रित केले आहे: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `तारीख राखून ठेवा: "${eventTitle}" — ${startsAtFormatted}.`,
          '',
          'स्थान आणि तपशिलांसह संपूर्ण आमंत्रण नंतर येईल. सध्या, कृपया तुमच्या कॅलेंडरमध्ये ही तारीख राखून ठेवा.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `"${eventTitle}" ला ${startsAtFormatted} रोजी तुम्हाला आमंत्रित केले आहे.`,
        '',
        'तपशील आणि RSVP:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const gu: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `તમારી ઇવેન્ટ મેનેજ કરો: ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `તમારી ઇવેન્ટ "${eventTitle}" vite.in પર લાઇવ છે.`,
        '',
        'તેને મેનેજ કરવા માટે નીચેની લિંકનો ઉપયોગ કરો — RSVP જુઓ, વિગતો સંપાદિત કરો, રિમાઇન્ડર મોકલો:',
        manageUrl,
        '',
        'આ લિંક ખાનગી રાખો. જેની પાસે લિંક છે તે ઇવેન્ટ મેનેજ કરી શકે છે.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  creatorRecovery: {
    subject: () => 'તમારી vite.in ઇવેન્ટ મેનેજમેન્ટ લિંક્સ',
    body: ({ events }) =>
      [
        'vite.in પર તમારી ઇવેન્ટ્સ માટેની મેનેજમેન્ટ લિંક્સ અહીં છે:',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        'આ લિંક્સ ખાનગી રાખો. જેની પાસે લિંક છે તે તે ઇવેન્ટ મેનેજ કરી શકે છે.',
        'જો તમે આ ઇમેઇલની વિનંતી ન કરી હોય, તો તમે તેને અવગણી શકો છો.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'તમારી vite.in સાઇન-ઇન લિંક',
    body: ({ url }) =>
      [
        'vite.in પર સાઇન ઇન કરવા માટે નીચેની લિંક પર ક્લિક કરો:',
        url,
        '',
        'આ લિંક 10 મિનિટમાં સમાપ્ત થશે. જો તમે તેની વિનંતી ન કરી હોય, તો તમે આ ઇમેઇલને અવગણી શકો છો.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `RSVP નોંધાયું: ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const line =
        status === 'yes'
          ? 'તમે આ ઇવેન્ટમાં હાજરી આપી રહ્યા છો.'
          : status === 'maybe'
            ? 'તમે કદાચ આ ઇવેન્ટમાં હાજરી આપશો.'
            : 'તમે આ ઇવેન્ટમાં હાજરી આપી રહ્યા નથી.';
      return [
        `આભાર — અમે "${eventTitle}" માટે તમારું RSVP નોંધ્યું છે.`,
        line,
        '',
        'ઇવેન્ટ વિગતો:',
        eventUrl,
        '',
        'ફોર્મ ફરીથી સબમિટ કરીને તમે તમારું RSVP ગમે ત્યારે અપડેટ કરી શકો છો.',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `${eventTitle} માટે નવું RSVP`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `"${eventTitle}" પર નવું RSVP: ${guestName} — ${status}${extras}.`,
        '',
        'તમારી ઇવેન્ટ મેનેજ કરો અને બધા RSVP જુઓ:',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `રિમાઇન્ડર: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `રિમાઇન્ડર: "${eventTitle}" ${startsAtFormatted} ના રોજ યોજાનાર છે.`,
        '',
        'ઇવેન્ટ વિગતો:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date'
        ? `તારીખ સાચવી રાખો — ${eventTitle}`
        : `તમને આમંત્રણ છે: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `તારીખ સાચવી રાખો: "${eventTitle}" — ${startsAtFormatted}.`,
          '',
          'સ્થળ અને વિગતો સાથેનું સંપૂર્ણ આમંત્રણ પછીથી આવશે. હાલ પૂરતું, કૃપા કરીને તમારા કેલેન્ડરમાં આ તારીખ સાચવી રાખો.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `"${eventTitle}" માં ${startsAtFormatted} ના રોજ તમને આમંત્રણ છે.`,
        '',
        'વિગતો અને RSVP:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const kn: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `ನಿಮ್ಮ ಈವೆಂಟ್ ಅನ್ನು ನಿರ್ವಹಿಸಿ: ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `ನಿಮ್ಮ ಈವೆಂಟ್ "${eventTitle}" vite.in‌ನಲ್ಲಿ ಲೈವ್ ಆಗಿದೆ.`,
        '',
        'ಅದನ್ನು ನಿರ್ವಹಿಸಲು ಕೆಳಗಿನ ಲಿಂಕ್ ಬಳಸಿ — RSVP‌ಗಳನ್ನು ನೋಡಿ, ವಿವರಗಳನ್ನು ಸಂಪಾದಿಸಿ, ಜ್ಞಾಪನೆಗಳನ್ನು ಕಳುಹಿಸಿ:',
        manageUrl,
        '',
        'ಈ ಲಿಂಕ್ ಅನ್ನು ಖಾಸಗಿಯಾಗಿ ಇರಿಸಿ. ಲಿಂಕ್ ಹೊಂದಿರುವ ಯಾರಾದರೂ ಈವೆಂಟ್ ಅನ್ನು ನಿರ್ವಹಿಸಬಹುದು.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  creatorRecovery: {
    subject: () => 'ನಿಮ್ಮ vite.in ಈವೆಂಟ್ ನಿರ್ವಹಣಾ ಲಿಂಕ್‌ಗಳು',
    body: ({ events }) =>
      [
        'vite.inನಲ್ಲಿ ನಿಮ್ಮ ಈವೆಂಟ್‌ಗಳ ನಿರ್ವಹಣಾ ಲಿಂಕ್‌ಗಳು ಇಲ್ಲಿವೆ:',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        'ಈ ಲಿಂಕ್‌ಗಳನ್ನು ಖಾಸಗಿಯಾಗಿ ಇರಿಸಿ. ಲಿಂಕ್ ಹೊಂದಿರುವ ಯಾರಾದರೂ ಆ ಈವೆಂಟ್ ಅನ್ನು ನಿರ್ವಹಿಸಬಹುದು.',
        'ನೀವು ಈ ಇಮೇಲ್ ಅನ್ನು ವಿನಂತಿಸದಿದ್ದರೆ, ಅದನ್ನು ನಿರ್ಲಕ್ಷಿಸಬಹುದು.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'ನಿಮ್ಮ vite.in ಸೈನ್-ಇನ್ ಲಿಂಕ್',
    body: ({ url }) =>
      [
        'vite.in‌ನಲ್ಲಿ ಸೈನ್ ಇನ್ ಮಾಡಲು ಕೆಳಗಿನ ಲಿಂಕ್ ಕ್ಲಿಕ್ ಮಾಡಿ:',
        url,
        '',
        'ಈ ಲಿಂಕ್ 10 ನಿಮಿಷಗಳಲ್ಲಿ ಅವಧಿ ಮುಗಿಯುತ್ತದೆ. ನೀವು ಇದನ್ನು ವಿನಂತಿಸದಿದ್ದರೆ, ಈ ಇಮೇಲ್ ಅನ್ನು ನಿರ್ಲಕ್ಷಿಸಬಹುದು.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `RSVP ದಾಖಲಿಸಲಾಗಿದೆ: ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const line =
        status === 'yes'
          ? 'ನೀವು ಈ ಈವೆಂಟ್‌ನಲ್ಲಿ ಭಾಗವಹಿಸುತ್ತಿದ್ದೀರಿ.'
          : status === 'maybe'
            ? 'ನೀವು ಬಹುಶಃ ಈ ಈವೆಂಟ್‌ನಲ್ಲಿ ಭಾಗವಹಿಸುವಿರಿ.'
            : 'ನೀವು ಈ ಈವೆಂಟ್‌ನಲ್ಲಿ ಭಾಗವಹಿಸುತ್ತಿಲ್ಲ.';
      return [
        `ಧನ್ಯವಾದಗಳು — "${eventTitle}" ಗಾಗಿ ನಿಮ್ಮ RSVP ಅನ್ನು ನಾವು ದಾಖಲಿಸಿದ್ದೇವೆ.`,
        line,
        '',
        'ಈವೆಂಟ್ ವಿವರಗಳು:',
        eventUrl,
        '',
        'ಫಾರ್ಮ್ ಅನ್ನು ಮತ್ತೆ ಸಲ್ಲಿಸುವ ಮೂಲಕ ನಿಮ್ಮ RSVP ಅನ್ನು ಯಾವಾಗ ಬೇಕಾದರೂ ನವೀಕರಿಸಬಹುದು.',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `${eventTitle} ಗಾಗಿ ಹೊಸ RSVP`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `"${eventTitle}"‌ನಲ್ಲಿ ಹೊಸ RSVP: ${guestName} — ${status}${extras}.`,
        '',
        'ನಿಮ್ಮ ಈವೆಂಟ್ ಅನ್ನು ನಿರ್ವಹಿಸಿ ಮತ್ತು ಎಲ್ಲಾ RSVP‌ಗಳನ್ನು ನೋಡಿ:',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `ಜ್ಞಾಪನೆ: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `ಜ್ಞಾಪನೆ: "${eventTitle}" ${startsAtFormatted}‌ರಂದು ನಡೆಯಲಿದೆ.`,
        '',
        'ಈವೆಂಟ್ ವಿವರಗಳು:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date'
        ? `ದಿನಾಂಕವನ್ನು ಕಾಯ್ದಿರಿಸಿ — ${eventTitle}`
        : `ನಿಮಗೆ ಆಹ್ವಾನವಿದೆ: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `ದಿನಾಂಕವನ್ನು ಕಾಯ್ದಿರಿಸಿ: "${eventTitle}" — ${startsAtFormatted}.`,
          '',
          'ಸ್ಥಳ ಮತ್ತು ವಿವರಗಳೊಂದಿಗೆ ಪೂರ್ಣ ಆಹ್ವಾನ ನಂತರ ಬರುತ್ತದೆ. ಸದ್ಯಕ್ಕೆ, ದಯವಿಟ್ಟು ನಿಮ್ಮ ಕ್ಯಾಲೆಂಡರ್‌ನಲ್ಲಿ ಈ ದಿನಾಂಕವನ್ನು ಕಾಯ್ದಿರಿಸಿ.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `"${eventTitle}"‌ಗೆ ${startsAtFormatted}‌ರಂದು ನಿಮಗೆ ಆಹ್ವಾನವಿದೆ.`,
        '',
        'ವಿವರಗಳು ಮತ್ತು RSVP:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const ml: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `നിങ്ങളുടെ ഇവന്റ് കൈകാര്യം ചെയ്യുക: ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `നിങ്ങളുടെ ഇവന്റ് "${eventTitle}" vite.in-ൽ ലൈവ് ആണ്.`,
        '',
        'അത് കൈകാര്യം ചെയ്യാൻ താഴെയുള്ള ലിങ്ക് ഉപയോഗിക്കുക — RSVP-കൾ കാണുക, വിശദാംശങ്ങൾ എഡിറ്റ് ചെയ്യുക, ഓർമ്മപ്പെടുത്തലുകൾ അയയ്ക്കുക:',
        manageUrl,
        '',
        'ഈ ലിങ്ക് സ്വകാര്യമായി സൂക്ഷിക്കുക. ലിങ്ക് ഉള്ള ആർക്കും ഇവന്റ് കൈകാര്യം ചെയ്യാം.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  creatorRecovery: {
    subject: () => 'നിങ്ങളുടെ vite.in ഇവന്റ് മാനേജ്മെന്റ് ലിങ്കുകൾ',
    body: ({ events }) =>
      [
        'vite.in-ൽ നിങ്ങളുടെ ഇവന്റുകളുടെ മാനേജ്മെന്റ് ലിങ്കുകൾ ഇതാ:',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        'ഈ ലിങ്കുകൾ സ്വകാര്യമായി സൂക്ഷിക്കുക. ലിങ്ക് ഉള്ള ആർക്കും ആ ഇവന്റ് കൈകാര്യം ചെയ്യാം.',
        'നിങ്ങൾ ഈ ഇമെയിൽ അഭ്യർത്ഥിച്ചിട്ടില്ലെങ്കിൽ, അത് അവഗണിക്കാം.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'നിങ്ങളുടെ vite.in സൈൻ-ഇൻ ലിങ്ക്',
    body: ({ url }) =>
      [
        'vite.in-ൽ സൈൻ ഇൻ ചെയ്യാൻ താഴെയുള്ള ലിങ്കിൽ ക്ലിക്ക് ചെയ്യുക:',
        url,
        '',
        'ഈ ലിങ്ക് 10 മിനിറ്റിനുള്ളിൽ കാലഹരണപ്പെടും. നിങ്ങൾ ഇത് അഭ്യർത്ഥിച്ചിട്ടില്ലെങ്കിൽ, ഈ ഇമെയിൽ അവഗണിക്കാം.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `RSVP രേഖപ്പെടുത്തി: ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const line =
        status === 'yes'
          ? 'നിങ്ങൾ ഈ ഇവന്റിൽ പങ്കെടുക്കുന്നു.'
          : status === 'maybe'
            ? 'നിങ്ങൾ ഒരുപക്ഷേ ഈ ഇവന്റിൽ പങ്കെടുക്കും.'
            : 'നിങ്ങൾ ഈ ഇവന്റിൽ പങ്കെടുക്കുന്നില്ല.';
      return [
        `നന്ദി — "${eventTitle}"-നുള്ള നിങ്ങളുടെ RSVP ഞങ്ങൾ രേഖപ്പെടുത്തി.`,
        line,
        '',
        'ഇവന്റ് വിശദാംശങ്ങൾ:',
        eventUrl,
        '',
        'ഫോം വീണ്ടും സമർപ്പിച്ച് നിങ്ങളുടെ RSVP എപ്പോൾ വേണമെങ്കിലും അപ്ഡേറ്റ് ചെയ്യാം.',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `${eventTitle}-നുള്ള പുതിയ RSVP`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `"${eventTitle}"-ൽ പുതിയ RSVP: ${guestName} — ${status}${extras}.`,
        '',
        'നിങ്ങളുടെ ഇവന്റ് കൈകാര്യം ചെയ്ത് എല്ലാ RSVP-കളും കാണുക:',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `ഓർമ്മപ്പെടുത്തൽ: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `ഓർമ്മപ്പെടുത്തൽ: "${eventTitle}" ${startsAtFormatted}-ന് നടക്കുന്നു.`,
        '',
        'ഇവന്റ് വിശദാംശങ്ങൾ:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date'
        ? `തീയതി കുറിച്ചുവയ്ക്കുക — ${eventTitle}`
        : `നിങ്ങൾ ക്ഷണിക്കപ്പെട്ടിരിക്കുന്നു: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `തീയതി കുറിച്ചുവയ്ക്കുക: "${eventTitle}" — ${startsAtFormatted}.`,
          '',
          'സ്ഥലവും വിശദാംശങ്ങളും ഉൾപ്പെടുന്ന പൂർണ്ണ ക്ഷണം പിന്നീട് വരും. തൽക്കാലം, ദയവായി നിങ്ങളുടെ കലണ്ടറിൽ ഈ തീയതി മാറ്റിവയ്ക്കുക.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `"${eventTitle}"-ലേക്ക് ${startsAtFormatted}-ന് നിങ്ങൾ ക്ഷണിക്കപ്പെട്ടിരിക്കുന്നു.`,
        '',
        'വിശദാംശങ്ങളും RSVP-യും:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const pa: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `ਆਪਣਾ ਇਵੈਂਟ ਪ੍ਰਬੰਧਿਤ ਕਰੋ: ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `ਤੁਹਾਡਾ ਇਵੈਂਟ "${eventTitle}" vite.in 'ਤੇ ਲਾਈਵ ਹੈ।`,
        '',
        'ਇਸਨੂੰ ਪ੍ਰਬੰਧਿਤ ਕਰਨ ਲਈ ਹੇਠਾਂ ਦਿੱਤੇ ਲਿੰਕ ਦੀ ਵਰਤੋਂ ਕਰੋ — RSVP ਵੇਖੋ, ਵੇਰਵੇ ਸੰਪਾਦਿਤ ਕਰੋ, ਯਾਦ-ਪੱਤਰ ਭੇਜੋ:',
        manageUrl,
        '',
        'ਇਹ ਲਿੰਕ ਨਿੱਜੀ ਰੱਖੋ। ਜਿਸ ਕੋਲ ਲਿੰਕ ਹੈ ਉਹ ਇਵੈਂਟ ਪ੍ਰਬੰਧਿਤ ਕਰ ਸਕਦਾ ਹੈ।',
        '',
        '— vite.in',
      ].join('\n'),
  },
  creatorRecovery: {
    subject: () => 'ਤੁਹਾਡੇ vite.in ਇਵੈਂਟ ਪ੍ਰਬੰਧਨ ਲਿੰਕ',
    body: ({ events }) =>
      [
        'vite.in ਉੱਤੇ ਤੁਹਾਡੇ ਇਵੈਂਟਾਂ ਲਈ ਪ੍ਰਬੰਧਨ ਲਿੰਕ ਇੱਥੇ ਹਨ:',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        'ਇਹ ਲਿੰਕ ਨਿੱਜੀ ਰੱਖੋ। ਜਿਸ ਕੋਲ ਲਿੰਕ ਹੈ ਉਹ ਉਸ ਇਵੈਂਟ ਨੂੰ ਪ੍ਰਬੰਧਿਤ ਕਰ ਸਕਦਾ ਹੈ।',
        'ਜੇ ਤੁਸੀਂ ਇਸ ਈਮੇਲ ਦੀ ਬੇਨਤੀ ਨਹੀਂ ਕੀਤੀ, ਤਾਂ ਤੁਸੀਂ ਇਸਨੂੰ ਅਣਡਿੱਠਾ ਕਰ ਸਕਦੇ ਹੋ।',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'ਤੁਹਾਡਾ vite.in ਸਾਈਨ-ਇਨ ਲਿੰਕ',
    body: ({ url }) =>
      [
        "vite.in 'ਤੇ ਸਾਈਨ ਇਨ ਕਰਨ ਲਈ ਹੇਠਾਂ ਦਿੱਤੇ ਲਿੰਕ 'ਤੇ ਕਲਿੱਕ ਕਰੋ:",
        url,
        '',
        'ਇਹ ਲਿੰਕ 10 ਮਿੰਟਾਂ ਵਿੱਚ ਮਿਆਦ ਪੁੱਗ ਜਾਵੇਗਾ। ਜੇ ਤੁਸੀਂ ਇਸਦੀ ਬੇਨਤੀ ਨਹੀਂ ਕੀਤੀ, ਤਾਂ ਤੁਸੀਂ ਇਸ ਈਮੇਲ ਨੂੰ ਅਣਡਿੱਠ ਕਰ ਸਕਦੇ ਹੋ।',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `RSVP ਦਰਜ ਕੀਤਾ ਗਿਆ: ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const line =
        status === 'yes'
          ? 'ਤੁਸੀਂ ਇਸ ਇਵੈਂਟ ਵਿੱਚ ਸ਼ਾਮਲ ਹੋ ਰਹੇ ਹੋ।'
          : status === 'maybe'
            ? 'ਤੁਸੀਂ ਸ਼ਾਇਦ ਇਸ ਇਵੈਂਟ ਵਿੱਚ ਸ਼ਾਮਲ ਹੋਵੋਗੇ।'
            : 'ਤੁਸੀਂ ਇਸ ਇਵੈਂਟ ਵਿੱਚ ਸ਼ਾਮਲ ਨਹੀਂ ਹੋ ਰਹੇ।';
      return [
        `ਧੰਨਵਾਦ — ਅਸੀਂ "${eventTitle}" ਲਈ ਤੁਹਾਡਾ RSVP ਦਰਜ ਕਰ ਲਿਆ ਹੈ।`,
        line,
        '',
        'ਇਵੈਂਟ ਵੇਰਵੇ:',
        eventUrl,
        '',
        'ਫਾਰਮ ਦੁਬਾਰਾ ਜਮ੍ਹਾਂ ਕਰਕੇ ਤੁਸੀਂ ਆਪਣਾ RSVP ਕਿਸੇ ਵੀ ਸਮੇਂ ਅੱਪਡੇਟ ਕਰ ਸਕਦੇ ਹੋ।',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `${eventTitle} ਲਈ ਨਵਾਂ RSVP`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `"${eventTitle}" 'ਤੇ ਨਵਾਂ RSVP: ${guestName} — ${status}${extras}.`,
        '',
        'ਆਪਣਾ ਇਵੈਂਟ ਪ੍ਰਬੰਧਿਤ ਕਰੋ ਅਤੇ ਸਾਰੇ RSVP ਵੇਖੋ:',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `ਯਾਦ-ਪੱਤਰ: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `ਯਾਦ-ਪੱਤਰ: "${eventTitle}" ${startsAtFormatted} ਨੂੰ ਹੋਣ ਵਾਲਾ ਹੈ।`,
        '',
        'ਇਵੈਂਟ ਵੇਰਵੇ:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date'
        ? `ਤਾਰੀਖ਼ ਰਾਖਵੀਂ ਰੱਖੋ — ${eventTitle}`
        : `ਤੁਹਾਨੂੰ ਸੱਦਾ ਹੈ: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `ਤਾਰੀਖ਼ ਰਾਖਵੀਂ ਰੱਖੋ: "${eventTitle}" — ${startsAtFormatted}.`,
          '',
          'ਸਥਾਨ ਅਤੇ ਵੇਰਵਿਆਂ ਸਮੇਤ ਪੂਰਾ ਸੱਦਾ ਬਾਅਦ ਵਿੱਚ ਆਵੇਗਾ। ਫ਼ਿਲਹਾਲ, ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਕੈਲੰਡਰ ਵਿੱਚ ਇਹ ਤਾਰੀਖ਼ ਰਾਖਵੀਂ ਰੱਖੋ।',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `"${eventTitle}" ਵਿੱਚ ${startsAtFormatted} ਨੂੰ ਤੁਹਾਨੂੰ ਸੱਦਾ ਹੈ।`,
        '',
        'ਵੇਰਵੇ ਅਤੇ RSVP:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const zh: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `管理您的活动：${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `您的活动「${eventTitle}」已在 vite.in 上线。`,
        '',
        '使用下面的链接进行管理 — 查看回复、编辑详情、发送提醒：',
        manageUrl,
        '',
        '请妥善保管此链接。任何拥有此链接的人都可以管理该活动。',
        '',
        '— vite.in',
      ].join('\n'),
  },
  creatorRecovery: {
    subject: () => '您的 vite.in 活动管理链接',
    body: ({ events }) =>
      [
        '以下是您在 vite.in 上活动的管理链接：',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        '请妥善保管这些链接。任何拥有链接的人都可以管理对应的活动。',
        '如果您没有请求此邮件，可以忽略它。',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => '您的 vite.in 登录链接',
    body: ({ url }) =>
      [
        '点击下面的链接登录 vite.in：',
        url,
        '',
        '此链接将在 10 分钟后失效。如果您没有请求它，可以忽略此邮件。',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `回复已记录：${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const line =
        status === 'yes'
          ? '您将出席此活动。'
          : status === 'maybe'
            ? '您可能出席此活动。'
            : '您不出席此活动。';
      return [
        `谢谢 — 我们已记录您对「${eventTitle}」的回复。`,
        line,
        '',
        '活动详情：',
        eventUrl,
        '',
        '您可以随时重新提交表单来更新您的回复。',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `${eventTitle} 的新回复`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `「${eventTitle}」有新回复：${guestName} — ${status}${extras}。`,
        '',
        '管理您的活动并查看所有回复：',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `提醒：${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `提醒：「${eventTitle}」将于 ${startsAtFormatted} 举行。`,
        '',
        '活动详情：',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date' ? `预留日期 — ${eventTitle}` : `诚邀您参加：${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `预留日期：「${eventTitle}」— ${startsAtFormatted}。`,
          '',
          '包含地点和详情的完整邀请函稍后发送。目前，请先在您的日历中预留此日期。',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `诚邀您于 ${startsAtFormatted} 参加「${eventTitle}」。`,
        '',
        '详情与回复：',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const ja: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `イベントを管理：${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `あなたのイベント「${eventTitle}」が vite.in で公開されました。`,
        '',
        '下のリンクから管理できます — 出欠回答の確認、詳細の編集、リマインダーの送信：',
        manageUrl,
        '',
        'このリンクは非公開にしてください。リンクを持つ人は誰でもイベントを管理できます。',
        '',
        '— vite.in',
      ].join('\n'),
  },
  creatorRecovery: {
    subject: () => 'vite.in イベント管理リンク',
    body: ({ events }) =>
      [
        'vite.in でのあなたのイベントの管理リンクは次のとおりです：',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        'これらのリンクは非公開にしてください。リンクを持つ人は誰でもそのイベントを管理できます。',
        'このメールに心当たりがない場合は、無視していただいて構いません。',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'vite.in サインインリンク',
    body: ({ url }) =>
      [
        '下のリンクをクリックして vite.in にサインインしてください：',
        url,
        '',
        'このリンクは10分で期限切れになります。心当たりがない場合は、このメールを無視してください。',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `出欠回答を記録しました：${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const line =
        status === 'yes'
          ? 'あなたはこのイベントに出席します。'
          : status === 'maybe'
            ? 'あなたはこのイベントに出席するかもしれません。'
            : 'あなたはこのイベントを欠席します。';
      return [
        `ありがとうございます — 「${eventTitle}」へのあなたの出欠回答を記録しました。`,
        line,
        '',
        'イベントの詳細：',
        eventUrl,
        '',
        'フォームを再送信することで、出欠回答はいつでも更新できます。',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `${eventTitle} の新しい出欠回答`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `「${eventTitle}」に新しい出欠回答：${guestName} — ${status}${extras}。`,
        '',
        'イベントを管理してすべての出欠回答を確認：',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `リマインダー：${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `リマインダー：「${eventTitle}」は ${startsAtFormatted} に開催されます。`,
        '',
        'イベントの詳細：',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date' ? `日程のお知らせ — ${eventTitle}` : `ご招待：${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `日程のお知らせ：「${eventTitle}」— ${startsAtFormatted}。`,
          '',
          '場所や詳細を記した正式な招待状は後ほどお送りします。まずはカレンダーにこの日程をご予定ください。',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `${startsAtFormatted} 開催の「${eventTitle}」にご招待します。`,
        '',
        '詳細と出欠回答：',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const ko: TemplateBundle = {
  creatorMagicLink: {
    subject: ({ eventTitle }) => `이벤트 관리: ${eventTitle}`,
    body: ({ eventTitle, manageUrl }) =>
      [
        `귀하의 이벤트 "${eventTitle}"이(가) vite.in에 공개되었습니다.`,
        '',
        '아래 링크로 관리하세요 — 회신 보기, 세부 정보 편집, 알림 전송:',
        manageUrl,
        '',
        '이 링크는 비공개로 유지하세요. 링크를 가진 사람은 누구나 이벤트를 관리할 수 있습니다.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  creatorRecovery: {
    subject: () => 'vite.in 이벤트 관리 링크',
    body: ({ events }) =>
      [
        'vite.in의 이벤트 관리 링크는 다음과 같습니다:',
        '',
        ...events.flatMap((e) => [e.title, e.manageUrl, '']),
        '이 링크는 비공개로 유지하세요. 링크를 가진 사람은 누구나 해당 이벤트를 관리할 수 있습니다.',
        '이 이메일을 요청하지 않으셨다면 무시하셔도 됩니다.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  signInMagicLink: {
    subject: () => 'vite.in 로그인 링크',
    body: ({ url }) =>
      [
        '아래 링크를 클릭하여 vite.in에 로그인하세요:',
        url,
        '',
        '이 링크는 10분 후 만료됩니다. 요청하지 않으셨다면 이 이메일을 무시하셔도 됩니다.',
        '',
        '— vite.in',
      ].join('\n'),
  },
  rsvpConfirmation: {
    subject: ({ eventTitle }) => `회신이 기록되었습니다: ${eventTitle}`,
    body: ({ eventTitle, status, eventUrl }) => {
      const line =
        status === 'yes'
          ? '귀하는 이 이벤트에 참석합니다.'
          : status === 'maybe'
            ? '귀하는 이 이벤트에 참석할 수도 있습니다.'
            : '귀하는 이 이벤트에 참석하지 않습니다.';
      return [
        `감사합니다 — "${eventTitle}"에 대한 귀하의 회신을 기록했습니다.`,
        line,
        '',
        '이벤트 세부 정보:',
        eventUrl,
        '',
        '양식을 다시 제출하여 언제든지 회신을 업데이트할 수 있습니다.',
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  rsvpNotification: {
    subject: ({ eventTitle }) => `${eventTitle}의 새 회신`,
    body: ({ eventTitle, guestName, status, plusOnes, manageUrl }) => {
      const extras = plusOnes > 0 ? ` (+${String(plusOnes)})` : '';
      return [
        `"${eventTitle}"에 새 회신: ${guestName} — ${status}${extras}.`,
        '',
        '이벤트를 관리하고 모든 회신을 확인하세요:',
        manageUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
  reminder: {
    subject: ({ eventTitle }) => `알림: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl }) =>
      [
        `알림: "${eventTitle}"이(가) ${startsAtFormatted}에 열립니다.`,
        '',
        '이벤트 세부 정보:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n'),
  },
  announcement: {
    subject: ({ eventTitle, stage }) =>
      stage === 'save_the_date'
        ? `날짜를 비워 두세요 — ${eventTitle}`
        : `초대합니다: ${eventTitle}`,
    body: ({ eventTitle, startsAtFormatted, eventUrl, stage }) => {
      if (stage === 'save_the_date') {
        return [
          `날짜를 비워 두세요: "${eventTitle}" — ${startsAtFormatted}.`,
          '',
          '장소와 세부 정보가 담긴 정식 초대장은 추후 보내드립니다. 우선 캘린더에 이 날짜를 비워 두세요.',
          '',
          eventUrl,
          '',
          '— vite.in',
        ].join('\n');
      }
      return [
        `${startsAtFormatted}에 열리는 "${eventTitle}"에 귀하를 초대합니다.`,
        '',
        '세부 정보 및 회신:',
        eventUrl,
        '',
        '— vite.in',
      ].join('\n');
    },
  },
};

const bundles: Record<Locale, TemplateBundle> = {
  en,
  de,
  fr,
  es,
  it,
  pt,
  nl,
  pl,
  hi,
  bn,
  ta,
  te,
  mr,
  gu,
  kn,
  ml,
  pa,
  zh,
  ja,
  ko,
};

/**
 * Look up a template bundle for a given locale, with English fallback.
 * Returned bundle is always non-null so callers don't need to null-check.
 */
export function templatesFor(locale: Locale | undefined): TemplateBundle {
  if (locale && bundles[locale]) return bundles[locale];
  return bundles[DEFAULT_LOCALE];
}
