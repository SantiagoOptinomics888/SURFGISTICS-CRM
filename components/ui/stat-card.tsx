interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  active?: boolean;
}

export function StatCard({ label, value, icon, active }: StatCardProps) {
  return (
    <div className={`bg-white border rounded-lg p-5 transition-colors ${
      active ? "border-[#0369A1] ring-1 ring-[#0369A1]/20" : "border-[#E2E8F0]"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{label}</span>
        <span className="text-[#94A3B8]">{icon}</span>
      </div>
      <p className="text-3xl font-semibold text-[#020617] tabular-nums">{value}</p>
    </div>
  );
}
