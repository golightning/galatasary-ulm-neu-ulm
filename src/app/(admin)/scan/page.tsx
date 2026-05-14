"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Camera, RotateCcw, Keyboard } from "lucide-react";
import jsQR from "jsqr";
import { scanResultLabels, typeLabels } from "@/lib/constants";

interface ScanResult {
  valid: boolean;
  result: string;
  message: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    memberNumber: string;
    memberType: string;
  };
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError("");
    setResult(null);
    setScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setError("Kamerazugriff nicht möglich");
      setScanning(false);
    }
  }, []);

  // Scan-Loop mit BarcodeDetector API (Chrome/Edge) oder jsQR Fallback (Safari/Firefox)
  useEffect(() => {
    if (!scanning) return;

    let active = true;

    // @ts-expect-error BarcodeDetector ist noch nicht in allen TS-Definitionen
    const hasBarcodeDetector = typeof BarcodeDetector !== "undefined";

    async function scanLoop() {
      // @ts-expect-error BarcodeDetector ist noch experimentell
      const detector = hasBarcodeDetector ? new BarcodeDetector({ formats: ["qr_code"] }) : null;

      const tick = async () => {
        if (!active || !videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
          requestAnimationFrame(tick);
          return;
        }

        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0);

        try {
          let qrData: string | null = null;

          if (detector) {
            const barcodes = await detector.detect(canvas);
            if (barcodes.length > 0) {
              qrData = barcodes[0].rawValue;
            }
          } else {
            // jsQR Fallback für Safari/Firefox
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, canvas.width, canvas.height);
            if (code) {
              qrData = code.data;
            }
          }

          if (qrData) {
            active = false;
            await validateQR(qrData);
            return;
          }
        } catch {
          // Detection error, continue
        }

        if (active) requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    }

    scanLoop();

    return () => {
      active = false;
    };
  }, [scanning]);

  async function validateQR(qrData: string) {
    try {
      const res = await fetch("/api/scan/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrData }),
      });

      const data: ScanResult = await res.json();
      setResult(data);
      setScanning(false);
      stopCamera();
    } catch {
      setError("Fehler bei der Validierung");
      setScanning(false);
      stopCamera();
    }
  }

  function resetScan() {
    setResult(null);
    setError("");
    setManualInput("");
    setShowManualInput(false);
    startCamera();
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualInput.trim()) return;
    await validateQR(manualInput.trim());
  }

  // Cleanup
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">QR-Scanner</h1>
        <p className="text-muted-foreground">Scanne den QR-Code auf dem Mitgliedsausweis</p>
      </div>

      <div className="mx-auto max-w-lg">
        {!scanning && !result && !error && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12">
              <Camera className="h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground">Kamera starten, um QR-Code zu scannen</p>
              <Button onClick={startCamera} size="lg">
                <Camera className="mr-2 h-5 w-5" />
                Scanner starten
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManualInput(!showManualInput)}
              >
                <Keyboard className="mr-2 h-4 w-4" />
                Manuell eingeben
              </Button>
              {showManualInput && (
                <form onSubmit={handleManualSubmit} className="flex w-full gap-2">
                  <Input
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="QR-Code Daten einfügen..."
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!manualInput.trim()}>
                    Prüfen
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {scanning && (
          <Card>
            <CardContent className="p-4">
              <div className="relative overflow-hidden rounded-lg">
                <video
                  ref={videoRef}
                  className="w-full rounded-lg"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-48 w-48 rounded-2xl border-2 border-white/50" />
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Halte den QR-Code in den Rahmen
              </p>
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => {
                  setScanning(false);
                  stopCamera();
                }}
              >
                Abbrechen
              </Button>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card
            className={
              result.valid
                ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                : result.result === "blocked"
                  ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                  : result.result === "expired"
                    ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                    : "border-gray-500 bg-gray-50 dark:bg-gray-900/30"
            }
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Scan-Ergebnis</span>
                <Badge
                  variant={
                    result.valid
                      ? "success"
                      : result.result === "blocked"
                        ? "destructive"
                        : "warning"
                  }
                  className="text-base px-3 py-1"
                >
                  {result.valid ? "✓" : result.result === "expired" ? "⏱" : "✗"}{" "}
                  {(scanResultLabels[result.result] || result.result).toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-lg">{result.message}</p>
              {result.member && (
                <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
                  <img
                    src={`/api/members/${result.member.id}/photo`}
                    alt={`${result.member.firstName} ${result.member.lastName}`}
                    className="h-20 w-20 rounded-full object-cover border-2 border-border shrink-0 bg-muted"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                      (e.currentTarget.nextSibling as HTMLElement | null)?.style.setProperty("display", "flex");
                    }}
                  />
                  <div className="hidden h-20 w-20 rounded-full bg-muted items-center justify-center shrink-0 border-2 border-border">
                    <span className="text-2xl font-bold text-muted-foreground">
                      {result.member.firstName[0]}{result.member.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {result.member.firstName} {result.member.lastName}
                    </p>
                    <p className="font-mono text-sm text-muted-foreground">
                      {result.member.memberNumber}
                    </p>
                    <p className="text-sm">{typeLabels[result.member.memberType] || result.member.memberType}</p>
                  </div>
                </div>
              )}
              <Button onClick={resetScan} className="mt-4 w-full">
                <RotateCcw className="mr-2 h-4 w-4" />
                Erneut scannen
              </Button>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-500">
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <p className="text-destructive">{error}</p>
              <Button onClick={resetScan}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Erneut versuchen
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
