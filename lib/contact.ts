export const APPLICATION_NAME = "Slabberjaws";
export const CONTACT_RECIPIENT = "contact@mirpworks.com";

export const CONTACT_SUBJECT = `${APPLICATION_NAME} — Feedback`;
export const CONTACT_BODY = `Sent from: ${APPLICATION_NAME}\n\n[Your message here]`;

export function getContactEmailHref(): string {
  const query = new URLSearchParams({
    subject: CONTACT_SUBJECT,
    body: CONTACT_BODY,
  });
  return `mailto:${CONTACT_RECIPIENT}?${query.toString()}`;
}
