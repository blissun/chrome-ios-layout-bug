// Horizontal 2px lines pinned at the bottom of each viewport unit so the
// tabbar's real position can be compared visually.
export function ViewportMarkers() {
  return (
    <>
      <div
        className="fixed inset-x-0 h-0.5 z-[199] pointer-events-none bg-red-500"
        style={{ top: 'calc(100dvh - 2px)' }}
      />
      <div
        className="fixed inset-x-0 h-0.5 z-[199] pointer-events-none bg-cyan-500"
        style={{ top: 'calc(100svh - 2px)' }}
      />
      <div
        className="fixed inset-x-0 h-0.5 z-[199] pointer-events-none bg-purple-600"
        style={{ top: 'calc(100lvh - 2px)' }}
      />
    </>
  );
}
