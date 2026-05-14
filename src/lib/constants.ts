export const statusLabels: Record<string, string> = {
  active: "Aktiv",
  expired: "Abgelaufen",
  blocked: "Gesperrt",
  pending: "Ausstehend",
};

export const statusVariants: Record<
  string,
  "success" | "warning" | "destructive" | "secondary"
> = {
  active: "success",
  expired: "warning",
  blocked: "destructive",
  pending: "secondary",
};

export const typeLabels: Record<string, string> = {
  single: "Einzel",
  family: "Familie",
  sponsor: "Sponsor",
};

export const scanResultLabels: Record<string, string> = {
  valid: "Gültig",
  expired: "Abgelaufen",
  blocked: "Gesperrt",
  invalid: "Ungültig",
};

export const scanResultColors: Record<string, string> = {
  valid: "bg-green-100 text-green-700",
  expired: "bg-orange-100 text-orange-700",
  blocked: "bg-red-100 text-red-700",
  invalid: "bg-gray-100 text-gray-700",
};
