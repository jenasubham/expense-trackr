'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', icon: 'home', path: '/' },
    { name: 'Search', icon: 'search', path: '/search' },
    { name: 'Stats', icon: 'query_stats', path: '/stats' },
    { name: 'Profile', icon: 'person', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-[20px] pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] bg-[#0D0D0D]/90 backdrop-blur-md border-t border-[#434933]">
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link key={item.name} href={item.path} className="flex flex-col items-center justify-center group w-16">
            {isActive ? (
              <div className="flex flex-col items-center justify-center text-[#a1d800] rounded-full px-4 py-1 transition-all duration-200">
                <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                <span className="font-[family-name:var(--font-geist-sans)] text-[10px] mt-1 font-bold tracking-widest uppercase">{item.name}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-[#8d9479] px-4 py-1 group-hover:text-[#c3caac] transition-all duration-200">
                <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 0" }}>{item.icon}</span>
                <span className="font-[family-name:var(--font-geist-sans)] text-[10px] mt-1 font-semibold tracking-widest uppercase">{item.name}</span>
              </div>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
