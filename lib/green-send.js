/** Shared Green API sendMessage helper (server-only). */

export async function sendWhatsApp(apiUrl, id, token, message, chatId) {
  const response = await fetch(
    `${apiUrl}/waInstance${id}/sendMessage/${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
    }
  );
  const data = await response.json();
  return { ok: response.ok && !!data.idMessage, data };
}
