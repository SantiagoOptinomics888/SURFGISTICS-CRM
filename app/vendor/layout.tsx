import ProtectedLayout from "@/components/nav/protected-layout";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout requiredRole="vendor">{children}</ProtectedLayout>;
}
