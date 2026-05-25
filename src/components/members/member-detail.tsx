"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Mail, Ban, RefreshCw, Upload, Camera, Trash2 } from "lucide-react";

type MemberWithRelations = {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  // photoUrl ist bewusst nicht enthalten — wird über /api/members/:id/photo nachgeladen
  memberType: string;
  status: string;
  joinDate: Date;
  expiryDate: Date;
  passId: string;
  createdAt: Date;
  updatedAt: Date;
  claimTokens: { id: string; token: string; expiresAt: Date; claimedAt: Date | null; createdAt: Date }[];
  scanLogs: { id: string; result: string; scannedAt: Date }[];
  mailLogs: { id: string; type: string; status: string; sentAt: Date }[];
};

import { statusLabels, statusVariants, scanResultLabels, typeLabels } from "@/lib/constants";

export function MemberDetail({ member }: { member: MemberWithRelations }) {
  const router = useRouter();
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [renewDate, setRenewDate] = useState("");
  const [renewOpen, setRenewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function handleAction(action: string, body?: Record<string, unknown>) {
    setError("");
    setLoading(action);
    try {
      const url =
        action === "invite"
          ? `/api/members/${member.id}/invite`
          : action === "renew"
            ? `/api/members/${member.id}/renew`
            : action === "block"
              ? `/api/members/${member.id}/block`
              : action === "delete"
                ? `/api/members/${member.id}`
                : `/api/members/${member.id}`;

      const method =
        action === "update" ? "PATCH" : action === "delete" ? "DELETE" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Fehler bei der Aktion");
        return;
      }

      if (action === "delete") {
        router.push("/members");
        return;
      }

      router.refresh();
      if (action === "update") setEditMode(false);
      if (action === "renew") setRenewOpen(false);
    } finally {
      setLoading("");
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading("photo");
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/members/${member.id}/photo`, {
      method: "POST",
      body: formData,
    });

    setLoading("");

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Fehler beim Hochladen");
      return;
    }

    router.refresh();
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await handleAction("update", {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      memberType: formData.get("memberType"),
      status: formData.get("status"),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {member.firstName} {member.lastName}
          </h1>
          <p className="text-muted-foreground font-mono">{member.memberNumber}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction("invite")}
            disabled={!!loading}
          >
            <Mail className="mr-2 h-4 w-4" />
            {loading === "invite" ? "Sende..." : "Einladung"}
          </Button>

          <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Verlängern
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mitgliedschaft verlängern</DialogTitle>
                <DialogDescription>
                  Neues Ablaufdatum für {member.firstName} {member.lastName} festlegen.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Neues Ablaufdatum</Label>
                  <Input
                    type="date"
                    value={renewDate}
                    onChange={(e) => setRenewDate(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => handleAction("renew", { newExpiryDate: renewDate })}
                  disabled={!renewDate || !!loading}
                >
                  {loading === "renew" ? "Verlängere..." : "Verlängern"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {member.status !== "blocked" ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!!loading}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Sperren
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Mitglied sperren?</DialogTitle>
                  <DialogDescription>
                    {member.firstName} {member.lastName} ({member.memberNumber}) wird gesperrt.
                    Der Mitgliedsausweis wird bei der nächsten Prüfung als ungültig angezeigt.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2 pt-4">
                  <DialogTrigger asChild>
                    <Button variant="outline">Abbrechen</Button>
                  </DialogTrigger>
                  <Button
                    variant="destructive"
                    onClick={() => handleAction("block")}
                    disabled={!!loading}
                  >
                    {loading === "block" ? "Sperre..." : "Ja, sperren"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("block")}
              disabled={!!loading}
            >
              Entsperren
            </Button>
          )}

          {/* Löschen (DSGVO Art. 17) */}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={!!loading}>
                <Trash2 className="mr-2 h-4 w-4" />
                Löschen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mitglied unwiderruflich löschen?</DialogTitle>
                <DialogDescription>
                  Alle Daten von {member.firstName} {member.lastName} ({member.memberNumber}) werden dauerhaft
                  gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Abbrechen
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleAction("delete")}
                  disabled={loading === "delete"}
                >
                  {loading === "delete" ? "Lösche..." : "Ja, endgültig löschen"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Mitgliederdaten */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Mitgliederdaten</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setEditMode(!editMode)}>
              {editMode ? "Abbrechen" : "Bearbeiten"}
            </Button>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Vorname</Label>
                    <Input name="firstName" defaultValue={member.firstName} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nachname</Label>
                    <Input name="lastName" defaultValue={member.lastName} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>E-Mail</Label>
                  <Input name="email" type="email" defaultValue={member.email} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Mitgliedstyp</Label>
                    <Select name="memberType" defaultValue={member.memberType}>
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
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select name="status" defaultValue={member.status}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Aktiv</SelectItem>
                        <SelectItem value="pending">Ausstehend</SelectItem>
                        <SelectItem value="expired">Abgelaufen</SelectItem>
                        <SelectItem value="blocked">Gesperrt</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={loading === "update"}>
                  {loading === "update" ? "Speichere..." : "Speichern"}
                </Button>
              </form>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Vorname</dt>
                  <dd className="font-medium">{member.firstName}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Nachname</dt>
                  <dd className="font-medium">{member.lastName}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">E-Mail</dt>
                  <dd className="font-medium">{member.email}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Mitgliedstyp</dt>
                  <dd className="font-medium">{typeLabels[member.memberType] || member.memberType}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Status</dt>
                  <dd>
                    <Badge variant={statusVariants[member.status] || "secondary"}>
                      {statusLabels[member.status] || member.status}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Mitgliedsnummer</dt>
                  <dd className="font-mono font-medium">{member.memberNumber}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Eintrittsdatum</dt>
                  <dd className="font-medium">
                    {new Date(member.joinDate).toLocaleDateString("de-DE")}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Ablaufdatum</dt>
                  <dd className="font-medium">
                    {new Date(member.expiryDate).toLocaleDateString("de-DE")}
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        {/* Foto */}
        <Card>
          <CardHeader>
            <CardTitle>Foto</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {/* Foto wird per API-Endpoint nachgeladen – kein Base64 im RSC-Payload */}
            <img
              src={`/api/members/${member.id}/photo`}
              alt={`${member.firstName} ${member.lastName}`}
              className="h-40 w-40 rounded-lg object-cover bg-muted"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
                (e.currentTarget.nextSibling as HTMLElement | null)?.style.setProperty("display", "flex");
              }}
            />
            <div className="hidden h-40 w-40 items-center justify-center rounded-lg bg-muted">
              <Camera className="h-12 w-12 text-muted-foreground" />
            </div>
            <Label htmlFor="photo-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                <Upload className="h-4 w-4" />
                {loading === "photo" ? "Lade hoch..." : "Foto hochladen"}
              </div>
              <input
                id="photo-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </Label>
          </CardContent>
        </Card>
      </div>

      {/* Scan-Log */}
      <Card>
        <CardHeader>
          <CardTitle>Scan-Verlauf</CardTitle>
        </CardHeader>
        <CardContent>
          {member.scanLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Scans vorhanden</p>
          ) : (
            <div className="space-y-2">
              {member.scanLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <span>{new Date(log.scannedAt).toLocaleString("de-DE")}</span>
                  <Badge
                    variant={
                      log.result === "valid"
                        ? "success"
                        : log.result === "blocked"
                          ? "destructive"
                          : "warning"
                    }
                  >
                    {scanResultLabels[log.result] || log.result}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mail-Log */}
      <Card>
        <CardHeader>
          <CardTitle>E-Mail-Verlauf</CardTitle>
        </CardHeader>
        <CardContent>
          {member.mailLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine E-Mails versendet</p>
          ) : (
            <div className="space-y-2">
              {member.mailLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded border p-2 text-sm">
                  <span>{log.type === "invite" ? "Einladung" : log.type === "renew" ? "Verlängerung" : log.type}</span>
                  <span>{new Date(log.sentAt).toLocaleString("de-DE")}</span>
                  <Badge variant={log.status === "sent" ? "success" : "destructive"}>
                    {log.status === "sent" ? "Gesendet" : "Fehler"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
