import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import logoLightUrl from "../../assets/relayclarity-logo.svg";
import logoDarkUrl from "../../assets/relayclarity-logo-dark.svg";

const colors = {
  ink: "#0f172a",
  slate: "#475569",
  muted: "#64748b",
  line: "#e2e8f0",
  blue: "#2563eb",
  blueDark: "#1d4ed8",
  teal: "#0f766e",
  tealBright: "#2dd4bf",
};

const ease = Easing.bezier(0.22, 1, 0.36, 1);

const base: React.CSSProperties = {
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const useProgress = (start = 0, duration = 30) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
};

const useSpringIn = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 110, mass: 0.9 },
  });
};

/** Spring with a little overshoot — for numbers and avatars that should "pop". */
const usePop = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: { damping: 13, stiffness: 140, mass: 0.7 },
  });
};

const Reveal: React.FC<{
  delay?: number;
  from?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, from = 44, children, style }) => {
  const progress = useSpringIn(delay);
  return (
    <div
      style={{
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [from, 0])}px)`,
        filter: `blur(${interpolate(progress, [0, 0.75, 1], [12, 1, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Springy slide-in from the right, used for the big product panels. */
const SlideIn: React.FC<{
  delay?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 22, stiffness: 80, mass: 1 },
  });
  return (
    <div
      style={{
        opacity: interpolate(progress, [0, 0.5], [0, 1], {
          extrapolateRight: "clamp",
        }),
        transform: `translateX(${interpolate(progress, [0, 1], [110, 0])}px) scale(${interpolate(
          progress,
          [0, 1],
          [0.965, 1],
        )})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Scene shell: slow cinematic push-in across its whole duration, a fast fade
 * up at the start and a dip-to-dark at the end so cuts breathe. Dark scenes
 * get softly drifting light particles.
 */
const Scene: React.FC<{
  children: React.ReactNode;
  dark?: boolean;
  duration?: number;
}> = ({ children, dark = false, duration = 150 }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const fadeOut = interpolate(frame, [duration - 12, duration - 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const zoom = interpolate(frame, [0, duration], [1, 1.045]);
  return (
    <AbsoluteFill
      style={{
        ...base,
        overflow: "hidden",
        opacity: fadeIn * fadeOut,
        transform: `scale(${zoom})`,
        color: dark ? "#ffffff" : colors.ink,
        background: dark
          ? "radial-gradient(1300px 860px at 76% 16%, rgba(37,99,235,.26), transparent 60%), radial-gradient(1100px 760px at 10% 92%, rgba(15,118,110,.28), transparent 60%), linear-gradient(150deg, #050d1c 0%, #0b1526 55%, #071f1d 100%)"
          : "radial-gradient(1100px 720px at 84% 8%, rgba(37,99,235,.08), transparent 58%), radial-gradient(900px 680px at 4% 98%, rgba(15,118,110,.08), transparent 55%), linear-gradient(150deg, #ffffff 0%, #f7fafc 60%, #f0f8f7 100%)",
      }}
    >
      {dark &&
        Array.from({ length: 16 }).map((_, i) => {
          const x = (i * 137.5) % 100;
          const y = (i * 71.3) % 100;
          const drift = Math.sin(frame / (34 + (i % 5) * 7) + i * 1.7);
          const size = 4 + (i % 3) * 3;
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y + drift * 3}%`,
                width: size,
                height: size,
                borderRadius: size,
                background: i % 2 ? "rgba(45,212,191,.5)" : "rgba(96,165,250,.45)",
                opacity: 0.08 + 0.1 * (i % 3),
                filter: "blur(1px)",
              }}
            />
          );
        })}
      {children}
    </AbsoluteFill>
  );
};

const Brand: React.FC<{ dark?: boolean }> = ({ dark = false }) => (
  <Reveal delay={4} from={-18} style={{ position: "absolute", top: 60, left: 84, width: 296 }}>
    <Img
      src={dark ? logoDarkUrl : logoLightUrl}
      style={{ width: "100%", height: "auto" }}
    />
  </Reveal>
);

