import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface SendInviteEmailParams {
  to: string;
  memberName: string;
  claimUrl: string;
}

export async function sendInviteEmail({
  to,
  memberName,
  claimUrl,
}: SendInviteEmailParams) {
  const clubName = process.env.NEXT_PUBLIC_CLUB_NAME || "Galatasaray Ulm/Neu-Ulm";

  return resend.emails.send({
    from: process.env.EMAIL_FROM || "noreply@galatasaray-ulm.de",
    to,
    subject: `Dein digitaler Mitgliedsausweis – ${clubName}`,
    text: [
      `Hallo ${memberName},`,
      "",
      "dein digitaler Mitgliedsausweis ist bereit!",
      "Öffne den folgenden Link, um deinen Ausweis zu Apple Wallet oder Google Wallet hinzuzufügen:",
      "",
      claimUrl,
      "",
      "Dieser Link ist 7 Tage gültig. Falls er abläuft, kann dein Verein dir einen neuen senden.",
      "",
      `– ${clubName}`,
    ].join("\n"),
    html: `
      <!DOCTYPE html>
      <html lang="de">
      <head><meta charset="UTF-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #E30A17; margin: 0;">${escapeHtml(clubName)}</h1>
          </div>
          <p>Hallo <strong>${escapeHtml(memberName)}</strong>,</p>
          <p>dein digitaler Mitgliedsausweis ist bereit! Klicke auf den Button unten, um deinen Ausweis zu Apple Wallet oder Google Wallet hinzuzufügen.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${claimUrl}" style="background: #E30A17; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              Ausweis abholen
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Dieser Link ist 7 Tage gültig. Falls er abläuft, kann dein Verein dir einen neuen senden.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">${escapeHtml(clubName)}</p>
        </div>
      </body>
      </html>
    `,
  });
}
