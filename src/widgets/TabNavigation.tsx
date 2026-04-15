'use client';

import { forwardRef } from 'react';

const TABS = [
  { label: 'HOME', icon: 'home' },
  { label: 'SEARCH', icon: 'search' },
  { label: 'FEED', icon: 'feed' },
  { label: 'LIKE', icon: 'like' },
  { label: 'ME', icon: 'user' },
] as const;

// Mirrors nnb-nextjs/src/widgets/TabNavigation.tsx Tailwind classes:
//   fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-[480px]
//   z-[200] bg-surface-primary transition-opacity duration-150
export const TabNavigation = forwardRef<HTMLDivElement>(function TabNavigation(_, ref) {
  return (
    <div
      ref={ref}
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full md:max-w-[480px] z-[200] bg-surface-primary transition-opacity duration-150 opacity-100 border-t-2 border-green-900"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-around items-center h-16">
        {TABS.map((tab) => (
          <div
            key={tab.label}
            className="flex flex-col items-center justify-center flex-1 h-full transition-colors gap-2 relative text-green-900"
          >
            <TabIcon name={tab.icon} />
            <span className="text-xs font-bold">{tab.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

function TabIcon({ name }: { name: string }) {
  const common = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: '#1b5e20', strokeWidth: 2 };
  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 10l9-7 9 7v11a1 1 0 0 1-1 1h-6v-7H10v7H4a1 1 0 0 1-1-1z" />
        </svg>
      );
    case 'search':
      return (
        <svg {...common}>
          <circle cx={11} cy={11} r={7} />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      );
    case 'feed':
      return (
        <svg {...common}>
          <rect x={3} y={5} width={18} height={14} rx={2} />
          <path d="M3 10h18" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx={12} cy={8} r={4} />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
  }
}