const Kicker: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({
  children,
  dark = false,
}) => {
  const grow = useProgress(6, 26);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        color: dark ? "#5eead4" : colors.teal,
        fontSize: 23,
        fontWeight: 800,
        letterSpacing: 5,
        textTransform: "uppercase",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          width: 34 * grow,
          height: 3,
          borderRadius: 3,
          background: dark ? colors.tealBright : colors.blue,
        }}
      />
      {children}
    </div>
  );
};

const Title: React.FC<{
  children: React.ReactNode;
  dark?: boolean;
  max?: number;
  size?: number;
  center?: boolean;
}> = ({ children, dark = false, max = 900, size = 100, center = false }) => (
  <h1
    style={{
      margin: "30px 0 0",
      maxWidth: max,
      marginLeft: center ? "auto" : undefined,
      marginRight: center ? "auto" : undefined,
      color: dark ? "#ffffff" : colors.ink,
      fontSize: size,
      lineHeight: 1.02,
      fontWeight: 850,
      letterSpacing: -2.5,
    }}
  >
    {children}
  </h1>
);

const Accent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const shift = (frame * 0.9) % 200;
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(110deg, ${colors.blue}, ${colors.tealBright}, ${colors.blue})`,
        backgroundSize: "220% 100%",
        backgroundPosition: `${shift}% 50%`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      {children}
    </span>
  );
};

const Copy: React.FC<{ children: React.ReactNode; dark?: boolean; max?: number }> = ({
  children,
  dark = false,
  max = 700,
}) => (
  <p
    style={{
      margin: "28px 0 0",
      maxWidth: max,
      color: dark ? "#b6c6e3" : colors.slate,
      fontSize: 32,
      lineHeight: 1.36,
      fontWeight: 550,
    }}
  >
    {children}
  </p>
);

const Panel: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
  dark?: boolean;
}> = ({ children, style, dark = false }) => (
  <div
    style={{
      borderRadius: 24,
      border: `1px solid ${dark ? "rgba(255,255,255,.12)" : "rgba(226,232,240,.9)"}`,
      background: dark ? "rgba(10,18,34,.78)" : "rgba(255,255,255,.97)",
      boxShadow: dark
        ? "0 50px 130px rgba(0,0,0,.44)"
        : "0 50px 130px rgba(15,23,42,.13)",
      ...style,
    }}
  >
    {children}
  </div>
);

const ClaraAvatar: React.FC<{ size?: number }> = ({ size = 52 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 999,
      flexShrink: 0,
      display: "grid",
      placeItems: "center",
      background: `linear-gradient(135deg, ${colors.blue}, ${colors.teal})`,
      color: "#ffffff",
      fontSize: size * 0.44,
      fontWeight: 850,
      boxShadow: "0 12px 30px rgba(37,99,235,.35)",
    }}
  >
    C
  </div>
);

const PersonAvatar: React.FC<{ initials: string; hue: string; size?: number }> = ({
  initials,
  hue,
  size = 48,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: 999,
      flexShrink: 0,
      display: "grid",
      placeItems: "center",
      background: hue,
      color: "#ffffff",
      fontSize: size * 0.36,
      fontWeight: 800,
      letterSpacing: 0.5,
    }}
  >
    {initials}
  </div>
);

const Waveform: React.FC<{
  bars?: number;
  height?: number;
  color?: string;
  active?: number;
}> = ({ bars = 40, height = 80, color = colors.tealBright, active = 1 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, height }}>
      {Array.from({ length: bars }).map((_, i) => {
        const wave =
          Math.sin(frame / 3.1 + i * 0.9) * 0.5 +
          Math.sin(frame / 5.7 + i * 1.7) * 0.35 +
          0.5;
        const h = Math.max(0.1, Math.min(1, wave)) * height * active + 8;
        return (
          <span
            key={i}
            style={{
              width: 7,
              height: h,
              borderRadius: 7,
              background: color,
              opacity: 0.35 + Math.min(1, wave) * 0.65,
            }}
          />
        );
      })}
    </div>
  );
};

const CountUp: React.FC<{
  to: number;
  start: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}> = ({ to, start, duration = 44, prefix = "", suffix = "", decimals = 0 }) => {
  const progress = useProgress(start, duration);
  return (
    <>
      {prefix}
      {(to * progress).toFixed(decimals)}
      {suffix}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 1 — Meet Clara                                                */
/* ------------------------------------------------------------------ */

const SceneOpen = () => {
  const frame = useCurrentFrame();
  const orbit = frame * 0.9;
  const breathe = 1 + Math.sin(frame / 7) * 0.02;
  return (
    <Scene dark duration={150}>
      <Brand dark />
      <div style={{ position: "absolute", left: 100, top: 330, width: 960 }}>
        <Reveal delay={8}>
          <Kicker dark>AI agent for live chat &amp; phone calls</Kicker>
        </Reveal>
        <Reveal delay={20}>
          <Title dark max={900} size={148}>
            Meet <Accent>Clara.</Accent>
          </Title>
        </Reveal>
        <Reveal delay={38}>
          <Copy dark max={680}>
            Every chat and every call — answered in seconds, day and night.
          </Copy>
        </Reveal>
      </div>

      <div
        style={{
          position: "absolute",
          right: 200,
          top: 260,
          width: 560,
          height: 560,
          display: "grid",
          placeItems: "center",
        }}
      >
        {[300, 420, 540].map((d, i) => (
          <div
            key={d}
            style={{
              position: "absolute",
              width: d,
              height: d,
              borderRadius: d,
              border: `1.6px solid rgba(45,212,191,${0.32 - i * 0.08})`,
              transform: `rotate(${orbit * (i % 2 === 0 ? 1 : -0.7)}deg)`,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: -7,
                left: "50%",
                width: 14,
                height: 14,
                borderRadius: 14,
                background: i === 1 ? colors.blue : colors.tealBright,
                boxShadow: `0 0 22px ${i === 1 ? colors.blue : colors.tealBright}`,
              }}
            />
          </div>
        ))}
        <Reveal delay={14} from={0}>
          <div
            style={{
              width: 250,
              height: 250,
              borderRadius: 250,
              display: "grid",
              placeItems: "center",
              transform: `scale(${breathe})`,
              background: `linear-gradient(135deg, ${colors.blue}, ${colors.teal})`,
              boxShadow: "0 0 130px rgba(37,99,235,.55), 0 0 60px rgba(45,212,191,.4)",
              color: "#ffffff",
              fontSize: 112,
              fontWeight: 850,
            }}
          >
            C
          </div>
        </Reveal>
        <div style={{ position: "absolute", bottom: -30 }}>
          <Waveform bars={20} height={50} active={0.8} />
        </div>
      </div>
    </Scene>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 2 — The problem                                               */
/* ------------------------------------------------------------------ */

const SceneProblem = () => (
  <Scene dark duration={125}>
    <Brand dark />
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        padding: "0 160px",
      }}
    >
      <div>
        <Reveal delay={8}>
          <Title dark max={1400} size={116} center>
            Your customers <Accent>won&rsquo;t wait.</Accent>
          </Title>
        </Reveal>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 130,
            marginTop: 96,
          }}
        >
          {[
            ["11 min", "average hold time", 34],
            ["62%", "of chats abandoned", 46],
            ["1 in 3", "leads arrive after hours", 58],
          ].map(([value, label, delay]) => {
            const pop = usePop(delay as number);
            return (
              <div
                key={label as string}
                style={{
                  opacity: interpolate(pop, [0, 0.4], [0, 1], {
                    extrapolateRight: "clamp",
                  }),
                  transform: `scale(${interpolate(pop, [0, 1], [0.78, 1])})`,
                }}
              >
                <strong
                  style={{
                    display: "block",
                    color: "#fda4af",
                    fontSize: 96,
                    lineHeight: 1,
                    fontWeight: 850,
                    letterSpacing: -3,
                  }}
                >
                  {value}
                </strong>
                <span
                  style={{
                    display: "block",
                    marginTop: 18,
                    color: "#94a3b8",
                    fontSize: 26,
                    fontWeight: 650,
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </Scene>
);

/* ------------------------------------------------------------------ */
/* Scene 3 — Live chat                                                 */
/* ------------------------------------------------------------------ */

const TypingDots: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        borderRadius: "6px 20px 20px 20px",
        background: "#f1f5f9",
        padding: "22px 26px",
        display: "flex",
        gap: 9,
        alignItems: "center",
      }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 11,
            height: 11,
            borderRadius: 11,
            background: "#94a3b8",
            transform: `translateY(${Math.sin(frame / 2.6 - i * 0.9) * 4}px)`,
          }}
        />
      ))}
    </div>
  );
};

const ChatBubble: React.FC<{
  from: "customer" | "clara";
  text: string;
  delay: number;
  typingFrom?: number;
}> = ({ from, text, delay, typingFrom }) => {
  const frame = useCurrentFrame();
  const progress = useProgress(delay, 18);
  const isClara = from === "clara";
  const showTyping =
    isClara && typingFrom !== undefined && frame >= typingFrom && frame < delay;

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        justifyContent: isClara ? "flex-start" : "flex-end",
        alignItems: "flex-end",
        opacity: showTyping
          ? interpolate(frame, [typingFrom!, typingFrom! + 8], [0, 1], {
              extrapolateRight: "clamp",
            })
          : progress,
        transform: showTyping
          ? undefined
          : `translateY(${interpolate(progress, [0, 1], [16, 0])}px) scale(${interpolate(
              progress,
              [0, 1],
              [0.96, 1],
            )})`,
      }}
    >
      {isClara && <ClaraAvatar size={48} />}
      {showTyping ? (
        <TypingDots />
      ) : (
        <div
          style={{
            maxWidth: 520,
            borderRadius: isClara ? "6px 20px 20px 20px" : "20px 6px 20px 20px",
            background: isClara
              ? "#f1f5f9"
              : `linear-gradient(130deg, ${colors.blue}, ${colors.blueDark})`,
            color: isClara ? colors.ink : "#ffffff",
            padding: "20px 24px",
            fontSize: 25,
            lineHeight: 1.34,
            fontWeight: 600,
          }}
        >
          {text}
        </div>
      )}
      {!isClara && !showTyping && (
        <PersonAvatar initials="SW" hue="linear-gradient(135deg, #f59e0b, #d97706)" />
      )}
    </div>
  );
};

const SceneChat = () => (
  <Scene duration={170}>
    <Brand />
    <div style={{ position: "absolute", left: 100, top: 330, width: 640 }}>
      <Reveal delay={8}>
        <Kicker>Live chat</Kicker>
        <Title max={620} size={98}>
          First reply in <Accent>0.8s.</Accent>
        </Title>
        <Copy max={560}>
          Clara answers instantly, and turns browsing visitors into booked business.
        </Copy>
      </Reveal>
    </div>

    <SlideIn delay={12} style={{ position: "absolute", right: 110, top: 190, width: 740 }}>
      <Panel style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "24px 30px",
            borderBottom: `1px solid ${colors.line}`,
          }}
        >
          <ClaraAvatar size={54} />
          <div style={{ flex: 1 }}>
            <strong style={{ display: "block", color: colors.ink, fontSize: 26 }}>Clara</strong>
            <span style={{ color: "#15803d", fontSize: 19, fontWeight: 700 }}>● Online</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <PersonAvatar initials="SW" hue="linear-gradient(135deg, #f59e0b, #d97706)" size={44} />
            <span style={{ color: colors.muted, fontSize: 21, fontWeight: 650 }}>Sarah Whitmore</span>
          </div>
        </div>
        <div style={{ display: "grid", gap: 20, padding: 34, minHeight: 480 }}>
          <ChatBubble from="customer" delay={24} text="Hi — how much is a check-up? Anything free this week?" />
          <ChatBubble
            from="clara"
            delay={58}
            typingFrom={34}
            text="A check-up is £49. I have Thursday 2:15 pm or Friday 10:00 am — shall I hold one for you?"
          />
          <ChatBubble from="customer" delay={90} text="Thursday works. It’s Sarah — 07700 900123." />
          <ChatBubble
            from="clara"
            delay={118}
            typingFrom={98}
            text="Booked — Thursday 2:15 pm. Confirmation is on its way. ✓"
          />
        </div>
      </Panel>
    </SlideIn>
  </Scene>
);

/* ------------------------------------------------------------------ */
/* Scene 4 — Phone calls                                               */
/* ------------------------------------------------------------------ */

const ScenePhone = () => {
  const frame = useCurrentFrame();
  const callSeconds = Math.max(0, Math.floor((frame - 14) / 30));
  const timer = `0:${String(callSeconds).padStart(2, "0")}`;
  const livePulse = 0.55 + 0.45 * Math.abs(Math.sin(frame / 8));
  return (
    <Scene dark duration={160}>
      <Brand dark />
      <div style={{ position: "absolute", left: 100, top: 330, width: 640 }}>
        <Reveal delay={8}>
          <Kicker dark>Phone calls</Kicker>
          <Title dark max={620} size={98}>
            Answered on the <Accent>first ring.</Accent>
          </Title>
          <Copy dark max={560}>
            A natural voice, zero hold time — even at 8:47 pm on a Sunday.
          </Copy>
        </Reveal>
      </div>

      <SlideIn delay={12} style={{ position: "absolute", right: 110, top: 250, width: 740 }}>
        <Panel dark style={{ padding: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <ClaraAvatar size={62} />
            <div style={{ flex: 1 }}>
              <strong style={{ display: "block", color: "#ffffff", fontSize: 28 }}>
                Incoming call
              </strong>
              <span style={{ color: "#5eead4", fontSize: 20, fontWeight: 700 }}>
                Clara answered · {timer}
              </span>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                color: "#86efac",
                fontSize: 20,
                fontWeight: 850,
                letterSpacing: 2,
              }}
            >
              <span
                style={{
                  width: 11,
                  height: 11,
                  borderRadius: 11,
                  background: "#4ade80",
                  opacity: livePulse,
                  boxShadow: `0 0 ${10 * livePulse}px #4ade80`,
                }}
              />
              LIVE
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "center", padding: "44px 0" }}>
            <Waveform bars={42} height={110} />
          </div>

          <Reveal delay={40} from={20}>
            <p
              style={{
                margin: 0,
                color: "#e2e8f0",
                fontSize: 27,
                lineHeight: 1.4,
                fontWeight: 550,
                textAlign: "center",
              }}
            >
              “Of course — I can move that to Saturday 9:30 am.
              <br />
              I’ve texted you the confirmation.”
            </p>
          </Reveal>
        </Panel>
      </SlideIn>
    </Scene>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 5 — Dashboard                                                 */
