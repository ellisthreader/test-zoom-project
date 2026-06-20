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
  ink: "#0f172a",
  slate: "#334155",
  muted: "#64748b",
  line: "#d8e0ea",
  surface: "#ffffff",
  soft: "#f6f8fb",
  blue: "#2563eb",
  blueDark: "#1d4ed8",
  teal: "#0f766e",
  tealSoft: "#ccfbf1",
  amber: "#b45309",
  amberSoft: "#ffedd5",
  red: "#b91c1c",
  redSoft: "#fee2e2",
  green: "#15803d",
  greenSoft: "#dcfce7",
};

const ease = Easing.bezier(0.22, 1, 0.36, 1);

const base: React.CSSProperties = {
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const useProgress = (start = 0, duration = 34) => {
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
    config: { damping: 19, stiffness: 112, mass: 0.82 },
  });
};

const Reveal: React.FC<{
  delay?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, children, style }) => {
  const progress = useSpringIn(delay);

  return (
    <div
      style={{
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [34, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Scene: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark = false }) => (
  <AbsoluteFill
    style={{
      ...base,
      overflow: "hidden",
      color: dark ? "#ffffff" : colors.ink,
      background: dark
        ? "linear-gradient(135deg, #07111f 0%, #0f172a 52%, #08302d 100%)"
        : "linear-gradient(135deg, #ffffff 0%, #f6f8fb 46%, #edf7f6 100%)",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: dark ? 0.14 : 0.36,
        backgroundImage:
          "linear-gradient(rgba(37,99,235,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(15,118,110,.14) 1px, transparent 1px)",
        backgroundSize: "88px 88px",
      }}
    />
    <div
      style={{
        position: "absolute",
        top: 72,
        right: -180,
        width: 620,
        height: 620,
        borderRadius: 620,
        background: dark ? "rgba(45,212,191,.18)" : "rgba(37,99,235,.12)",
        filter: "blur(10px)",
      }}
    />
    <div
      style={{
        position: "absolute",
        bottom: -270,
        left: -200,
        width: 620,
        height: 620,
        borderRadius: 620,
        background: dark ? "rgba(37,99,235,.18)" : "rgba(15,118,110,.13)",
        filter: "blur(12px)",
      }}
    />
    {children}
  </AbsoluteFill>
);

const Brand: React.FC<{ dark?: boolean }> = ({ dark = false }) => (
  <div
    style={{
      position: "absolute",
      top: 58,
      left: 78,
      width: 318,
      height: 62,
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      padding: dark ? "0 18px" : 0,
      background: dark ? "rgba(255,255,255,.96)" : "transparent",
      boxShadow: dark ? "0 18px 48px rgba(0,0,0,.18)" : "none",
    }}
  >
    <Img src={relayclarityLogoUrl} style={{ width: "100%", height: "auto" }} />
  </div>
);

const Kicker: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark = false }) => (
  <div
    style={{
      width: "fit-content",
      borderRadius: 999,
      border: `1px solid ${dark ? "rgba(255,255,255,.24)" : "rgba(37,99,235,.2)"}`,
      background: dark ? "rgba(255,255,255,.09)" : "rgba(255,255,255,.82)",
      color: dark ? "#99f6e4" : colors.teal,
      padding: "11px 18px",
      fontSize: 22,
      fontWeight: 900,
      lineHeight: 1,
    }}
  >
    {children}
  </div>
);

const Title: React.FC<{ children: React.ReactNode; dark?: boolean; max?: number; size?: number }> = ({
  children,
  dark = false,
  max = 880,
  size = 90,
}) => (
  <h1
    style={{
      margin: "26px 0 0",
      maxWidth: max,
      color: dark ? "#ffffff" : colors.ink,
      fontSize: size,
      lineHeight: 0.94,
      fontWeight: 880,
      letterSpacing: 0,
    }}
  >
    {children}
  </h1>
);

const Copy: React.FC<{ children: React.ReactNode; dark?: boolean; max?: number }> = ({
  children,
  dark = false,
  max = 760,
}) => (
  <p
    style={{
      margin: "28px 0 0",
      maxWidth: max,
      color: dark ? "#dbeafe" : colors.slate,
      fontSize: 34,
      lineHeight: 1.25,
      fontWeight: 650,
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
      borderRadius: 10,
      border: `1px solid ${dark ? "rgba(255,255,255,.16)" : "rgba(216,224,234,.95)"}`,
      background: dark ? "rgba(15,23,42,.78)" : "rgba(255,255,255,.94)",
      boxShadow: dark ? "0 34px 100px rgba(0,0,0,.34)" : "0 34px 100px rgba(15,23,42,.14)",
      backdropFilter: "blur(10px)",
      ...style,
    }}
  >
    {children}
  </div>
);

const Pill: React.FC<{ children: React.ReactNode; tone?: "blue" | "teal" | "green" | "amber" | "red" }> = ({
  children,
  tone = "blue",
}) => {
  const map = {
    blue: [colors.blue, "#dbeafe"],
    teal: [colors.teal, colors.tealSoft],
    green: [colors.green, colors.greenSoft],
    amber: [colors.amber, colors.amberSoft],
    red: [colors.red, colors.redSoft],
  }[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 38,
        borderRadius: 999,
        padding: "0 14px",
        background: map[1],
        color: map[0],
        fontSize: 18,
        fontWeight: 900,
      }}
    >
      {children}
    </span>
  );
};

