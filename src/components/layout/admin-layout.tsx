import { Sidebar } from "@/components/layout/sidebar";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background pt-14 md:pt-0">
        <div className="container mx-auto max-w-7xl p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
