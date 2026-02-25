export default function StreamOverlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Transparent background — designed for OBS Browser Source
  // The <style> tag overrides the root layout's bg-background on <body>
  return (
    <>
      <style>{`
        html, body {
          background: transparent !important;
          background-color: transparent !important;
        }
      `}</style>
      <div style={{ background: "transparent" }} className="h-screen overflow-hidden">
        {children}
      </div>
    </>
  );
}