const BrowserBar = () => (
  <div
    style={{
      height: 44,
      borderBottom: `1px solid ${colors.line}`,
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "0 18px",
      background: "#ffffff",
    }}
  >
    {[colors.blue, "#cbd5e1", "#cbd5e1"].map((color, index) => (
      <span key={index} style={{ width: 10, height: 10, borderRadius: 20, background: color }} />
    ))}
    <span
      style={{
        marginLeft: 16,
        height: 22,
        width: 230,
        borderRadius: 999,
        background: "#eef2f7",
      }}
    />
  </div>
);

const Metric: React.FC<{ value: string; label: string; tone?: "blue" | "teal" | "green" }> = ({
  value,
  label,
  tone = "blue",
}) => {
  const accent = tone === "green" ? colors.green : tone === "teal" ? colors.teal : colors.blue;

  return (
    <div
      style={{
        borderRadius: 8,
        border: `1px solid ${colors.line}`,
        background: "#ffffff",
        padding: "20px 22px",
      }}
    >
      <strong style={{ display: "block", color: accent, fontSize: 42, lineHeight: 1, fontWeight: 880 }}>{value}</strong>
      <span style={{ display: "block", marginTop: 9, color: colors.muted, fontSize: 18, fontWeight: 800 }}>{label}</span>
    </div>
  );
};

