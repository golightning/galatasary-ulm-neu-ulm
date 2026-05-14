import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserX, Clock } from "lucide-react";
import { scanResultLabels, scanResultColors } from "@/lib/constants";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [total, active, expired, blocked, pending, recentScans] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: "active" } }),
    prisma.member.count({ where: { status: "expired" } }),
    prisma.member.count({ where: { status: "blocked" } }),
    prisma.member.count({ where: { status: "pending" } }),
    prisma.scanLog.findMany({
      take: 10,
      orderBy: { scannedAt: "desc" },
      include: { member: { select: { firstName: true, lastName: true, memberNumber: true } } },
    }),
  ]);

  const stats = [
    { label: "Gesamt", value: total, icon: Users, color: "text-blue-600" },
    { label: "Aktiv", value: active, icon: UserCheck, color: "text-green-600" },
    { label: "Abgelaufen", value: expired, icon: Clock, color: "text-orange-600" },
    { label: "Gesperrt", value: blocked, icon: UserX, color: "text-red-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Übersicht der Vereinsmitglieder</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {pending > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ausstehend</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {pending} Mitglied{pending !== 1 ? "er" : ""} im Status &quot;Pending&quot;
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Letzte Scans</CardTitle>
        </CardHeader>
        <CardContent>
          {recentScans.length === 0 ? (
            <p className="text-muted-foreground text-sm">Noch keine Scans vorhanden</p>
          ) : (
            <div className="space-y-3">
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {scan.member
                        ? `${scan.member.firstName} ${scan.member.lastName} (${scan.member.memberNumber})`
                        : "Unbekannt"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(scan.scannedAt).toLocaleString("de-DE")}
                    </p>
                  </div>
                  <div
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      scanResultColors[scan.result] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {scanResultLabels[scan.result] || scan.result}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
