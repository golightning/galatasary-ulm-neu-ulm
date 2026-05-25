/**
 * Apple Wallet .pkpass Erzeugung
 *
 * Voraussetzungen:
 * - Apple Developer Account mit Pass Type ID
 * - Zertifikate: pass.pem, pass-key.pem, wwdr.pem im /certs Verzeichnis
 * - passkit-generator Paket
 *
 * Setup-Schritte:
 * 1. Apple Developer Portal → Certificates, Identifiers & Profiles
 * 2. Identifier erstellen: Pass Type IDs → z.B. pass.de.galatasaray-ulm.member
 * 3. Zertifikat erstellen und als .p12 herunterladen
 * 4. .p12 in .pem konvertieren:
 *    openssl pkcs12 -in pass.p12 -clcerts -nokeys -out pass.pem
 *    openssl pkcs12 -in pass.p12 -nocerts -out pass-key.pem -nodes
 * 5. WWDR Zertifikat herunterladen von Apple
 * 6. Pass Model Verzeichnis erstellen in /pass-model/ mit:
 *    - pass.json (Template)
 *    - icon.png, icon@2x.png
 *    - logo.png, logo@2x.png
 *    - strip.png, strip@2x.png (optional)
 */

import { PKPass } from "passkit-generator";
import fs from "fs/promises";
import path from "path";
import { createSignedQRToken } from "@/lib/qr";

interface ApplePassParams {
  passId: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  memberType: string;
  joinDate: string;
  expiryDate: string;
  photoBuffer?: Buffer;
}

export async function generateApplePass(
  params: ApplePassParams
): Promise<Buffer> {
  if (!process.env.APPLE_PASS_TYPE_ID) throw new Error("APPLE_PASS_TYPE_ID is not set");
  if (!process.env.APPLE_TEAM_ID) throw new Error("APPLE_TEAM_ID is not set");

  const modelDir = path.resolve(process.cwd(), "pass-model");

  // Zertifikate: bevorzugt aus Env-Variablen (Base64), Fallback auf Dateisystem (lokal)
  let signerCert: Buffer;
  let signerKey: Buffer;
  let wwdr: Buffer;

  if (
    process.env.APPLE_CERT_PEM_BASE64 &&
    process.env.APPLE_KEY_PEM_BASE64 &&
    process.env.APPLE_WWDR_PEM_BASE64
  ) {
    signerCert = Buffer.from(process.env.APPLE_CERT_PEM_BASE64, "base64");
    signerKey = Buffer.from(process.env.APPLE_KEY_PEM_BASE64, "base64");
    wwdr = Buffer.from(process.env.APPLE_WWDR_PEM_BASE64, "base64");
  } else {
    const certsDir = path.resolve(process.cwd(), "certs");
    [signerCert, signerKey, wwdr] = await Promise.all([
      fs.readFile(path.join(certsDir, "pass.pem")),
      fs.readFile(path.join(certsDir, "pass-key.pem")),
      fs.readFile(path.join(certsDir, "wwdr.pem")),
    ]);
  }

  const qrToken = await createSignedQRToken(params.passId);

  const pass = new PKPass(
    {},
    {
      signerCert,
      signerKey,
      wwdr,
    },
    {
      serialNumber: params.passId,
      passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID!,
      teamIdentifier: process.env.APPLE_TEAM_ID!,
      organizationName:
        process.env.NEXT_PUBLIC_CLUB_NAME || "Galatasaray Ulm/Neu-Ulm",
      description: "Mitgliedsausweis",
      foregroundColor: "rgb(255, 255, 255)",
      backgroundColor: "rgb(227, 10, 23)",
      labelColor: "rgb(249, 160, 27)", // Galatasaray-Gold für Labels
      // logoText weggelassen: das logo.png enthält bereits den Schriftzug
    }
  );

  // Typ: Generic
  pass.type = "generic";

  pass.primaryFields.push({
    key: "member-name",
    label: "MITGLIED",
    value: `${params.firstName} ${params.lastName}`,
  });

  // Mitgliedsnummer als einzelnes Secondary-Field — prominent unter dem Namen
  pass.secondaryFields.push({
    key: "member-number",
    label: "MITGLIEDSNUMMER",
    value: params.memberNumber,
  });

  // Drei Auxiliary-Felder nebeneinander: TYP | SEIT | BIS
  pass.auxiliaryFields.push(
    {
      key: "member-type",
      label: "TYP",
      value: params.memberType.toUpperCase(),
    },
    {
      key: "join-date",
      label: "SEIT",
      value: params.joinDate,
    },
    {
      key: "expiry-date",
      label: "BIS",
      value: params.expiryDate,
    }
  );

  pass.setBarcodes({
    format: "PKBarcodeFormatQR",
    message: qrToken,
    messageEncoding: "iso-8859-1",
  });

  // Pass Model Dateien hinzufügen (icon, logo etc.)
  try {
    const modelFiles = await fs.readdir(modelDir);
    for (const file of modelFiles) {
      if (file === "pass.json") continue;
      const filePath = path.join(modelDir, file);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const buffer = await fs.readFile(filePath);
        pass.addBuffer(file, buffer);
      }
    }
  } catch {
    // pass-model Verzeichnis existiert möglicherweise noch nicht
  }

  // Foto hinzufügen
  if (params.photoBuffer) {
    pass.addBuffer("thumbnail.png", params.photoBuffer);
    pass.addBuffer("thumbnail@2x.png", params.photoBuffer);
  }

  const passBuffer = pass.getAsBuffer();
  return Buffer.from(passBuffer);
}