const ProductDashboard: React.FC = () => {
  const chart = useProgress(38, 60);
  const handoff = useProgress(70, 45);

  return (
    <Panel style={{ position: "absolute", right: 86, top: 170, width: 890, overflow: "hidden" }}>
      <BrowserBar />
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: 630 }}>
        <div style={{ borderRight: `1px solid ${colors.line}`, background: "#f8fafc", padding: 26 }}>
          <strong style={{ display: "block", color: colors.ink, fontSize: 25 }}>Launch desk</strong>
          {["Agent brief", "Simulations", "Guardrails", "Live monitor"].map((item, index) => (
            <div
              key={item}
              style={{
                marginTop: index === 0 ? 28 : 12,
                borderRadius: 8,
                padding: "15px 14px",
                background: index === 1 ? "#dbeafe" : "transparent",
                color: index === 1 ? colors.blueDark : colors.slate,
                fontSize: 18,
                fontWeight: 850,
              }}
            >
              {item}
            </div>
          ))}
        </div>
        <div style={{ padding: 30 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <div>
              <Pill tone="green">Ready to pilot</Pill>
              <h2 style={{ margin: "16px 0 0", color: colors.ink, fontSize: 44, lineHeight: 1, fontWeight: 880 }}>
                Northstar Dental agent
              </h2>
            </div>
            <Pill tone="teal">Voice + chat</Pill>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 28 }}>
            <Metric value="94%" label="answer confidence" />
            <Metric value="18s" label="median intake" tone="teal" />
            <Metric value="7" label="handoff rules" tone="green" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 18, marginTop: 22 }}>
            <div style={{ borderRadius: 8, border: `1px solid ${colors.line}`, padding: 22, background: "#ffffff" }}>
              <strong style={{ color: colors.ink, fontSize: 24 }}>Simulation results</strong>
              {[
                ["Appointment booking", 0.94, colors.green],
                ["Price question", 0.86, colors.teal],
                ["Emergency symptom", 0.72, colors.amber],
                ["Prompt injection", 0.98, colors.blue],
              ].map(([label, value, color], index) => (
                <div key={label as string} style={{ marginTop: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: colors.slate, fontSize: 18, fontWeight: 800 }}>
                    <span>{label}</span>
                    <span>{Math.round((value as number) * 100)}%</span>
                  </div>
                  <div style={{ marginTop: 9, height: 10, borderRadius: 20, background: "#e2e8f0", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${interpolate(chart, [0, 1], [8, (value as number) * 100])}%`,
                        height: "100%",
                        borderRadius: 20,
                        background: color as string,
                        transition: "width .2s",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ borderRadius: 8, border: `1px solid ${colors.line}`, padding: 22, background: "#ffffff" }}>
              <strong style={{ color: colors.ink, fontSize: 24 }}>Live handoff preview</strong>
              <div
                style={{
                  marginTop: 18,
                  borderRadius: 8,
                  background: "#f8fafc",
                  padding: 18,
                  opacity: handoff,
                  transform: `translateY(${interpolate(handoff, [0, 1], [22, 0])}px)`,
                }}
              >
                <Pill tone="amber">Reception callback</Pill>
                <p style={{ margin: "15px 0 0", color: colors.slate, fontSize: 22, lineHeight: 1.26, fontWeight: 740 }}>
                  Caller needs an urgent appointment, verified contact details, and prefers this afternoon.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
};

const StepRail: React.FC<{ active: number; dark?: boolean; compact?: boolean }> = ({
  active,
  dark = false,
  compact = false,
}) => (
  <div style={{ display: "grid", gap: compact ? 8 : 12 }}>
    {["Configure", "Simulate", "Control", "Monitor", "Launch"].map((item, index) => (
      <div
        key={item}
        style={{
          display: "grid",
          gridTemplateColumns: `${compact ? 34 : 42}px 1fr`,
          alignItems: "center",
          gap: compact ? 10 : 12,
          color: dark ? (index <= active ? "#ffffff" : "#94a3b8") : index <= active ? colors.ink : colors.muted,
          fontSize: compact ? 20 : 24,
          fontWeight: 880,
        }}
      >
        <span
          style={{
            width: compact ? 34 : 42,
            height: compact ? 34 : 42,
            borderRadius: compact ? 34 : 42,
            display: "grid",
            placeItems: "center",
            background: index < active ? colors.teal : index === active ? colors.blue : dark ? "rgba(255,255,255,.16)" : "#e2e8f0",
            color: index <= active || dark ? "#ffffff" : colors.muted,
            fontSize: compact ? 15 : 18,
            fontWeight: 950,
          }}
        >
          {index < active ? "OK" : index + 1}
        </span>
        <span>{item}</span>
      </div>
    ))}
  </div>
);

const FormRow: React.FC<{ label: string; value: string; delay: number; wide?: boolean }> = ({
  label,
  value,
  delay,
  wide = false,
}) => {
  const progress = useProgress(delay, 28);

  return (
    <div
      style={{
        gridColumn: wide ? "1 / -1" : undefined,
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [22, 0])}px)`,
      }}
    >
      <span style={{ color: colors.muted, fontSize: 17, fontWeight: 850 }}>{label}</span>
      <div
        style={{
          marginTop: 8,
          borderRadius: 8,
          border: `1px solid ${colors.line}`,
          background: "#ffffff",
          padding: "18px 20px",
          color: colors.ink,
          fontSize: 24,
          lineHeight: 1.2,
          fontWeight: 780,
        }}
      >
        {value}
      </div>
    </div>
  );
};

const SceneOpen = () => (
  <Scene dark>
    <Brand dark />
    <div style={{ position: "absolute", left: 96, top: 238 }}>
      <Reveal delay={6}>
        <Kicker dark>AI voice agent deployment</Kicker>
        <Title dark max={780} size={96}>
          Show customers what your agent can do before it goes live.
        </Title>
        <Copy dark max={720}>
          RelayClarity turns setup, testing, guardrails, and handoffs into one visible launch process.
        </Copy>
      </Reveal>
    </div>
    <ProductDashboard />
  </Scene>
);

const SceneConfigure = () => (
  <Scene>
    <Brand />
    <div style={{ position: "absolute", left: 96, top: 218, width: 640 }}>
      <Reveal delay={6}>
        <Kicker>1. Configure</Kicker>
        <Title max={680}>Build an agent from real business context.</Title>
        <Copy>
          Capture services, policies, escalation rules, and the customer moments your team handles every day.
        </Copy>
      </Reveal>
      <Reveal delay={52} style={{ marginTop: 46 }}>
        <StepRail active={0} />
      </Reveal>
    </div>
    <Panel style={{ position: "absolute", right: 110, top: 190, width: 780, padding: 34 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ color: colors.ink, fontSize: 32 }}>Agent brief</strong>
        <Pill tone="blue">Draft saved</Pill>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 30 }}>
        <FormRow label="Business type" value="Dental practice" delay={24} />
        <FormRow label="High-volume request" value="Book or move appointments" delay={36} />
        <FormRow label="Approved answer source" value="Reception FAQ and pricing notes" delay={48} wide />
        <FormRow label="Sensitive moments" value="Pain, complaints, privacy questions" delay={60} wide />
      </div>
      <div style={{ marginTop: 26, borderRadius: 8, background: "#eff6ff", padding: 22 }}>
        <strong style={{ color: colors.blueDark, fontSize: 24 }}>Generated launch scope</strong>
        <p style={{ margin: "11px 0 0", color: colors.slate, fontSize: 22, lineHeight: 1.28, fontWeight: 720 }}>
          Answer routine questions, gather caller details, route urgent cases, and create a clear receptionist handoff.
        </p>
      </div>
    </Panel>
  </Scene>
);