/* ------------------------------------------------------------------ */

const conversations = [
  {
    initials: "SW",
    hue: "linear-gradient(135deg, #f59e0b, #d97706)",
    name: "Sarah Whitmore",
    snippet: "Check-up booked — Thursday 2:15 pm",
    status: "Booked",
    dot: "#15803d",
    delay: 38,
  },
  {
    initials: "JO",
    hue: "linear-gradient(135deg, #6366f1, #4f46e5)",
    name: "James O’Neill",
    snippet: "Pricing question answered in chat",
    status: "Resolved",
    dot: "#0f766e",
    delay: 52,
  },
  {
    initials: "MK",
    hue: "linear-gradient(135deg, #10b981, #059669)",
    name: "Marcus Kane",
    snippet: "Call — rescheduled to Saturday 9:30 am",
    status: "Resolved",
    dot: "#0f766e",
    delay: 66,
  },
  {
    initials: "PP",
    hue: "linear-gradient(135deg, #f43f5e, #e11d48)",
    name: "Priya Patel",
    snippet: "Urgent request — handed to your team",
    status: "With team",
    dot: "#b45309",
    delay: 80,
  },
];

const SceneDashboard = () => (
  <Scene duration={160}>
    <Brand />
    <div style={{ position: "absolute", left: 100, top: 330, width: 620 }}>
      <Reveal delay={8}>
        <Kicker>Dashboard</Kicker>
        <Title max={600} size={92}>
          Every conversation, <Accent>one view.</Accent>
        </Title>
        <Copy max={540}>
          Watch Clara work in real time — and see exactly what she handled.
        </Copy>
      </Reveal>
    </div>

    <SlideIn delay={12} style={{ position: "absolute", right: 110, top: 180, width: 780 }}>
      <Panel style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "26px 34px",
            borderBottom: `1px solid ${colors.line}`,
          }}
        >
          <strong style={{ color: colors.ink, fontSize: 27 }}>Live conversations</strong>
          <span style={{ color: "#15803d", fontSize: 20, fontWeight: 750 }}>● Clara is live</span>
        </div>
        <div
          style={{
            display: "flex",
            gap: 56,
            padding: "26px 34px 6px",
          }}
        >
          {[
            ["28", "today", 22],
            ["24", "handled by Clara", 30],
            ["9", "booked", 38],
          ].map(([value, label, delay]) => {
            const pop = usePop(delay as number);
            return (
              <div
                key={label as string}
                style={{
                  opacity: interpolate(pop, [0, 0.4], [0, 1], {
                    extrapolateRight: "clamp",
                  }),
                  transform: `scale(${interpolate(pop, [0, 1], [0.8, 1])})`,
                  transformOrigin: "left bottom",
                }}
              >
                <strong
                  style={{
                    display: "block",
                    color: colors.ink,
                    fontSize: 44,
                    lineHeight: 1,
                    fontWeight: 850,
                    letterSpacing: -1,
                  }}
                >
                  {value}
                </strong>
                <span style={{ display: "block", marginTop: 6, color: colors.muted, fontSize: 19, fontWeight: 650 }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <div style={{ display: "grid", gap: 6, padding: "20px 16px 24px" }}>
          {conversations.map(({ initials, hue, name, snippet, status, dot, delay }) => {
            const progress = useProgress(delay, 22);
            return (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  borderRadius: 16,
                  padding: "18px 20px",
                  opacity: progress,
                  transform: `translateX(${interpolate(progress, [0, 1], [46, 0])}px)`,
                }}
              >
                <PersonAvatar initials={initials} hue={hue} size={52} />
                <div style={{ flex: 1 }}>
                  <strong style={{ display: "block", color: colors.ink, fontSize: 24 }}>{name}</strong>
                  <span style={{ display: "block", marginTop: 4, color: colors.muted, fontSize: 20, fontWeight: 600 }}>
                    {snippet}
                  </span>
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    color: dot,
                    fontSize: 20,
                    fontWeight: 750,
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: 10, background: dot }} />
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>
    </SlideIn>
  </Scene>
);

/* ------------------------------------------------------------------ */
/* Scene 6 — Results                                                   */
/* ------------------------------------------------------------------ */

const SceneResults = () => (
  <Scene duration={135}>
    <Brand />
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
      }}
    >
      <div>
        <Reveal delay={8}>
          <Title max={1500} size={104} center>
            Sell more. <Accent>Wait less.</Accent>
          </Title>
        </Reveal>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 140,
            marginTop: 110,
          }}
        >
          {[
            {
              value: <CountUp to={32} start={36} prefix="+" suffix="%" />,
              label: "sales productivity",
              color: colors.blue,
              delay: 36,
            },
            {
              value: <CountUp to={85} start={48} prefix="−" suffix="%" />,
              label: "customer wait time",
              color: colors.teal,
              delay: 48,
            },
            {
              value: "24/7",
              label: "always available",
              color: colors.blueDark,
              delay: 60,
            },
          ].map(({ value, label, color, delay }) => {
            const pop = usePop(delay);
            return (
              <div
                key={label}
                style={{
                  opacity: interpolate(pop, [0, 0.4], [0, 1], {
                    extrapolateRight: "clamp",
                  }),
                  transform: `scale(${interpolate(pop, [0, 1], [0.78, 1])})`,
                }}
              >
                <strong
                  style={{
                    display: "block",
                    color,
                    fontSize: 132,
                    lineHeight: 1,
                    fontWeight: 850,
                    letterSpacing: -4,
                  }}
                >
                  {value}
                </strong>
                <span
                  style={{
                    display: "block",
                    marginTop: 20,
                    color: colors.muted,
                    fontSize: 28,
                    fontWeight: 650,
                  }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </Scene>
);

/* ------------------------------------------------------------------ */
/* Scene 7 — Human handoff                                             */
/* ------------------------------------------------------------------ */

const SceneHandoff = () => {
  const frame = useCurrentFrame();
  const flow = useProgress(46, 40);
  const pulseX = frame > 92 ? ((frame - 92) * 3.4) % 244 : -30;
  return (
    <Scene duration={125}>
      <Brand />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          textAlign: "center",
        }}
      >
        <div>
          <Reveal delay={8}>
            <Title max={1200} size={96} center>
              And when it matters,
              <br />
              <Accent>your team takes over.</Accent>
            </Title>
          </Reveal>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 36,
              marginTop: 100,
            }}
          >
            <ClaraAvatar size={96} />
            <div
              style={{
                position: "relative",
                width: 220,
                height: 5,
                borderRadius: 5,
                background: colors.line,
              }}
            >
              <div
                style={{
                  width: `${flow * 100}%`,
                  height: "100%",
                  borderRadius: 5,
                  background: `linear-gradient(90deg, ${colors.blue}, ${colors.tealBright})`,
                }}
              />
              {frame > 92 && (
                <span
                  style={{
                    position: "absolute",
                    left: pulseX - 7,
                    top: -5,
                    width: 15,
                    height: 15,
                    borderRadius: 15,
                    background: colors.tealBright,
                    boxShadow: `0 0 18px ${colors.tealBright}`,
                  }}
                />
              )}
            </div>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 96,
                display: "grid",
                placeItems: "center",
                background: "#ffffff",
                border: `2px solid ${colors.line}`,
                boxShadow: "0 20px 50px rgba(15,23,42,.12)",
                fontSize: 44,
                opacity: 0.35 + flow * 0.65,
                transform: `scale(${0.92 + flow * 0.08})`,
              }}
            >
              👤
            </div>
          </div>
          <Reveal delay={70}>
            <p
              style={{
                margin: "56px 0 0",
                color: colors.muted,
                fontSize: 29,
                fontWeight: 600,
              }}
            >
              Handed off instantly — with the full story attached.
            </p>
          </Reveal>
        </div>
      </div>
    </Scene>
  );
};

