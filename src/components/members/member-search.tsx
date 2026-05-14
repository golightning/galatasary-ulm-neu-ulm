"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  initialQuery: string;
  initialStatus: string;
  initialType: string;
}

export function MemberSearch({ initialQuery, initialStatus, initialType }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/members?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <Input
        placeholder="Suche nach Name, E-Mail oder Nummer..."
        defaultValue={initialQuery}
        onChange={(e) => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          const value = e.target.value;
          debounceRef.current = setTimeout(() => updateParams("q", value), 300);
        }}
        className="max-w-sm"
      />
      <Select defaultValue={initialStatus} onValueChange={(v) => updateParams("status", v === "all" ? "" : v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Status</SelectItem>
          <SelectItem value="active">Aktiv</SelectItem>
          <SelectItem value="expired">Abgelaufen</SelectItem>
          <SelectItem value="blocked">Gesperrt</SelectItem>
          <SelectItem value="pending">Ausstehend</SelectItem>
        </SelectContent>
      </Select>
      <Select defaultValue={initialType} onValueChange={(v) => updateParams("type", v === "all" ? "" : v)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Mitgliedstyp" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle Typen</SelectItem>
          <SelectItem value="single">Einzel</SelectItem>
          <SelectItem value="family">Familie</SelectItem>
          <SelectItem value="sponsor">Sponsor</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
