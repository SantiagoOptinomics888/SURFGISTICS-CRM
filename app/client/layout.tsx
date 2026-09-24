import ProtectedLayout from "@/components/nav/protected-layout";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout requiredRole="vendor" requiredPermission="imports">{children}</ProtectedLayout>;
}
