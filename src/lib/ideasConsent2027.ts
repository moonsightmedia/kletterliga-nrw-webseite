// Version 2 adds the operator-approved minimum age. Version 1 was never live.
export const ideasConsentNotice = {
  age: "Mit dem Start bestätigst du, dass du mindestens 16 Jahre alt bist.",
  purpose: "Ich bin einverstanden, dass die Kletterliga GbR meine Auswahlantworten und freiwilligen Ideentexte für die Planung der Saison 2027 speichert und auswertet.",
  partial: "Die Speicherung beginnt mit der ersten Antwort. Auch wenn ich vorzeitig aufhöre, werden meine bisherigen Antworten ausgewertet.",
  withdrawal: "Die Teilnahme ist freiwillig und hat keinen Einfluss auf meine Liga-Teilnahme. Ich kann meine Einwilligung jederzeit für die Zukunft widerrufen und meine Antworten entfernen lassen.",
};
export const IDEAS_WITHDRAWAL_PATH = "/ideen-2027/widerruf";
export function parseIdeasWithdrawalCode(code: string) {
  const match = /^([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})\.([a-f0-9]{64})$/i.exec(code.trim());
  return match ? { id: match[1].toLowerCase(), token: match[2].toLowerCase() } : null;
}
