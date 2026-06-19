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
import relayclarityLogoUrl from "../../assets/relayclarity-logo.svg";

const colors = {
  ink: "#101412",
  text: "#34413a",
  muted: "#6e7871",
  blue: "#2458d6",
  blueSoft: "#e8eefc",
  green: "#1d7c63",
  cyan: "#1aa6a3",
  amber: "#b86f19",
  cream: "#fbfaf7",
  line: "#dedbd0",
};

const ease = Easing.bezier(0.22, 1, 0.36, 1);

const base: React.CSSProperties = {
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const useSceneProgress = (start: number, duration: number) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
};

const FadeSlide: React.FC<{
  delay?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 105, mass: 0.8 },
  });
  const exit = interpolate(frame, [820, 890], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity: entrance * exit,
        transform: `translateY(${interpolate(entrance, [0, 1], [36, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Shell: React.FC<{ children: React.ReactNode; tone?: "light" | "dark" }> = ({
  children,
  tone = "light",
}) => (
  <AbsoluteFill
    style={{
      ...base,
      overflow: "hidden",
      background:
        tone === "dark"
          ? "linear-gradient(135deg, #07100d 0%, #101d18 48%, #07100d 100%)"
          : "linear-gradient(135deg, #f7fbf9 0%, #fbfaf7 46%, #eef4ff 100%)",
      color: tone === "dark" ? "#ffffff" : colors.ink,
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: tone === "dark" ? 0.16 : 0.26,
        backgroundImage:
          "linear-gradient(rgba(36,88,214,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(36,88,214,.16) 1px, transparent 1px)",
        backgroundSize: "86px 86px",
      }}
    />
    <div
      style={{
        position: "absolute",
        top: -260,
        right: -220,
        width: 620,
        height: 620,
        borderRadius: 999,
        background: tone === "dark" ? "rgba(26,166,163,.18)" : "rgba(36,88,214,.13)",
        filter: "blur(8px)",
      }}
    />
    <div
      style={{
        position: "absolute",
        bottom: -300,
        left: -260,
        width: 660,
        height: 660,
        borderRadius: 999,
        background: tone === "dark" ? "rgba(36,88,214,.2)" : "rgba(29,124,99,.14)",
      }}
    />
    {children}
  </AbsoluteFill>
);

const Brand: React.FC<{ dark?: boolean }> = ({ dark = false }) => (
  <div
    style={{
      position: "absolute",
      top: 66,
      left: 82,
      display: "flex",
      alignItems: "center",
      gap: 18,
    }}
  >
    {dark ? (
      <>
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: 16,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg, #111c34, #071124)",
            boxShadow: "0 10px 28px rgba(0,0,0,.28)",
          }}
        >
          <span style={{ color: "#ffffff", fontSize: 30, fontWeight: 950, lineHeight: 1 }}>C</span>
        </div>
        <div>
          <strong
            style={{
              display: "block",
              color: "#ffffff",
              fontSize: 35,
              lineHeight: 0.95,
              fontWeight: 880,
            }}
          >
            Relay<span style={{ color: "#6ee7f9" }}>Clarity</span>
          </strong>
          <span style={{ display: "block", marginTop: 7, color: "#d8e6df", fontSize: 16, fontWeight: 760 }}>
            Voice agent deployment platform
          </span>
        </div>
      </>
    ) : (
      <div
        style={{
          width: 300,
          height: 58,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Img src={relayclarityLogoUrl} style={{ width: "100%", height: "auto" }} />
      </div>
    )}
  </div>
);

const Kicker: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({
  children,
  dark = false,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      width: "fit-content",
      minHeight: 42,
      borderRadius: 999,
      border: `1px solid ${dark ? "rgba(255,255,255,.22)" : "rgba(36,88,214,.22)"}`,
      background: dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.72)",
      color: dark ? "#b9f4ed" : colors.green,
      fontSize: 24,
      fontWeight: 900,
      padding: "0 18px",
      letterSpacing: 0,
    }}
  >
    {children}
  </div>
);

const BigTitle: React.FC<{ children: React.ReactNode; dark?: boolean; max?: number }> = ({
  children,
  dark = false,
  max = 900,
}) => (
  <h1
    style={{
      margin: "28px 0 0",
      maxWidth: max,
      color: dark ? "#ffffff" : colors.ink,
      fontSize: 104,
      lineHeight: 0.93,
      fontWeight: 860,
      letterSpacing: 0,
    }}
  >
    {children}
  </h1>
);

const BodyText: React.FC<{ children: React.ReactNode; dark?: boolean; max?: number }> = ({
  children,
  dark = false,
  max = 760,
}) => (
  <p
    style={{
      margin: "30px 0 0",
      maxWidth: max,
      color: dark ? "#d8e6df" : colors.text,
      fontSize: 36,
      lineHeight: 1.26,
      fontWeight: 650,
    }}
  >
    {children}
  </p>
);

const MessyCard: React.FC<{ index: number; title: string; detail: string; x: number; y: number }> = ({
  index,
  title,
  detail,
  x,
  y,
}) => {
  const progress = useSceneProgress(20 + index * 10, 36);
  const rotate = [-5, 3, -2][index] ?? 0;

  return (
    <div
      style={{
        position: "absolute",
        right: x,
        top: y,
        width: 500,
        minHeight: 170,
        borderRadius: 8,
        border: "1px solid rgba(222,219,208,.9)",
        background: "rgba(255,255,255,.92)",
        boxShadow: "0 26px 70px rgba(16,20,18,.14)",
        padding: 30,
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [60, 0])}px) rotate(${rotate}deg)`,
      }}
    >
      <div style={{ color: colors.amber, fontSize: 22, fontWeight: 900 }}>Unclear</div>
      <strong
        style={{
          display: "block",
          marginTop: 10,
          color: colors.ink,
          fontSize: 34,
          lineHeight: 1.05,
        }}
      >
        {title}
      </strong>
      <p style={{ margin: "12px 0 0", color: colors.muted, fontSize: 24, lineHeight: 1.3 }}>
        {detail}
      </p>
    </div>
  );
};

