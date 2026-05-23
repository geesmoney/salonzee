import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { Scene } from "./scenes/Scene";
import { SmsScene } from "./scenes/SmsScene";
import { ClosingScene } from "./scenes/ClosingScene";

loadFont("normal", { weights: ["400", "600", "800"], subsets: ["latin"] });

// Scene timing (30fps). Total = 915 frames (~30.5s).
const SCENES = [
  { from: 0,   dur: 150, image: "01-home.png",             caption: "Book your next salon visit in seconds" },
  { from: 150, dur: 180, image: "02-discover.png",         caption: "Hand-picked, vetted salons across Ghana" },
  { from: 330, dur: 180, image: "03-salon-booking.png",    caption: "Pick a service, date and time" },
  { from: 510, dur: 150, image: "04-bookings-pending.png", caption: "The salon is notified — review and confirm" },
];

const BG = "#0b1220";

const Vignette = () => (
  <AbsoluteFill style={{
    background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
    pointerEvents: "none",
  }} />
);

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 30) * 8;
  return (
    <AbsoluteFill style={{
      background: `linear-gradient(${135 + drift}deg, #0b1220 0%, #0f1d2e 50%, #0a1a18 100%)`,
    }} />
  );
};

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG, fontFamily: "Inter, sans-serif" }}>
      <Grain />
      {/* Floating brand accent blobs */}
      <FloatingBlobs />

      {SCENES.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.dur}>
          <Scene image={staticFile(`images/${s.image}`)} caption={s.caption} duration={s.dur} />
        </Sequence>
      ))}

      {/* SMS confirmation scene */}
      <Sequence from={660} durationInFrames={150}>
        <SmsScene />
      </Sequence>

      {/* Closing earnings scene */}
      <Sequence from={810} durationInFrames={105}>
        <ClosingScene image={staticFile("images/06-dashboard-earnings.png")} />
      </Sequence>

      <Vignette />
      <Audio src={staticFile("audio/narration.mp3")} />
    </AbsoluteFill>
  );
};

const FloatingBlobs: React.FC = () => {
  const frame = useCurrentFrame();
  const y1 = Math.sin(frame / 60) * 40;
  const y2 = Math.cos(frame / 75) * 50;
  return (
    <AbsoluteFill>
      <div style={{
        position: "absolute", top: -200 + y1, left: -200,
        width: 700, height: 700, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16,185,129,0.35), transparent 70%)",
        filter: "blur(40px)",
      }} />
      <div style={{
        position: "absolute", bottom: -250 + y2, right: -150,
        width: 800, height: 800, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(244,114,182,0.25), transparent 70%)",
        filter: "blur(50px)",
      }} />
    </AbsoluteFill>
  );
};
