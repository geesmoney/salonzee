import { AbsoluteFill, Img, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";

export const ClosingScene: React.FC<{ image: string }> = ({ image }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 22, stiffness: 80 } });
  const scale = interpolate(frame, [0, 105], [1.02, 1.06]);

  // Earnings stat callout
  const calloutS = spring({ frame: frame - 24, fps, config: { damping: 16, stiffness: 140 } });
  const calloutY = interpolate(calloutS, [0, 1], [30, 0]);

  // Final logo lockup
  const logoS = spring({ frame: frame - 60, fps, config: { damping: 18 } });
  const logoY = interpolate(logoS, [0, 1], [20, 0]);

  return (
    <AbsoluteFill style={{ opacity: enter }}>
      <div style={{
        position: "absolute",
        top: 80, left: 80,
        width: 1100, height: 870,
        borderRadius: 22, overflow: "hidden",
        boxShadow: "0 50px 120px rgba(0,0,0,0.55)",
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}>
        <div style={{ height: 36, background: "#1a1f2e", display: "flex", alignItems: "center", paddingLeft: 18, gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#ff5f57" }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#febc2e" }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#28c840" }} />
        </div>
        <Img src={image} style={{ width: "100%", display: "block" }} />
      </div>

      {/* Right side callout */}
      <div style={{
        position: "absolute",
        top: 220, right: 90,
        width: 580,
        transform: `translateY(${calloutY}px)`,
        opacity: calloutS,
      }}>
        <div style={{ color: "#10b981", fontSize: 20, fontWeight: 700, letterSpacing: "0.12em", marginBottom: 14 }}>
          EARNINGS, AUTOMATIC
        </div>
        <div style={{ color: "white", fontSize: 64, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
          Every completed visit lands on your dashboard.
        </div>
      </div>

      {/* Logo lockup */}
      <div style={{
        position: "absolute",
        bottom: 70, right: 90,
        textAlign: "right",
        transform: `translateY(${logoY}px)`,
        opacity: logoS,
      }}>
        <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: "-0.03em" }}>
          <span style={{ color: "white" }}>Salon</span>
          <span style={{ color: "#10b981" }}>zee</span>
          <span style={{ color: "white" }}>.</span>
        </div>
        <div style={{ color: "#94a3b8", fontSize: 24, marginTop: 8 }}>No calls. No waiting. Just booked.</div>
      </div>
    </AbsoluteFill>
  );
};
