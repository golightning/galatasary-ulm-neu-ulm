"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function MemberForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      memberNumberSuffix: formData.get("memberNumberSuffix"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      memberType: formData.get("memberType"),
      joinDate: formData.get("joinDate"),
      expiryDate: formData.get("expiryDate"),
    };

    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Fehler beim Erstellen");
      return;
    }

    const member = await res.json();
    router.push(`/members/${member.id}`);
    router.refresh();
  }

  const today = new Date().toISOString().split("T")[0];
  const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neues Mitglied anlegen</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Vorname</Label>
              <Input id="firstName" name="firstName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nachname</Label>
              <Input id="lastName" name="lastName" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input id="email" name="email" type="email" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memberNumberSuffix">
              Mitgliedsnummer{" "}
              <span className="text-muted-foreground font-normal text-xs">(optional – leer lassen für automatische Vergabe)</span>
            </Label>
            <div className="flex items-center gap-1">
              <span className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground select-none">
                GS-
              </span>
              <Input
                id="memberNumberSuffix"
                name="memberNumberSuffix"
                placeholder="0042"
                inputMode="numeric"
                pattern="\d{1,6}"
                title="Nur Zahlen (z. B. 42)"
                className="w-28"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="memberType">Mitgliedstyp</Label>
            <Select name="memberType" defaultValue="single">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Einzel</SelectItem>
                <SelectItem value="family">Familie</SelectItem>
                <SelectItem value="sponsor">Sponsor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="joinDate">Eintrittsdatum</Label>
              <Input id="joinDate" name="joinDate" type="date" defaultValue={today} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Ablaufdatum</Label>
              <Input id="expiryDate" name="expiryDate" type="date" defaultValue={oneYearLater} required />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Speichern..." : "Mitglied anlegen"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
