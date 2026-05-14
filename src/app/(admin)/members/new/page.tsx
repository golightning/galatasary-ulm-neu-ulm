import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MemberForm } from "@/components/members/member-form";

export const metadata = { title: "Neues Mitglied" };

export default async function NewMemberPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Neues Mitglied</h1>
        <p className="text-muted-foreground">Erstelle ein neues Vereinsmitglied</p>
      </div>
      <MemberForm />
    </div>
  );
}
