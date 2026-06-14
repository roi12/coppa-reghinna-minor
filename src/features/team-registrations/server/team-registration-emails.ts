type TeamRegistrationEmailInput = {
  captainFirstName: string;
  teamName: string;
  manageLink: string;
};

type TeamRegistrationApprovedEmailInput = {
  captainFirstName: string;
  teamName: string;
};

type TeamRegistrationEmailContent = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderEmailHtml(paragraphs: string[]) {
  return [
    '<div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">',
    ...paragraphs.map((paragraph) => `<p style="margin: 0 0 16px;">${paragraph}</p>`),
    "</div>",
  ].join("");
}

export function buildRegistrationReceivedEmail({
  captainFirstName,
  teamName,
  manageLink,
}: TeamRegistrationEmailInput): TeamRegistrationEmailContent {
  const safeCaptainFirstName = escapeHtml(captainFirstName);
  const safeTeamName = escapeHtml(teamName);
  const safeManageLink = escapeHtml(manageLink);

  return {
    subject: "Iscrizione ricevuta — Coppa Reghinna Minor 2026",
    text: [
      `Ciao ${captainFirstName},`,
      `abbiamo ricevuto l'iscrizione della squadra ${teamName}.`,
      "La squadra sara' approvata solo dopo il controllo degli organizzatori.",
      "Usa questo link privato della squadra per raccogliere e caricare i documenti della squadra:",
      manageLink,
      "Condividilo solo con i giocatori della tua squadra.",
      "Chiunque abbia questo link puo' accedere alla gestione della squadra.",
      "Per dubbi puoi rispondere direttamente a questa email.",
    ].join("\n\n"),
    html: renderEmailHtml([
      `Ciao ${safeCaptainFirstName},`,
      `abbiamo ricevuto l'iscrizione della squadra <strong>${safeTeamName}</strong>.`,
      "La squadra sara' approvata solo dopo il controllo degli organizzatori.",
      [
        "Usa questo link privato della squadra per raccogliere e caricare i documenti della squadra:",
        `<br /><a href="${safeManageLink}">${safeManageLink}</a>`,
      ].join(""),
      "Condividilo solo con i giocatori della tua squadra.",
      "Chiunque abbia questo link puo' accedere alla gestione della squadra.",
      "Per dubbi puoi rispondere direttamente a questa email.",
    ]),
  };
}

export function buildRegistrationApprovedEmail({
  captainFirstName,
  teamName,
}: TeamRegistrationApprovedEmailInput): TeamRegistrationEmailContent {
  const safeCaptainFirstName = escapeHtml(captainFirstName);
  const safeTeamName = escapeHtml(teamName);

  return {
    subject: "Squadra approvata — Coppa Reghinna Minor 2026",
    text: [
      `Ciao ${captainFirstName},`,
      `la squadra ${teamName} e' stata approvata per la Coppa Reghinna Minor 2026.`,
      "Puoi continuare a usare lo stesso link privato ricevuto dopo l'iscrizione per completare o aggiornare i documenti.",
      "Se hai perso il link, contatta gli organizzatori per riceverne uno nuovo.",
      "Condividi il link privato della squadra solo con i giocatori della tua squadra.",
      "Per dubbi puoi rispondere direttamente a questa email.",
    ].join("\n\n"),
    html: renderEmailHtml([
      `Ciao ${safeCaptainFirstName},`,
      `la squadra <strong>${safeTeamName}</strong> e' stata approvata per la Coppa Reghinna Minor 2026.`,
      "Puoi continuare a usare lo stesso link privato ricevuto dopo l'iscrizione per completare o aggiornare i documenti.",
      "Se hai perso il link, contatta gli organizzatori per riceverne uno nuovo.",
      "Condividi il link privato della squadra solo con i giocatori della tua squadra.",
      "Per dubbi puoi rispondere direttamente a questa email.",
    ]),
  };
}