const CheckRow: React.FC<{ label: string; detail: string; delay: number }> = ({
  label,
  detail,
  delay,
}) => {
  const progress = useSceneProgress(delay, 28);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "54px 1fr auto",
        alignItems: "center",
        gap: 18,
        minHeight: 104,
        borderRadius: 8,
        border: "1px solid rgba(222,219,208,.85)",
        background: "#ffffff",
        padding: "18px 22px",
        opacity: progress,
        transform: `translateX(${interpolate(progress, [0, 1], [36, 0])}px)`,
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          background: colors.green,
          color: "#ffffff",
          fontSize: 30,
          fontWeight: 900,
        }}
      >
        ✓
      </div>
      <div>
        <strong style={{ display: "block", color: colors.ink, fontSize: 30 }}>{label}</strong>
        <span style={{ display: "block", marginTop: 4, color: colors.muted, fontSize: 22 }}>
          {detail}
        </span>
      </div>
      <span
        style={{
          borderRadius: 999,
          background: colors.blueSoft,
          color: colors.blue,
          fontSize: 20,
          fontWeight: 900,
          padding: "9px 13px",
        }}
      >
        Passed
      </span>
    </div>
  );
};

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
  const progress = useSceneProgress(35, 70);
  const animatedScore = Math.round(interpolate(progress, [0, 1], [41, score]));

  return (
    <div
      style={{
        width: 360,
        height: 360,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: `radial-gradient(circle at center, #ffffff 0 57%, transparent 58%), conic-gradient(${colors.green} 0 ${animatedScore}%, #e6e4dc ${animatedScore}% 100%)`,
        boxShadow: "0 34px 100px rgba(29,124,99,.16)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <strong
          style={{
            display: "block",
            color: colors.ink,
            fontSize: 96,
            lineHeight: 0.88,
            fontWeight: 760,
          }}
        >
          {animatedScore}%
        </strong>
        <span style={{ color: colors.muted, fontSize: 26, fontWeight: 900 }}>ready</span>
      </div>
    </div>
  );
};

const SceneProblem: React.FC = () => (
  <Shell>
    <Brand />
    <div style={{ position: "absolute", left: 110, top: 240 }}>
      <FadeSlide delay={8}>
        <Kicker>Before launch</Kicker>
        <BigTitle max={850}>Is this AI agent actually ready?</BigTitle>
        <BodyText>
          Demos can look good while risks, handoffs, and missing answers stay hidden.
        </BodyText>
      </FadeSlide>
    </div>
    <MessyCard
      index={0}
      title="Can it answer safely?"
      detail="Some support replies still need approved policy sources."
      x={170}
      y={245}
    />
    <MessyCard
      index={1}
      title="Will humans get context?"
      detail="Transfers need a useful summary, not a cold handoff."
      x={110}
      y={465}
    />
    <MessyCard
      index={2}
      title="Who approves launch?"
      detail="Teams need one clear decision, not a scattered checklist."
      x={220}
      y={680}
    />
  </Shell>
);

const SceneChecks: React.FC = () => (
  <Shell tone="dark">
    <Brand dark />
    <div style={{ position: "absolute", left: 110, top: 225 }}>
      <FadeSlide delay={8}>
        <Kicker dark>RelayClarity checks the real workflow</Kicker>
        <BigTitle dark max={820}>Test the agent like it is already live.</BigTitle>
      </FadeSlide>
    </div>
    <div
      style={{
        position: "absolute",
        right: 110,
        top: 210,
        width: 690,
        display: "grid",
        gap: 16,
      }}
    >
      <CheckRow label="Approved answers" detail="Matches support policy and knowledge base" delay={30} />
      <CheckRow label="Caller identity" detail="Confirms the caller before sensitive details" delay={58} />
      <CheckRow label="Risk handling" detail="Flags edge cases and uncertain answers" delay={86} />
      <CheckRow label="Warm transfer" detail="Sends the human team a clear call summary" delay={114} />
    </div>
  </Shell>
);

const SceneReview: React.FC = () => (
  <Shell>
    <Brand />
    <div style={{ position: "absolute", left: 110, top: 214 }}>
      <FadeSlide delay={8}>
        <Kicker>Launch review</Kicker>
        <BigTitle max={760}>One clean answer for the whole team.</BigTitle>
        <BodyText max={650}>
          See what passed, what needs work, and the next step before customers hear the agent.
        </BodyText>
      </FadeSlide>
    </div>
    <div
      style={{
        position: "absolute",
        right: 110,
        top: 185,
        width: 740,
        borderRadius: 12,
        border: "1px solid rgba(222,219,208,.9)",
        background: "#ffffff",
        boxShadow: "0 34px 100px rgba(16,20,18,.16)",
        padding: 34,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
        <div>
          <span style={{ color: colors.muted, fontSize: 22, fontWeight: 900 }}>Northstar Health Support</span>
          <strong
            style={{
              display: "block",
              marginTop: 6,
              color: colors.ink,
              fontSize: 42,
              lineHeight: 1,
            }}
          >
            Almost ready
          </strong>
        </div>
        <span
          style={{
            alignSelf: "flex-start",
            borderRadius: 999,
            background: "#fff7e8",
            color: "#8f520e",
            fontSize: 22,
            fontWeight: 900,
            padding: "12px 18px",
          }}
        >
          1 task left
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 32, alignItems: "center", marginTop: 42 }}>
        <ScoreRing score={88} />
        <div style={{ display: "grid", gap: 16 }}>
          {[
            ["Passed", "Caller checks work"],
            ["Passed", "Human handoff is ready"],
            ["Needs work", "Add missing policy links"],
          ].map(([status, label]) => (
            <div
              key={label}
              style={{
                borderRadius: 8,
                border: "1px solid rgba(222,219,208,.85)",
                background: status === "Needs work" ? "#fffaf0" : "#fbfaf7",
                padding: "18px 20px",
              }}
            >
              <span
                style={{
                  display: "block",
                  color: status === "Needs work" ? colors.amber : colors.green,
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                {status}
              </span>
              <strong style={{ display: "block", marginTop: 5, color: colors.ink, fontSize: 27 }}>
                {label}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  </Shell>
);

const SceneFinal: React.FC = () => (
  <Shell tone="dark">
    <Brand dark />
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
      <FadeSlide delay={8}>
        <Kicker dark>RelayClarity</Kicker>
        <h1
          style={{
            margin: "32px auto 0",
            maxWidth: 1200,
            color: "#ffffff",
            fontSize: 120,
            lineHeight: 0.92,
            fontWeight: 880,
            letterSpacing: 0,
          }}
        >
          Launch AI voice agents with proof, not guesswork.
        </h1>
        <p
          style={{
            margin: "36px auto 0",
            maxWidth: 900,
            color: "#d8e6df",
            fontSize: 40,
            lineHeight: 1.24,
            fontWeight: 650,
          }}
        >
          Build. Test. Approve. Go live with confidence.
        </p>
      </FadeSlide>
    </div>
  </Shell>
);

export const RelayClarityLaunchVideo: React.FC = () => {
  return (
    <AbsoluteFill style={base}>
      <Sequence from={0} durationInFrames={180}>
        <SceneProblem />
      </Sequence>
      <Sequence from={180} durationInFrames={180}>
        <SceneChecks />
      </Sequence>
      <Sequence from={360} durationInFrames={240}>
        <SceneReview />
      </Sequence>
      <Sequence from={600} durationInFrames={300}>
        <SceneFinal />
      </Sequence>
    </AbsoluteFill>
  );
};
