export function isReminderEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.REMINDER_FROM_EMAIL);
}

export async function sendTodoReminder({
  email,
  name,
  title,
}: {
  email: string;
  name: string | null;
  title: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.REMINDER_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Reminder email is not configured.");
  }

  const safeTitle = escapeHtml(title);
  const safeName = escapeHtml(name || "there");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `Pending todo: ${title}`,
      html: `<p>Hi ${safeName},</p><p>This is a reminder that your todo is still pending:</p><p><strong>${safeTitle}</strong></p><p>Open Daymark to complete it or update the reminder.</p>`,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Email provider rejected reminder: ${response.status} ${detail}`);
  }
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}
