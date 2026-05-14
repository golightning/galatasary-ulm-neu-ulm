# Setup-Anleitung: Resend, Google Wallet & Apple Wallet

---

## 0. Vorgehen – Was alleine, was mit Kunde?

### Alleine erledigen (kein Kundenkontakt nötig)
- [ ] Google Cloud Projekt erstellen + Wallet API aktivieren
- [ ] Google Service Account erstellen + JSON-Key herunterladen
- [ ] Google Pay Issuer Account beantragen (Wartezeit 1–2 Tage)
- [ ] Neon Account + Datenbank erstellen (Region: Frankfurt)
- [ ] Vercel Account erstellen + GitHub-Repo verbinden
- [ ] Apple Zertifikate als Base64 vorbereiten (lokal)
- [ ] Pass-Bilder (icon/logo PNGs) für Apple Wallet erstellen

### Mit dem Kunden (DNS/Domain-Zugang nötig)
- [ ] Domain kaufen (z.B. `galatasaray-ulm.de` bei IONOS)
- [ ] DNS-Einträge bei IONOS setzen (CNAME für Vercel, TXT/DKIM für Resend)
- [ ] Admin-Passwort für Produktion gemeinsam festlegen (vor `prisma db seed`)
- [ ] Google Pay Issuer Account ggf. auf Vereinsnamen verifizieren

---

## 1. Resend (E-Mail-Versand)

