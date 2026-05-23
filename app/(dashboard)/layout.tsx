import BottomNav from "@/components/BottomNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] text-[#e2e2e2] pb-24">
      {children}
      <BottomNav />
    </div>
  );
}
