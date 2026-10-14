import AppShell from "@/components/AppShell";
import { AuthProvider } from "@/components/AuthContext";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
