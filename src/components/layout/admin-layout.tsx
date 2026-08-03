import { AdminHeader } from "@/components/layout/admin-header";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-night-950">
      <AdminHeader />
      <main className="pt-28 lg:pt-16">{children}</main>
    </div>
  );
}
