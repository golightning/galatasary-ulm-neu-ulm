import * as jose from "jose";
import QRCode from "qrcode";

if (!process.env.QR_SIGNING_SECRET) {
  throw new Error("QR_SIGNING_SECRET environment variable is required");
}

const QR_SECRET = new TextEncoder().encode(process.env.QR_SIGNING_SECRET);

/**
 * Erstellt einen signierten QR-Token für ein Mitglied.
 * Enthält nur passId — keine Klartextdaten.
 */
export async function createSignedQRToken(passId: string): Promise<string> {
  return new jose.SignJWT({ passId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("2y")
    .sign(QR_SECRET);
}

/**
 * Verifiziert einen QR-Token und gibt die passId zurück.
 */
export async function verifyQRToken(
  token: string
): Promise<{ passId: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, QR_SECRET);
    if (typeof payload.passId !== "string") return null;
    return { passId: payload.passId };
  } catch {
    return null;
  }
}

/**
 * Generiert ein QR-Code PNG als Buffer.
 */
export async function generateQRCodeBuffer(data: string): Promise<Buffer> {
  return QRCode.toBuffer(data, {
    errorCorrectionLevel: "M",
    width: 300,
    margin: 2,
  });
}

/**
 * Generiert einen QR-Code als Data-URL.
 */
export async function generateQRCodeDataURL(data: string): Promise<string> {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: "M",
    width: 300,
    margin: 2,
  });
}