/* ------------------------------------------------------------------ */
/* Scene 8 — Close                                                     */
/* ------------------------------------------------------------------ */

const SceneClose = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 9) * 0.014;
  const glow = 0.32 + 0.16 * Math.abs(Math.sin(frame / 9));
  return (
    <Scene dark duration={125}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          padding: 120,
        }}
      >
        <div>
          <Reveal delay={10} from={24}>
            <Img src={logoDarkUrl} style={{ width: 470, height: "auto" }} />
          </Reveal>
          <Reveal delay={26}>
            <Title dark max={1300} size={104} center>
              Every lead <Accent>captured.</Accent>
            </Title>
          </Reveal>
          <Reveal delay={46} style={{ marginTop: 56, display: "flex", justifyContent: "center" }}>
            <div
              style={{
                borderRadius: 16,
                background: `linear-gradient(120deg, ${colors.blue}, ${colors.teal})`,
                color: "#ffffff",
                padding: "24px 46px",
                fontSize: 31,
                fontWeight: 850,
                transform: `scale(${pulse})`,
                boxShadow: `0 24px 70px rgba(37,99,235,${glow})`,
              }}
            >
              See Clara live — book a demo
            </div>
          </Reveal>
        </div>
      </div>
    </Scene>
  );
};

/* ------------------------------------------------------------------ */

export const RelayClarityLaunchVideo: React.FC = () => (
  <AbsoluteFill style={{ ...base, background: "#050d1c" }}>
    <Sequence from={0} durationInFrames={150}>
      <SceneOpen />
    </Sequence>
    <Sequence from={150} durationInFrames={125}>
      <SceneProblem />
    </Sequence>
    <Sequence from={275} durationInFrames={170}>
      <SceneChat />
    </Sequence>
    <Sequence from={445} durationInFrames={160}>
      <ScenePhone />
    </Sequence>
    <Sequence from={605} durationInFrames={160}>
      <SceneDashboard />
    </Sequence>
    <Sequence from={765} durationInFrames={135}>
      <SceneResults />
    </Sequence>
    <Sequence from={900} durationInFrames={125}>
      <SceneHandoff />
    </Sequence>
    <Sequence from={1025} durationInFrames={125}>
      <SceneClose />
    </Sequence>
  </AbsoluteFill>
);
