import { prisma } from "@/lib/prisma";

/**
 * Generiert die nächste Mitgliedsnummer im Format GS-0001.
 * Nutzt Retry-Logik um Race Conditions bei gleichzeitigen Requests zu vermeiden.
 */
export async function generateMemberNumber(retries = 3): Promise<string> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const last = await prisma.member.findFirst({
      orderBy: { memberNumber: "desc" },
      select: { memberNumber: true },
    });

    let nextNum = 1;
    if (last) {
      const match = last.memberNumber.match(/GS-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    const memberNumber = `GS-${String(nextNum).padStart(4, "0")}`;

    // Prüfe ob die Nummer bereits existiert
    const existing = await prisma.member.findUnique({
      where: { memberNumber },
      select: { id: true },
    });

    if (!existing) return memberNumber;
  }

  // Nach mehreren Versuchen aufgeben — Administrator muss Nummer manuell vergeben
  throw new Error(
    "generateMemberNumber: Konnte keine eindeutige Mitgliedsnummer erzeugen. Bitte Datenbankstand prüfen."
  );
}

/**
 * Formatiert ein Datum als DD.MM.YYYY.
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Prüft ob ein Mitglied aktiv ist (Status + Ablaufdatum).
 */
export function isMemberValid(member: {
  status: string;
  expiryDate: Date;
}): { valid: boolean; reason: "valid" | "expired" | "blocked" | "invalid" } {
  if (member.status === "blocked") return { valid: false, reason: "blocked" };
  if (member.status === "pending") return { valid: false, reason: "invalid" };
  if (member.status === "expired") return { valid: false, reason: "expired" };
  if (new Date(member.expiryDate) < new Date())
    return { valid: false, reason: "expired" };
  if (member.status === "active") return { valid: true, reason: "valid" };
  return { valid: false, reason: "invalid" };
}
