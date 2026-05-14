# Galatasaray Fanclub Ulm/Neu-Ulm e.V. – Mitgliederverwaltung

Admin-Portal zur Verwaltung von Vereinsmitgliedern mit Apple Wallet- und Google Wallet-Integration.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **Prisma 7** + PostgreSQL (lokal via Docker, Produktion via Neon)
- **NextAuth 5** (Credentials, JWT)
- **Resend** (E-Mail-Versand)
- **Apple Wallet** via `passkit-generator`
- **Google Wallet** via `google-auth-library` + JWT
- **Tailwind CSS v4** + Radix UI

---

## Lokale Entwicklung

### Voraussetzungen

- Node.js 20+
- Docker (für lokale Datenbank)

### Setup (einmalig)

```bash
npm install
npm run setup
```

`npm run setup` startet Docker, erstellt die Datenbank, führt Seed aus und startet den Dev-Server.

**Standard-Admin-Login:**
- E-Mail: `admin@galatasaray-ulm.de`
- Passwort: `admin123`

### Einzelne Befehle

```bash
npm run dev          # Dev-Server starten
npm run db:push      # Schema in DB übertragen (ohne Migration)
npm run db:seed      # Admin + 3 Testmitglieder anlegen
npm run db:studio    # Prisma Studio öffnen
npm run db:reset     # DB zurücksetzen + neu seeden
npm run db:cleanup   # Abgelaufene Claim-Tokens löschen
```

---

## Umgebungsvariablen

Siehe `.env.example` für alle benötigten Variablen.

| Variable | Beschreibung |
|---|---|
| `DATABASE_URL` | PostgreSQL-Connection-String |
| `AUTH_SECRET` | NextAuth JWT Secret |
| `AUTH_URL` | App-URL (z. B. `https://gsulnu.de`) |
| `RESEND_API_KEY` | API Key von resend.com |
| `EMAIL_FROM` | Absender-Adresse, z. B. `Galatasaray Ulm <noreply@gsulnu.de>` |
| `APPLE_PASS_TYPE_ID` | Pass Type ID aus Apple Developer Portal |
| `APPLE_TEAM_ID` | Apple Team ID (10-stellig) |
| `APPLE_CERT_PEM_BASE64` | Base64 des pass.pem (für Produktion) |
| `APPLE_KEY_PEM_BASE64` | Base64 des pass-key.pem (für Produktion) |
| `APPLE_WWDR_PEM_BASE64` | Base64 des wwdr.pem (für Produktion) |
| `GOOGLE_WALLET_ISSUER_ID` | Issuer ID aus Google Pay & Wallet Console |
| `GOOGLE_WALLET_CLASS_ID` | Klassen-ID, z. B. `galatasaray-ulm-member` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service Account E-Mail |
| `GOOGLE_SERVICE_ACCOUNT_KEY_JSON` | Inhalt der Service Account JSON (für Produktion) |
| `QR_SIGNING_SECRET` | Geheimnis für QR-Code-Signierung |
| `NEXT_PUBLIC_APP_URL` | Öffentliche App-URL |
| `NEXT_PUBLIC_CLUB_NAME` | Vereinsname für Anzeige |

### Apple Wallet Zertifikate als Base64 generieren (für Vercel)

```bash
base64 -i certs/pass.pem | tr -d '\n'      # → APPLE_CERT_PEM_BASE64
base64 -i certs/pass-key.pem | tr -d '\n'  # → APPLE_KEY_PEM_BASE64
base64 -i certs/wwdr.pem | tr -d '\n'      # → APPLE_WWDR_PEM_BASE64
```

---

## Deployment (Vercel + Neon)

1. **Neon** → neon.tech → New Project → Region: Frankfurt → Connection String kopieren
2. **Vercel** → GitHub Repo verbinden → alle Env Vars setzen → deployen
3. **IONOS** → CNAME `www.gsulnu.de` → Vercel-Domain
4. Nach Deployment: `AUTH_URL` + `NEXT_PUBLIC_APP_URL` auf `https://gsulnu.de` setzen
5. Prisma DB Push + Seed mit Neon-URL ausführen

---

## Projektstruktur

```
src/
├── app/
│   ├── (admin)/          # Dashboard, Mitglieder, Scanner (auth-geschützt)
│   ├── api/              # REST-Endpunkte
│   │   ├── members/      # CRUD, Einladung, Verlängerung, Sperren, Foto
│   │   ├── scan/         # QR-Code-Validierung
│   │   └── wallet/       # Apple & Google Wallet Pass-Generierung
│   ├── login/            # Login-Seite
│   └── wallet/claim/     # Öffentliche Wallet-Claim-Seite
├── components/
│   ├── layout/           # Sidebar, AdminLayout
│   ├── members/          # MemberDetail, MemberForm, MemberSearch
│   └── ui/               # Radix UI Komponenten
└── lib/
    ├── apple-wallet.ts   # Apple Wallet .pkpass Generierung
    ├── google-wallet.ts  # Google Wallet JWT-Link Generierung
    ├── email.ts          # Resend E-Mail-Versand
    ├── auth.ts           # NextAuth Konfiguration
    ├── prisma.ts         # Prisma Client
    ├── qr.ts             # QR-Code Generierung & Verifikation
    └── rate-limit.ts     # Login Rate-Limiting
```

---

## Features

- **Mitgliederverwaltung**: Anlegen, Bearbeiten, Sperren, Verlängern
- **Mitgliedstypen**: Single, Family, Sponsor
- **Mitgliedsnummern**: Automatisch generiert (GS-XXXX)
- **Foto-Upload**: Base64 in Datenbank gespeichert
- **Einladungs-E-Mail**: mit Wallet-Claim-Link via Resend
- **Apple Wallet**: .pkpass mit QR-Code
- **Google Wallet**: JWT-basierter Pass-Link
- **QR-Code-Scanner**: Kamera-basiert im Admin-Bereich
- **Audit-Log**: Alle Aktionen werden protokolliert
- **Rate-Limiting**: Login-Schutz gegen Brute-Force