const Message: React.FC<{ from: "caller" | "agent"; text: string; delay: number }> = ({ from, text, delay }) => {
  const progress = useProgress(delay, 24);
  const isAgent = from === "agent";

  return (
    <div
      style={{
        justifySelf: isAgent ? "start" : "end",
        maxWidth: 520,
        borderRadius: 10,
        background: isAgent ? "#f1f5f9" : colors.blue,
        color: isAgent ? colors.ink : "#ffffff",
        padding: "18px 22px",
        fontSize: 24,
        lineHeight: 1.26,
        fontWeight: 720,
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [20, 0])}px)`,
      }}
    >
      {text}
    </div>
  );
};

const SceneSimulate = () => (
  <Scene dark>
    <Brand dark />
    <div style={{ position: "absolute", left: 96, top: 218, width: 650 }}>
      <Reveal delay={6}>
        <Kicker dark>2. Simulate</Kicker>
        <Title dark max={700}>Run real caller scenarios, not polished demos.</Title>
        <Copy dark>
          Test bookings, pricing, urgent requests, and edge cases before the first customer call.
        </Copy>
      </Reveal>
      <Reveal delay={50} style={{ marginTop: 28 }}>
        <StepRail active={1} dark compact />
      </Reveal>
    </div>
    <Panel dark style={{ position: "absolute", right: 110, top: 166, width: 780, padding: 30 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <Pill tone="amber">Emergency appointment test</Pill>
          <h2 style={{ margin: "16px 0 0", color: "#ffffff", fontSize: 38, lineHeight: 1, fontWeight: 880 }}>
            Conversation preview
          </h2>
        </div>
        <Pill tone="green">Guardrail active</Pill>
      </div>
      <div style={{ display: "grid", gap: 16, marginTop: 30 }}>
        <Message from="caller" delay={25} text="I have tooth pain. Can I be seen today?" />
        <Message from="agent" delay={48} text="I can help check availability. Is anyone in immediate danger or experiencing severe swelling?" />
        <Message from="caller" delay={76} text="No, but I need a slot as soon as possible." />
        <Message from="agent" delay={100} text="I will collect your contact details and mark this urgent for reception with a clear summary." />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 26 }}>
        <Metric value="Pass" label="safe response" tone="green" />
        <Metric value="Pass" label="identity capture" tone="teal" />
        <Metric value="Pass" label="handoff summary" tone="blue" />
      </div>
    </Panel>
  </Scene>
);

const RuleRow: React.FC<{ label: string; detail: string; tone: "green" | "amber" | "red"; delay: number }> = ({
  label,
  detail,
  tone,
  delay,
}) => {
  const progress = useProgress(delay, 28);
  const bg = tone === "green" ? colors.greenSoft : tone === "amber" ? colors.amberSoft : colors.redSoft;
  const fg = tone === "green" ? colors.green : tone === "amber" ? colors.amber : colors.red;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "58px 1fr auto",
        gap: 18,
        alignItems: "center",
        borderRadius: 8,
        border: `1px solid ${colors.line}`,
        background: "#ffffff",
        padding: "20px 22px",
        opacity: progress,
        transform: `translateX(${interpolate(progress, [0, 1], [38, 0])}px)`,
      }}
    >
      <span
        style={{
          width: 58,
          height: 58,
          borderRadius: 58,
          display: "grid",
          placeItems: "center",
          background: bg,
          color: fg,
          fontSize: 20,
          fontWeight: 950,
        }}
      >
        ON
      </span>
      <div>
        <strong style={{ display: "block", color: colors.ink, fontSize: 26 }}>{label}</strong>
        <span style={{ display: "block", marginTop: 5, color: colors.muted, fontSize: 20, lineHeight: 1.24, fontWeight: 700 }}>
          {detail}
        </span>
      </div>
      <Pill tone={tone}>{tone === "green" ? "Approved" : tone === "amber" ? "Escalate" : "Block"}</Pill>
    </div>
  );
};

const SceneControls = () => (
  <Scene>
    <Brand />
    <div style={{ position: "absolute", left: 96, top: 214, width: 660 }}>
      <Reveal delay={6}>
        <Kicker>3. Control</Kicker>
        <Title max={690}>Make the boundaries explicit.</Title>
        <Copy>
          Approve what the agent can answer, when it should ask for a human, and what context the team receives.
        </Copy>
      </Reveal>
      <Reveal delay={54} style={{ marginTop: 46 }}>
        <StepRail active={2} />
      </Reveal>
    </div>
    <div style={{ position: "absolute", right: 100, top: 190, width: 790, display: "grid", gap: 16 }}>
      <RuleRow label="Use approved answers only" detail="Ground replies in the business FAQ, service notes, and launch brief." tone="green" delay={24} />
      <RuleRow label="Escalate urgent or sensitive requests" detail="Pain, complaints, fraud, vulnerability, privacy, or unsafe situations go to a person." tone="amber" delay={48} />
      <RuleRow label="Reject unsafe prompt instructions" detail="Do not expose hidden instructions, secrets, credentials, or private customer data." tone="red" delay={72} />
      <Panel style={{ padding: 24, marginTop: 8 }}>
        <strong style={{ color: colors.ink, fontSize: 27 }}>Human handoff payload</strong>
        <p style={{ margin: "12px 0 0", color: colors.slate, fontSize: 22, lineHeight: 1.28, fontWeight: 720 }}>
          Caller intent, verified contact details, urgency, transcript highlights, and recommended next action.
        </p>
      </Panel>
    </div>
  </Scene>
);

const SceneMonitor = () => {
  const pulse = useProgress(64, 44);

  return (
    <Scene dark>
      <Brand dark />
      <div style={{ position: "absolute", left: 96, top: 224, width: 660 }}>
        <Reveal delay={6}>
          <Kicker dark>4. Monitor</Kicker>
          <Title dark max={710}>See what happens once the pilot is live.</Title>
          <Copy dark>
            Track outcomes, missed intents, and handoff quality without waiting for customer complaints.
          </Copy>
        </Reveal>
      </div>
      <Panel dark style={{ position: "absolute", right: 104, top: 162, width: 830, padding: 30 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, color: "#ffffff", fontSize: 38, fontWeight: 880 }}>Live operations</h2>
          <Pill tone="green">28 calls today</Pill>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 24 }}>
          <Metric value="81%" label="resolved automatically" tone="green" />
          <Metric value="12" label="qualified handoffs" tone="teal" />
          <Metric value="3" label="new intents found" tone="blue" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 18, marginTop: 22 }}>
          <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.08)", padding: 22 }}>
            <strong style={{ color: "#ffffff", fontSize: 25 }}>Conversation stream</strong>
            {[
              ["Booking", "Resolved", "green"],
              ["Pricing", "Answered", "teal"],
              ["Complaint", "Transferred", "amber"],
              ["Unknown policy", "Needs review", "red"],
            ].map(([intent, state, tone], index) => (
              <div
                key={intent}
                style={{
                  marginTop: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderRadius: 8,
                  background: index === 3 ? `rgba(254,226,226,${0.22 + pulse * 0.18})` : "rgba(255,255,255,.08)",
                  padding: "16px 18px",
                  color: "#ffffff",
                  fontSize: 22,
                  fontWeight: 820,
                }}
              >
                <span>{intent}</span>
                <Pill tone={tone as "green" | "teal" | "amber" | "red"}>{state}</Pill>
              </div>
            ))}
          </div>
          <div style={{ borderRadius: 8, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.08)", padding: 22 }}>
            <strong style={{ color: "#ffffff", fontSize: 25 }}>Recommended action</strong>
            <p style={{ margin: "18px 0 0", color: "#dbeafe", fontSize: 25, lineHeight: 1.25, fontWeight: 760 }}>
              Add one answer for warranty coverage and rerun the pricing simulation.
            </p>
            <div style={{ marginTop: 24, height: 13, borderRadius: 40, background: "rgba(255,255,255,.16)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${interpolate(pulse, [0, 1], [18, 84])}%`, background: colors.tealSoft }} />
            </div>
          </div>
        </div>
      </Panel>
    </Scene>
  );
};

