import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { MemberSearch } from "@/components/members/member-search";
import { statusLabels, statusVariants, typeLabels } from "@/lib/constants";

export const metadata = { title: "Mitglieder" };

interface Props {
  searchParams: Promise<{ q?: string; status?: string; type?: string; page?: string }>;
}

const PAGE_SIZE = 50;

export default async function MembersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const params = await searchParams;
  const query = params.q || "";
  const statusFilter = params.status || "";
  const typeFilter = params.type || "";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const where: Record<string, unknown> = {};

  if (query) {
    where.OR = [
      { firstName: { contains: query, mode: "insensitive" } },
      { lastName: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { memberNumber: { contains: query, mode: "insensitive" } },
    ];
  }

  if (statusFilter) {
    where.status = statusFilter;
  }

  if (typeFilter) {
    where.memberType = typeFilter;
  }

  const [totalCount, members] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        memberNumber: true,
        firstName: true,
        lastName: true,
        email: true,
        memberType: true,
        status: true,
        joinDate: true,
        expiryDate: true,
        createdAt: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const paginationParams = new URLSearchParams();
  if (query) paginationParams.set("q", query);
  if (statusFilter) paginationParams.set("status", statusFilter);
  if (typeFilter) paginationParams.set("type", typeFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mitglieder</h1>
          <p className="text-muted-foreground">
            {totalCount} Mitglied{totalCount !== 1 ? "er" : ""} gefunden
          </p>
        </div>
        <Link href="/members/new">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Neues Mitglied
          </Button>
        </Link>
      </div>

      <Suspense fallback={null}>
        <MemberSearch initialQuery={query} initialStatus={statusFilter} initialType={typeFilter} />
      </Suspense>

      {/* Mobile: Card-Ansicht */}
      <div className="space-y-3 md:hidden">
        {members.length === 0 ? (
          <div className="rounded-lg border p-8 text-center text-muted-foreground">
            Keine Mitglieder gefunden
          </div>
        ) : (
          members.map((member) => (
            <Link key={member.id} href={`/members/${member.id}`} className="block">
              <div className="rounded-lg border p-4 space-y-2 active:bg-accent">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {member.firstName} {member.lastName}
                  </span>
                  <Badge variant={statusVariants[member.status] || "secondary"}>
                    {statusLabels[member.status] || member.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="font-mono">{member.memberNumber}</span>
                  <span>{typeLabels[member.memberType] || member.memberType}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Gültig bis {new Date(member.expiryDate).toLocaleDateString("de-DE")}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Desktop: Tabelle */}
      <div className="hidden md:block rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nr.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Gültig bis</TableHead>
              <TableHead className="text-right">Aktion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Keine Mitglieder gefunden
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-mono text-sm">{member.memberNumber}</TableCell>
                  <TableCell className="font-medium">
                    {member.firstName} {member.lastName}
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{typeLabels[member.memberType] || member.memberType}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[member.status] || "secondary"}>
                      {statusLabels[member.status] || member.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(member.expiryDate).toLocaleDateString("de-DE")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/members/${member.id}`}>
                      <Button variant="outline" size="sm">
                        Details
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Seite {page} von {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/members?${paginationParams.toString()}&page=${page - 1}`}>
                <Button variant="outline" size="sm">Zurück</Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/members?${paginationParams.toString()}&page=${page + 1}`}>
                <Button variant="outline" size="sm">Weiter</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
