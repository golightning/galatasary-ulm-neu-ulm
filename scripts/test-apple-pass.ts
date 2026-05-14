/**
 * Test-Script: Apple Wallet Pass lokal generieren
 *
 * Erzeugt einen .pkpass mit Dummy-Zertifikaten.
 * Der Pass funktioniert NICHT auf echten iPhones,
 * aber validiert den kompletten Code-Pfad.
 *
 * Nutzung: npx tsx scripts/test-apple-pass.ts
 */

import "dotenv/config";
import { generateApplePass } from "../src/lib/apple-wallet";
import fs from "fs";
import path from "path";

async function main() {
  console.log("🍎 Apple Wallet Pass Test\n");
  console.log("Prüfe Voraussetzungen...");

  // Prüfe Zertifikate
  const certsDir = path.resolve(process.cwd(), "certs");
  const requiredCerts = ["pass.pem", "pass-key.pem", "wwdr.pem"];
  for (const cert of requiredCerts) {
    const certPath = path.join(certsDir, cert);
    if (!fs.existsSync(certPath)) {
      console.error(`  ✗ ${cert} fehlt in ${certsDir}`);
      console.error('    Erstelle Dummy-Zertifikate mit: openssl req -x509 -newkey rsa:2048 ...');
      process.exit(1);
    }
    console.log(`  ✓ ${cert}`);
  }

  // Prüfe Pass-Model Assets
  const modelDir = path.resolve(process.cwd(), "pass-model");
  const requiredAssets = ["icon.png", "icon@2x.png", "logo.png", "logo@2x.png"];
  for (const asset of requiredAssets) {
    const assetPath = path.join(modelDir, asset);
    if (!fs.existsSync(assetPath)) {
      console.error(`  ✗ ${asset} fehlt in ${modelDir}`);
      console.error("    Erstelle Assets mit: node scripts/create-test-assets.js");
      process.exit(1);
    }
    console.log(`  ✓ ${asset}`);
  }

  // Prüfe Env-Vars
  const passTypeId = process.env.APPLE_PASS_TYPE_ID || "pass.de.galatasaray-ulm.member";
  const teamId = process.env.APPLE_TEAM_ID || "TESTTEAMID";
  console.log(`\n  Pass Type ID: ${passTypeId}`);
  console.log(`  Team ID: ${teamId}`);

  // Setze Env-Vars falls nicht vorhanden (für den Test)
  if (!process.env.APPLE_PASS_TYPE_ID) {
    process.env.APPLE_PASS_TYPE_ID = "pass.de.galatasaray-ulm.member";
  }
  if (!process.env.APPLE_TEAM_ID) {
    process.env.APPLE_TEAM_ID = "TESTTEAMID";
  }
  if (!process.env.QR_SIGNING_SECRET) {
    process.env.QR_SIGNING_SECRET = "test-secret-for-local-development-only-32chars";
  }

  console.log("\nGeneriere Apple Wallet Pass...\n");

  const testMember = {
    passId: "test-pass-" + Date.now(),
    memberNumber: "GS-0001",
    firstName: "Mehmet",
    lastName: "Yilmaz",
    memberType: "single",
    joinDate: "01.01.2024",
    expiryDate: "31.12.2026",
  };

  console.log("  Mitglied:", `${testMember.firstName} ${testMember.lastName}`);
  console.log("  Nummer:", testMember.memberNumber);
  console.log("  Typ:", testMember.memberType);
  console.log("  Gültig bis:", testMember.expiryDate);

  try {
    const passBuffer = await generateApplePass(testMember);

    const outputPath = path.resolve(process.cwd(), "test-output.pkpass");
    fs.writeFileSync(outputPath, passBuffer);

    console.log(`\n✅ Pass erfolgreich erstellt!`);
    console.log(`   Datei: ${outputPath}`);
    console.log(`   Größe: ${passBuffer.length} bytes`);
    console.log(`\n   Hinweis: Pass ist mit Dummy-Zertifikaten signiert`);
    console.log(`   und funktioniert NICHT auf echten iPhones.`);
    console.log(`   Die .pkpass Datei ist ein ZIP-Archiv,`);
    console.log(`   du kannst sie mit 'unzip -l test-output.pkpass' inspizieren.`);
  } catch (err) {
    console.error("\n✗ Fehler bei der Pass-Erzeugung:");
    console.error(err);
    process.exit(1);
  }
}

main();
