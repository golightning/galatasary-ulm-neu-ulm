import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Seite nicht gefunden</p>
      <div className="flex gap-3">
        <Link href="/dashboard">
          <Button>Zum Dashboard</Button>
        </Link>
        <Link href="/login">
          <Button variant="outline">Zum Login</Button>
        </Link>
      </div>
    </div>
  );
}
