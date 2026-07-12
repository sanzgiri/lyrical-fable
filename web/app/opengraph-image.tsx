import { ImageResponse } from "next/og";

export const alt = "Lyrical Fable Studio — Mythic fables, newly told";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{
        height: "100%", width: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "74px", color: "#fffaf1", background: "linear-gradient(135deg, #42243c, #6e385f 56%, #b67d42)",
      }}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 26, letterSpacing: 4, textTransform: "uppercase" }}>LYRICAL FABLE STUDIO</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", fontSize: 78, lineHeight: 1.05, fontFamily: "serif" }}>Mythic fables,</div>
          <div style={{ display: "flex", fontSize: 78, lineHeight: 1.05, fontFamily: "serif" }}>newly told.</div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 28, color: "#f2d7b0" }}>Write luminous stories. Listen locally. Keep what matters.</div>
        </div>
        <div style={{ display: "flex", fontSize: 22, color: "#f2d7b0" }}>Created by Ashutosh Sanzgiri</div>
      </div>
    ),
    size,
  );
}
