export default function StreamOverlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Transparent background — designed for OBS Browser Source
  return (
    <div style={{ background: "transparent" }} className="h-screen overflow-hidden">
      {children}
    </div>
  );
}