### 1.1 API Key
1. [resend.com](https://resend.com) → einloggen
2. **API Keys** → **Create API Key**
   - Name: `gsulnu1905`
   - Permission: `Full access`
   - Domain: `All Domains`
3. Key kopieren → in `.env` eintragen:
   ```env
   RESEND_API_KEY="re_deinKopierterKey"
   ```

### 1.2 Domain verifizieren (für Produktiv-Betrieb)
Damit E-Mails von `noreply@galatasaray-ulm.de` statt `onboarding@resend.dev` kommen:

1. Resend Dashboard → **Domains** → **Add Domain** → `galatasaray-ulm.de` eingeben
2. Die angezeigten DNS-Einträge beim Domain-Anbieter eintragen:
   - `TXT` – SPF-Eintrag
   - `TXT` – DKIM-Eintrag (2 Stück)
   - `MX` – optional, nur für Bounces
3. Resend → **Verify** klicken (kann bis zu 24h dauern, meist aber < 30 Min)
4. `.env` prüfen:
   ```env
   EMAIL_FROM="Galatasaray Ulm <noreply@galatasaray-ulm.de>"
   ```

> **Ohne Domain-Verifizierung** funktioniert der E-Mail-Versand nur an die eigene Resend-Account-E-Mail (zum Testen ausreichend).

---

## 2. Google Wallet

### 2.1 Google Cloud – Projekt & API
1. [console.cloud.google.com](https://console.cloud.google.com) → Projekt erstellen oder bestehendes wählen
2. **APIs & Services** → **Library** → `Google Wallet API` suchen → **Enable**

### 2.2 Service Account erstellen
1. **IAM & Admin** → **Service Accounts** → **Create Service Account**
   - Name: `wallet-service-account`
   - Rolle: keine nötig (wird über Wallet Console vergeben)
2. Nach Erstellung: Account anklicken → **Keys** Tab → **Add Key** → **Create new key** → **JSON**
3. Heruntergeladene JSON-Datei in `./certs/google-sa-key.json` ablegen
4. E-Mail des Service Accounts notieren (z.B. `wallet-service-account@projektname.iam.gserviceaccount.com`)

### 2.3 Google Pay & Wallet Console
1. [pay.google.com/business/console](https://pay.google.com/business/console) öffnen
2. Registrierung ausfüllen → **Issuer Account** erstellen
3. Oben die **Issuer ID** kopieren (lange Zahl, z.B. `3388000000123456`)
4. **Users** → **Add User** → E-Mail des Service Accounts eingeben → Rolle: **Developer**

> Die Freischaltung des Issuer Accounts durch Google kann 1–2 Werktage dauern.

### 2.4 `.env` eintragen
```env
GOOGLE_WALLET_ISSUER_ID="3388000000123456"
GOOGLE_WALLET_CLASS_ID="galatasaray-ulm-member"
GOOGLE_SERVICE_ACCOUNT_EMAIL="wallet-service-account@projektname.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_KEY_PATH="./certs/google-sa-key.json"
```

**Alternativ** (empfohlen für Vercel/Produktiv): JSON-Inhalt direkt als Variable:
```env
GOOGLE_SERVICE_ACCOUNT_KEY_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

---

## 3. Apple Wallet

### 3.1 Pass Type ID erstellen
1. [developer.apple.com](https://developer.apple.com) → **Account** → **Certificates, Identifiers & Profiles**
2. **Identifiers** → **+** → **Pass Type IDs** → Continue
3. Description: `Galatasaray Ulm Member Pass`
4. Identifier: `pass.de.galatasaray-ulm.member`
5. **Register** → **Done**

### 3.2 Pass-Zertifikat erstellen
1. Auf die neu erstellte Pass Type ID klicken → **Create Certificate**
2. CSR-Datei erstellen (falls noch keine vorhanden):
   ```bash
   openssl req -new -newkey rsa:2048 -nodes \
     -keyout pass-request.key \
     -out pass-request.csr \
     -subj "/emailAddress=deine@email.de/CN=Pass Type ID/C=DE"
   ```
3. CSR-Datei hochladen → Zertifikat herunterladen (`pass.cer`)
4. `.cer` zu `.p12` konvertieren (in Keychain App öffnen → Exportieren als `.p12`) oder via Terminal:
   ```bash
   openssl x509 -inform der -in pass.cer -out pass.pem
   ```

### 3.3 Zertifikate konvertieren & ablegen
Alle Befehle aus dem Projektordner ausführen:

```bash
# 1. pass.pem – Zertifikat (ohne Private Key)
openssl pkcs12 -in pass.p12 -clcerts -nokeys -out certs/pass.pem -legacy

# 2. pass-key.pem – Private Key (ohne Passwort)
openssl pkcs12 -in pass.p12 -nocerts -nodes -out certs/pass-key.pem -legacy

# 3. wwdr.pem – Apple Intermediate Certificate (WWDR G4)
# Herunterladen von: https://www.apple.com/certificateauthority/
# Datei: AppleWWDRCAG4.cer
openssl x509 -inform der -in AppleWWDRCAG4.cer -out certs/wwdr.pem
```

Nach diesem Schritt muss `./certs/` folgende Dateien enthalten:
```
certs/
  pass.pem
  pass-key.pem
  wwdr.pem
```

### 3.4 Team ID prüfen
Die Team ID steht bereits in der `.env`:
```env
APPLE_TEAM_ID="55D3GC744D"
```
Zur Kontrolle: [developer.apple.com](https://developer.apple.com) → **Account** → **Membership** → Team ID (10-stellige Zeichenkette)

### 3.5 Pass-Bilder erstellen & ablegen
Bilder müssen in `./pass-model/` liegen:

| Datei | Größe | Verwendung |
|---|---|---|
| `icon.png` | 29×29 px | App-Icon |
| `icon@2x.png` | 58×58 px | App-Icon Retina |
| `logo.png` | 160×50 px | Logo auf dem Pass |
| `logo@2x.png` | 320×100 px | Logo Retina |

> Einfach das Vereinslogo als PNG in den genannten Größen exportieren.

### 3.6 `.env` prüfen
```env
APPLE_PASS_TYPE_ID="pass.de.galatasaray-ulm.member"
APPLE_TEAM_ID="55D3GC744D"
```

---

## Checkliste

### Resend
- [ ] API Key in `.env` eingetragen
- [ ] Domain verifiziert (DNS-Einträge gesetzt)

### Google Wallet
- [ ] Google Wallet API aktiviert
- [ ] Service Account erstellt + JSON-Key nach `certs/google-sa-key.json`
- [ ] Issuer Account erstellt (Wartezeit beachten)
- [ ] Service Account in Wallet Console als Developer hinzugefügt
- [ ] `GOOGLE_WALLET_ISSUER_ID` und `GOOGLE_SERVICE_ACCOUNT_EMAIL` in `.env` eingetragen

### Apple Wallet
- [ ] Pass Type ID `pass.de.galatasaray-ulm.member` erstellt
- [ ] Zertifikat heruntergeladen und als `certs/pass.pem` + `certs/pass-key.pem` abgelegt
- [ ] WWDR G4 heruntergeladen und als `certs/wwdr.pem` abgelegt
- [ ] Pass-Bilder in `pass-model/` abgelegt (icon, logo)

---

## 4. Deployment (Vercel + Neon)

### Warum nicht IONOS Deploy Now?
IONOS Deploy Now unterstützt zwar Next.js, aber nur als **statischen Export**.
Diese App benötigt Server-Side Rendering, API Routes und Laufzeit-Zugriff auf Zertifikate
– das erfordert einen echten Node.js-Prozess. Deploy Now scheidet damit aus.

### 4.1 Datenbank – Neon (kostenlos)
1. [neon.tech](https://neon.tech) → mit GitHub einloggen → **New Project**
2. Region: `eu-central-1` (Frankfurt)
3. Connection String kopieren (Format: `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)

### 4.2 App – Vercel (kostenlos)
1. [vercel.com](https://vercel.com) → mit GitHub einloggen
2. **Add New Project** → GitHub-Repo auswählen → **Import**
3. Framework wird automatisch als Next.js erkannt
4. Alle Env-Variablen eintragen (siehe unten) → **Deploy**

### 4.3 Env-Variablen auf Vercel
Wichtig: Zertifikate können **nicht als Dateien** auf Vercel liegen (kein beschreibbares Filesystem, private Keys nicht in Git).
Stattdessen werden sie als Base64-Strings hinterlegt.

**Zertifikate in Base64 umwandeln** (lokal ausführen, nachdem die `.pem`-Dateien vorliegen):
```bash
base64 -i certs/pass.pem | tr -d '\n'      # → APPLE_CERT_PEM_BASE64
base64 -i certs/pass-key.pem | tr -d '\n'  # → APPLE_KEY_PEM_BASE64
base64 -i certs/wwdr.pem | tr -d '\n'      # → APPLE_WWDR_PEM_BASE64
```

**Alle Env-Variablen für Vercel:**
```env
DATABASE_URL="postgresql://...@neon.tech/neondb?sslmode=require"
AUTH_SECRET="..."
AUTH_URL="https://deine-domain.de"

RESEND_API_KEY="re_..."
EMAIL_FROM="Galatasaray Ulm <noreply@galatasaray-ulm.de>"

APPLE_PASS_TYPE_ID="pass.de.galatasaray-ulm.member"
APPLE_TEAM_ID="55D3GC744D"
APPLE_CERT_PEM_BASE64="...base64..."
APPLE_KEY_PEM_BASE64="...base64..."
APPLE_WWDR_PEM_BASE64="...base64..."

GOOGLE_WALLET_ISSUER_ID="..."
GOOGLE_WALLET_CLASS_ID="galatasaray-ulm-member"
GOOGLE_SERVICE_ACCOUNT_EMAIL="..."
GOOGLE_SERVICE_ACCOUNT_KEY_JSON='{"type":"service_account",...}'

QR_SIGNING_SECRET="..."
NEXT_PUBLIC_APP_URL="https://deine-domain.de"
NEXT_PUBLIC_CLUB_NAME="Galatasaray Ulm/Neu-Ulm"
```

### 4.4 Datenbank-Schema anlegen (einmalig nach erstem Deployment)
```bash
# Lokal mit der Neon-DATABASE_URL ausführen:
DATABASE_URL="postgresql://...neon.tech..." npx prisma db push
DATABASE_URL="postgresql://...neon.tech..." npx prisma db seed
```

### 4.5 Custom Domain (IONOS → Vercel)
1. Vercel → Projekt → **Settings** → **Domains** → Domain eintragen (z.B. `galatasaray-ulm.de`)
2. Vercel zeigt dir einen CNAME-Wert an
3. IONOS DNS-Verwaltung → CNAME-Eintrag erstellen:
   - Host: `www` (oder `@` für Root)
   - Ziel: der von Vercel angezeigte Wert
4. Für Root-Domain zusätzlich A-Record auf Vercels IP (wird im Dashboard angezeigt)

### Checkliste Deployment
- [ ] Neon-Projekt erstellt, Connection String kopiert
- [ ] Vercel-Projekt erstellt, GitHub-Repo verbunden
- [ ] Alle Env-Variablen auf Vercel eingetragen
- [ ] `prisma db push` + `prisma db seed` mit Neon-URL ausgeführt
- [ ] Custom Domain bei Vercel eingetragen + DNS bei IONOS gesetzt
- [ ] `AUTH_URL` und `NEXT_PUBLIC_APP_URL` auf finale Domain gesetzt
