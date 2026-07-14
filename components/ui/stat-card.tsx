interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  active?: boolean;
}

export function StatCard({ label, value, icon, active }: StatCardProps) {
  return (
    <div className={`rounded-lg border bg-white p-5 shadow-[0_1px_2px_rgba(10,35,48,0.025)] transition-colors ${
      active ? "border-[#0C91B6] ring-1 ring-[#0C91B6]/15" : "border-[#DDE6E9]"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase text-[#6D828A]">{label}</span>
        <span className="text-[#7CA5B2]">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-[#142B35] tabular-nums">{value}</p>
    </div>
  );
}