const SceneLaunch = () => (
  <Scene>
    <Brand />
    <div style={{ position: "absolute", left: 96, top: 220, width: 680 }}>
      <Reveal delay={6}>
        <Kicker>5. Launch</Kicker>
        <Title max={730}>Hand over a clear launch decision.</Title>
        <Copy>
          Replace scattered notes with readiness, remaining risks, owners, and the exact next action.
        </Copy>
      </Reveal>
      <Reveal delay={54} style={{ marginTop: 46 }}>
        <StepRail active={4} />
      </Reveal>
    </div>
    <Panel style={{ position: "absolute", right: 112, top: 178, width: 760, padding: 34 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <Pill tone="green">Ready for first calls</Pill>
          <h2 style={{ margin: "18px 0 0", color: colors.ink, fontSize: 46, lineHeight: 1, fontWeight: 880 }}>
            Launch summary
          </h2>
        </div>
        <strong style={{ color: colors.green, fontSize: 64, lineHeight: 1, fontWeight: 900 }}>94%</strong>
      </div>
      {[
        ["Coverage", "Bookings, FAQs, pricing, urgent callbacks, and reception handoffs are tested."],
        ["Guardrails", "Sensitive requests escalate and unsafe instructions are blocked."],
        ["Owner", "Reception lead receives all urgent handoffs with a clean summary."],
      ].map(([label, detail], index) => {
        const progress = useProgress(28 + index * 22, 26);
        return (
          <div
            key={label}
            style={{
              marginTop: 20,
              borderRadius: 8,
              border: `1px solid ${colors.line}`,
              background: "#ffffff",
              padding: "19px 22px",
              opacity: progress,
              transform: `translateY(${interpolate(progress, [0, 1], [18, 0])}px)`,
            }}
          >
            <span style={{ color: colors.teal, fontSize: 18, fontWeight: 950 }}>{label}</span>
            <p style={{ margin: "8px 0 0", color: colors.slate, fontSize: 23, lineHeight: 1.27, fontWeight: 740 }}>{detail}</p>
          </div>
        );
      })}
      <div
        style={{
          marginTop: 26,
          borderRadius: 8,
          background: `linear-gradient(135deg, ${colors.blue}, ${colors.teal})`,
          color: "#ffffff",
          padding: "22px 26px",
          fontSize: 29,
          lineHeight: 1.1,
          fontWeight: 900,
        }}
      >
        Next step: open dashboard and run your own agent preview.
      </div>
    </Panel>
  </Scene>
);

const SceneFinal = () => (
  <Scene dark>
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
      <Reveal delay={6}>
        <Kicker dark>RelayClarity</Kicker>
        <Title dark max={1250} size={116}>
          Launch AI voice agents with proof customers can trust.
        </Title>
        <Copy dark max={900}>
          Configure the agent. Simulate real calls. Approve the controls. Monitor every handoff.
        </Copy>
      </Reveal>
    </div>
  </Scene>
);

export const RelayClarityLaunchVideo: React.FC = () => (
  <AbsoluteFill style={base}>
    <Sequence from={0} durationInFrames={140}>
      <SceneOpen />
    </Sequence>
    <Sequence from={140} durationInFrames={130}>
      <SceneConfigure />
    </Sequence>
    <Sequence from={270} durationInFrames={150}>
      <SceneSimulate />
    </Sequence>
    <Sequence from={420} durationInFrames={140}>
      <SceneControls />
    </Sequence>
    <Sequence from={560} durationInFrames={140}>
      <SceneMonitor />
    </Sequence>
    <Sequence from={700} durationInFrames={120}>
      <SceneLaunch />
    </Sequence>
    <Sequence from={820} durationInFrames={80}>
      <SceneFinal />
    </Sequence>
  </AbsoluteFill>
);
