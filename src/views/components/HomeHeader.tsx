// Mirrors nnb-nextjs/src/views/components/HomeHeader.tsx:
//   sticky top-0 z-20 bg-surface-primary/80 backdrop-blur-md px-4 py-2
export function HomeHeader() {
  return (
    <div className="sticky top-0 z-20 bg-surface-primary/80 backdrop-blur-md px-4 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 rounded-lg border-2 border-orange-700 bg-orange-100 px-3 py-2.5 text-sm font-semibold text-orange-700">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx={11} cy={11} r={7} />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            Search
          </div>
        </div>
      </div>
    </div>
  );
}
