type TeamRegistrationEmailInput = {
  captainFirstName: string;
  teamName: string;
  manageLink: string;
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
      "La richiesta e' in attesa di verifica da parte dell'organizzazione.",
      "Puoi usare questo link privato per controllare lo stato, scaricare i moduli e completare la documentazione:",
      manageLink,
      "Attenzione: chiunque abbia questo link puo' accedere alla gestione della squadra. Non condividerlo pubblicamente.",
      "Per dubbi puoi rispondere direttamente a questa email.",
    ].join("\n\n"),
    html: renderEmailHtml([
      `Ciao ${safeCaptainFirstName},`,
      `abbiamo ricevuto l'iscrizione della squadra <strong>${safeTeamName}</strong>.`,
      "La richiesta e' in attesa di verifica da parte dell'organizzazione.",
      [
        "Puoi usare questo link privato per controllare lo stato, scaricare i moduli e completare la documentazione:",
        `<br /><a href="${safeManageLink}">${safeManageLink}</a>`,
      ].join(""),
      "Attenzione: chiunque abbia questo link puo' accedere alla gestione della squadra. Non condividerlo pubblicamente.",
      "Per dubbi puoi rispondere direttamente a questa email.",
    ]),
  };
}

export function buildRegistrationApprovedEmail({
  captainFirstName,
  teamName,
  manageLink,
}: TeamRegistrationEmailInput): TeamRegistrationEmailContent {
  const safeCaptainFirstName = escapeHtml(captainFirstName);
  const safeTeamName = escapeHtml(teamName);
  const safeManageLink = escapeHtml(manageLink);

  return {
    subject: "Squadra approvata — Coppa Reghinna Minor 2026",
    text: [
      `Ciao ${captainFirstName},`,
      `la squadra ${teamName} e' stata approvata per la Coppa Reghinna Minor 2026.`,
      "Per motivi di sicurezza abbiamo generato un nuovo link privato di gestione.",
      "Usa questo link per consultare lo stato della squadra, scaricare i moduli e completare la documentazione:",
      manageLink,
      "Il link precedente, se presente, non e' piu' valido.",
      "Non condividere questo link pubblicamente.",
      "Per dubbi puoi rispondere direttamente a questa email.",
    ].join("\n\n"),
    html: renderEmailHtml([
      `Ciao ${safeCaptainFirstName},`,
      `la squadra <strong>${safeTeamName}</strong> e' stata approvata per la Coppa Reghinna Minor 2026.`,
      "Per motivi di sicurezza abbiamo generato un nuovo link privato di gestione.",
      [
        "Usa questo link per consultare lo stato della squadra, scaricare i moduli e completare la documentazione:",
        `<br /><a href="${safeManageLink}">${safeManageLink}</a>`,
      ].join(""),
      "Il link precedente, se presente, non e' piu' valido.",
      "Non condividere questo link pubblicamente.",
      "Per dubbi puoi rispondere direttamente a questa email.",
    ]),
  };
}
