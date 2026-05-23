import { AbsoluteFill, Img, useCurrentFrame, spring, useVideoConfig, interpolate } from "remotion";

type Props = { image: string; caption: string; duration: number };

export const Scene: React.FC<Props> = ({ image, caption, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 22, stiffness: 80 } });
  const fadeOut = interpolate(frame, [duration - 18, duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = Math.min(enter, fadeOut);

  // Subtle Ken Burns zoom
  const scale = interpolate(frame, [0, duration], [1.02, 1.08]);
  const tx = interpolate(frame, [0, duration], [-10, 10]);

  // Caption animations
  const capY = interpolate(spring({ frame: frame - 8, fps, config: { damping: 18 } }), [0, 1], [40, 0]);
  const capOpacity = Math.min(interpolate(frame, [8, 28], [0, 1], { extrapolateRight: "clamp" }), fadeOut);

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Browser-frame container for screenshot */}
      <div style={{
        position: "absolute",
        top: 90, left: "50%",
        transform: `translateX(-50%) translateX(${tx}px) scale(${scale})`,
        width: 1500, height: 870,
        borderRadius: 22,
        overflow: "hidden",
        boxShadow: "0 50px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)",
        background: "#0a0a0a",
      }}>
        {/* macOS-style chrome */}
        <div style={{ height: 36, background: "#1a1f2e", display: "flex", alignItems: "center", paddingLeft: 18, gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#ff5f57" }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#febc2e" }} />
          <div style={{ width: 12, height: 12, borderRadius: 6, background: "#28c840" }} />
          <div style={{ marginLeft: 24, color: "#7a8597", fontSize: 13, fontWeight: 500 }}>salonzee.com</div>
        </div>
        <Img src={image} style={{ width: "100%", display: "block" }} />
      </div>

      {/* Caption */}
      <div style={{
        position: "absolute",
        bottom: 70, left: 0, right: 0,
        textAlign: "center",
        transform: `translateY(${capY}px)`,
        opacity: capOpacity,
      }}>
        <div style={{
          display: "inline-block",
          padding: "16px 36px",
          background: "rgba(11,18,32,0.78)",
          backdropFilter: "blur(8px)",
          borderRadius: 999,
          border: "1px solid rgba(16,185,129,0.35)",
          color: "white",
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: "-0.01em",
        }}>
          {caption}
        </div>
      </div>
    </AbsoluteFill>
  );
};
