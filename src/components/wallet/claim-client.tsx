"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone } from "lucide-react";
import { typeLabels } from "@/lib/constants";

interface Props {
  token: string;
  isExpired: boolean;
  isClaimed: boolean;
  isMemberActive: boolean;
  member?: {
    firstName: string;
    lastName: string;
    memberNumber: string;
    memberType: string;
    status: string;
    expiryDate: Date;
  };
}

export function ClaimClient({ token, isExpired, isClaimed, isMemberActive, member }: Props) {
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [loading, setLoading] = useState("");

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setPlatform("ios");
    } else if (/android/.test(ua)) {
      setPlatform("android");
    }
  }, []);

  if (isExpired) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-red-600">Link abgelaufen</CardTitle>
          <CardDescription>
            Dieser Link ist leider nicht mehr gültig. Bitte wende dich an den Verein, um einen neuen Link zu erhalten.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isClaimed) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-orange-600">Bereits eingelöst</CardTitle>
          <CardDescription>
            Dieser Link wurde bereits verwendet. Falls du deinen Ausweis erneut hinzufügen möchtest, wende dich an den Verein.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isMemberActive) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-orange-600">Mitgliedschaft nicht aktiv</CardTitle>
          <CardDescription>
            Deine Mitgliedschaft ist aktuell nicht aktiv. Bitte wende dich an den Verein.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // TypeScript-Narrowing: member ist immer gesetzt, wenn isMemberActive true ist
  if (!member) return null;

  async function handleGoogleWallet() {
    setLoading("google");
    try {
      const res = await fetch(`/api/wallet/google/${token}`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Fehler beim Erstellen des Passes");
      }
    } catch {
      alert("Fehler beim Erstellen des Passes");
    } finally {
      setLoading("");
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_quadratisch.png" alt="Galatasaray Ulm/Neu-Ulm" className="h-16 w-16 object-contain" />
        </div>
        <CardTitle className="text-2xl">Dein Mitgliedsausweis</CardTitle>
        <CardDescription>
          Galatasaray Ulm/Neu-Ulm
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="font-medium">{member.firstName} {member.lastName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Nr.</span>
            <span className="font-mono">{member.memberNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Typ</span>
            <Badge variant="secondary">{typeLabels[member.memberType] || member.memberType}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Gültig bis</span>
            <span>{new Date(member.expiryDate).toLocaleDateString("de-DE")}</span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Apple Wallet */}
          <a
            href={`/api/wallet/apple/${token}`}
            className={`flex w-full items-center justify-center gap-3 rounded-lg px-4 py-3 text-white font-medium transition-colors ${
              platform === "ios"
                ? "bg-black hover:bg-gray-800 ring-2 ring-blue-500"
                : "bg-black hover:bg-gray-800"
            }`}
          >
            <Smartphone className="h-5 w-5" />
            Zu Apple Wallet hinzufügen
            {platform === "ios" && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                Empfohlen
              </Badge>
            )}
          </a>

          {/* Google Wallet */}
          <Button
            onClick={handleGoogleWallet}
            disabled={loading === "google"}
            className={`w-full h-auto py-3 ${
              platform === "android"
                ? "ring-2 ring-blue-500"
                : ""
            }`}
            variant="outline"
          >
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5" />
              <span>{loading === "google" ? "Wird erstellt..." : "Zu Google Wallet hinzufügen"}</span>
              {platform === "android" && (
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                  Empfohlen
                </Badge>
              )}
            </div>
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Der Ausweis wird sicher in deinem Wallet gespeichert und ist jederzeit offline verfügbar.
        </p>
      </CardContent>
    </Card>
  );
}
