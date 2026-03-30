import ProtectedLayout from "@/components/nav/protected-layout";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout requiredRole="manager">{children}</ProtectedLayout>;
}
