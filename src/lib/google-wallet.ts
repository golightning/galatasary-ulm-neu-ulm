/**
 * Google Wallet Generic Pass Integration
 *
 * Voraussetzungen:
 * - Google Cloud Projekt mit Wallet API aktiviert
 * - Service Account mit Wallet-Berechtigung
 * - Google Wallet Issuer Account
 *
 * Setup-Schritte:
 * 1. Google Cloud Console → APIs & Services → Google Wallet API aktivieren
 * 2. Service Account erstellen und JSON-Key herunterladen
 * 3. Google Pay & Wallet Console: https://pay.google.com/business/console
 * 4. Issuer Account erstellen
 * 5. Service Account E-Mail als User hinzufügen
 * 6. Class ID erstellen (einmalig)
 *
 * Die App erstellt:
 * - Eine Generic Class (einmalig, beim Start)
 * - Generic Objects pro Mitglied
 * - "Add to Google Wallet" Links via JWT
 */

import { GoogleAuth } from "google-auth-library";
import * as jose from "jose";
import fs from "fs/promises";
import path from "path";
import { createSignedQRToken } from "@/lib/qr";

const WALLET_API_BASE = "https://walletobjects.googleapis.com/walletobjects/v1";

interface GooglePassParams {
  passId: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  memberType: string;
  joinDate: string;
  expiryDate: string;
  photoUrl?: string;
}

async function getServiceAccountKey() {
  // Prefer inline JSON env var (avoids fs read and Turbopack warnings)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON) {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON);
  }

  const keyPath =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
    "./certs/google-sa-key.json";
  const keyFile = await fs.readFile(
    path.resolve(process.cwd(), keyPath),
    "utf-8"
  );
  return JSON.parse(keyFile);
}

async function getAuthClient() {
  const key = await getServiceAccountKey();
  const auth = new GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
  });
  return auth.getClient();
}

/**
 * Erstellt oder aktualisiert eine Generic Class (einmalig nötig).
 */
export async function ensureGenericClass() {
  if (!process.env.GOOGLE_WALLET_ISSUER_ID) throw new Error("GOOGLE_WALLET_ISSUER_ID is not set");
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const classId = `${issuerId}.${process.env.GOOGLE_WALLET_CLASS_ID || "galatasaray-ulm-member"}`;
  const clubName =
    process.env.NEXT_PUBLIC_CLUB_NAME || "Galatasaray Ulm/Neu-Ulm";

  const client = await getAuthClient();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const classPayload = {
    id: classId,
    logo: {
      sourceUri: { uri: `${appUrl}/logo_quadratisch.png` },
      contentDescription: {
        defaultValue: { language: "de", value: clubName },
      },
    },
    wideLogo: {
      sourceUri: { uri: `${appUrl}/logo_breit.png` },
      contentDescription: {
        defaultValue: { language: "de", value: clubName },
      },
    },
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            twoItems: {
              startItem: {
                firstValue: {
                  fields: [{ fieldPath: "object.textModulesData['member-number']" }],
                },
              },
              endItem: {
                firstValue: {
                  fields: [{ fieldPath: "object.textModulesData['member-type']" }],
                },
              },
            },
          },
          {
            twoItems: {
              startItem: {
                firstValue: {
                  fields: [{ fieldPath: "object.textModulesData['join-date']" }],
                },
              },
              endItem: {
                firstValue: {
                  fields: [{ fieldPath: "object.textModulesData['expiry-date']" }],
                },
              },
            },
          },
        ],
      },
    },
    issuerName: clubName,
    reviewStatus: "UNDER_REVIEW",
  };

  try {
    await client.request({
      url: `${WALLET_API_BASE}/genericClass/${classId}`,
      method: "GET",
    });
    // Class exists, update
    await client.request({
      url: `${WALLET_API_BASE}/genericClass/${classId}`,
      method: "PUT",
      data: classPayload,
    });
  } catch (err: unknown) {
    // Nur bei 404 anlegen, alle anderen Fehler (403, Netzwerkfehler, etc.) weiterwerfen
    const status =
      err && typeof err === "object" && "response" in err
        ? (err as { response?: { status?: number } }).response?.status
        : undefined;
    if (status !== 404) throw err;

    await client.request({
      url: `${WALLET_API_BASE}/genericClass`,
      method: "POST",
      data: classPayload,
    });
  }

  return classId;
}

/**
 * Generiert einen "Add to Google Wallet" Link für ein Mitglied.
 */
export async function generateGoogleWalletLink(
  params: GooglePassParams
): Promise<string> {
  if (!process.env.GOOGLE_WALLET_ISSUER_ID) throw new Error("GOOGLE_WALLET_ISSUER_ID is not set");
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const classId = `${issuerId}.${process.env.GOOGLE_WALLET_CLASS_ID || "galatasaray-ulm-member"}`;
  const objectId = `${issuerId}.${params.passId}`;
  const clubName =
    process.env.NEXT_PUBLIC_CLUB_NAME || "Galatasaray Ulm/Neu-Ulm";

  const qrToken = await createSignedQRToken(params.passId);

  const genericObject = {
    id: objectId,
    classId: classId,
    cardTitle: {
      defaultValue: { language: "de", value: clubName },
    },
    header: {
      defaultValue: {
        language: "de",
        value: `${params.firstName} ${params.lastName}`,
      },
    },
    subheader: {
      defaultValue: { language: "de", value: "Mitgliedsausweis" },
    },
    textModulesData: [
      {
        id: "member-number",
        header: "NR.",
        body: params.memberNumber,
      },
      {
        id: "member-type",
        header: "TYP",
        body: params.memberType.toUpperCase(),
      },
      {
        id: "join-date",
        header: "SEIT",
        body: params.joinDate,
      },
      {
        id: "expiry-date",
        header: "GÜLTIG BIS",
        body: params.expiryDate,
      },
    ],
    barcode: {
      type: "QR_CODE",
      value: qrToken,
    },
    hexBackgroundColor: "#E30A17",
    ...(params.photoUrl && params.photoUrl.startsWith("https://") && {
      heroImage: {
        sourceUri: { uri: params.photoUrl },
        contentDescription: {
          defaultValue: {
            language: "de",
            value: `${params.firstName} ${params.lastName}`,
          },
        },
      },
    }),
  };

  // JWT für "Save to Google Wallet" Button erstellen
  const saKey = await getServiceAccountKey();

  const privateKey = await jose.importPKCS8(saKey.private_key, "RS256");

  const jwt = await new jose.SignJWT({
    iss: saKey.client_email,
    aud: "google",
    origins: [process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"],
    typ: "savetowallet",
    payload: {
      genericObjects: [genericObject],
    },
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt()
    .sign(privateKey);

  return `https://pay.google.com/gp/v/save/${jwt}`;
}
