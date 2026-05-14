import { z } from "zod";

export const memberTypeEnum = z.enum(["single", "family", "sponsor"]);
export const memberStatusEnum = z.enum(["active", "expired", "blocked", "pending"]);

export const createMemberSchema = z.object({
  memberNumberSuffix: z
    .string()
    .regex(/^\d{1,6}$/, "Nur Zahlen erlaubt (z.\u00a0B. 42)")
    .optional()
    .or(z.literal("")),
  firstName: z.string().min(1, "Vorname ist erforderlich").max(100),
  lastName: z.string().min(1, "Nachname ist erforderlich").max(100),
  email: z.string().email("Ung\u00fcltige E-Mail-Adresse"),
  memberType: memberTypeEnum,
  joinDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Ung\u00fcltiges Datum"),
  expiryDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Ung\u00fcltiges Datum"),
}).refine(
  (d) => !d.expiryDate || !d.joinDate || new Date(d.expiryDate) > new Date(d.joinDate),
  { message: "Ablaufdatum muss nach Beitrittsdatum liegen", path: ["expiryDate"] }
);

// updateMemberSchema ist bewusst ein eigenes z.object (kein partial() von createMemberSchema),
// damit memberNumberSuffix und andere create-spezifische Felder nicht durchkommen.
// `status` ist ausgeschlossen — Status-Übergänge laufen ausschließlich über dedizierte
// Endpunkte (/block, /renew), die eigene Audit-Log-Einträge schreiben.
// `expiryDate` ist ausgeschlossen — Verlängerungen laufen ausschließlich über /renew,
// das ein Future-Date erzwingt und einen Audit-Log-Eintrag schreibt. Damit kann kein Admin
// unbeabsichtigt einen Member durch PATCH auf ein vergangenes Datum auf "expired" setzen
// ohne sichtbaren Audit-Trail.
export const updateMemberSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich").max(100).optional(),
  lastName: z.string().min(1, "Nachname ist erforderlich").max(100).optional(),
  email: z.string().email("Ungültige E-Mail-Adresse").optional(),
  memberType: memberTypeEnum.optional(),
  joinDate: z.string().refine((d) => !isNaN(Date.parse(d)), "Ungültiges Datum").optional(),
});

export const renewMemberSchema = z.object({
  newExpiryDate: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), "Ungültiges Datum")
    .refine((d) => new Date(d) > new Date(), "Neues Ablaufdatum muss in der Zukunft liegen"),
});

export const loginSchema = z.object({
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(1, "Passwort ist erforderlich"),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type RenewMemberInput = z.infer<typeof renewMemberSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
