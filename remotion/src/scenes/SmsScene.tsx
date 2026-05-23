import { AbsoluteFill, useCurrentFrame, spring, useVideoConfig, interpolate, Sequence } from "remotion";

const ACCENT = "#10b981";

const Bubble: React.FC<{ delay: number; text: string; sub?: string }> = ({ delay, text, sub }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 140 } });
  const y = interpolate(s, [0, 1], [40, 0]);
  return (
    <div style={{
      transform: `translateY(${y}px)`,
      opacity: s,
      maxWidth: 360,
      alignSelf: "flex-start",
      background: "white",
      color: "#0b1220",
      padding: "16px 18px",
      borderRadius: 22,
      borderTopLeftRadius: 6,
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      fontSize: 18,
      lineHeight: 1.35,
      marginBottom: 14,
    }}>
      <div style={{ fontWeight: 600 }}>{text}</div>
      {sub ? <div style={{ marginTop: 6, color: "#475569", fontSize: 15 }}>{sub}</div> : null}
    </div>
  );
};

export const SmsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 22, stiffness: 80 } });
  const fadeOut = interpolate(frame, [132, 150], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = Math.min(enter, fadeOut);

  return (
    <AbsoluteFill style={{ opacity, justifyContent: "center", alignItems: "center" }}>
      {/* Phone frame */}
      <div style={{
        width: 440, height: 880,
        borderRadius: 56,
        background: "#0a0a0a",
        padding: 16,
        boxShadow: "0 60px 140px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,255,255,0.08)",
        transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px)`,
      }}>
        <div style={{
          width: "100%", height: "100%",
          borderRadius: 44,
          background: "linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%)",
          overflow: "hidden",
          position: "relative",
          padding: "60px 18px 18px",
        }}>
          {/* notch */}
          <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", width: 120, height: 26, background: "#0a0a0a", borderRadius: 14 }} />
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ color: "#64748b", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Text Message · Today</div>
            <div style={{ fontWeight: 700, color: "#0b1220", fontSize: 22, marginTop: 4 }}>Salonzee</div>
          </div>

          <Bubble delay={6}
            text="Booking confirmed ✓"
            sub={"Godwin's Salon — Sat 23 May, 2:30 PM\nClean Shave for Adults — GH₵ 50"} />
          <Bubble delay={48}
            text="Reminder: appointment in 1 hour"
            sub="See you at School of Hygiene, Ho. Reply STOP to cancel." />
        </div>
      </div>

      {/* Caption */}
      <div style={{
        position: "absolute",
        bottom: 80, left: 0, right: 0,
        textAlign: "center",
      }}>
        <div style={{
          display: "inline-block",
          padding: "16px 36px",
          background: "rgba(11,18,32,0.78)",
          borderRadius: 999,
          border: `1px solid ${ACCENT}59`,
          color: "white",
          fontSize: 32,
          fontWeight: 600,
        }}>
          SMS confirmation and reminders — no calls
        </div>
      </div>
    </AbsoluteFill>
  );
};
