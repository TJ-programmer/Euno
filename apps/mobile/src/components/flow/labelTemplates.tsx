/**
 * Label → UI template. No images: each label gets a palette, a glyph and an
 * animated, pure-View motif. Unknown labels hash deterministically onto one
 * of the templates, so the same label always looks the same.
 */

import React, { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

export type TemplateId = "tech" | "mind" | "science" | "nature" | "health" | "ember";

export type LabelTemplate = {
  id: TemplateId;
  colors: [string, string, string];
  accent: string; // 6-digit hex
  glyph: string;
};

const TEMPLATES: Record<TemplateId, LabelTemplate> = {
  tech: { id: "tech", colors: ["#0B1B33", "#0A1226", "#04060F"], accent: "#5EA8FF", glyph: "◈" },
  mind: { id: "mind", colors: ["#2A1646", "#160B2E", "#07040F"], accent: "#C58BFF", glyph: "◐" },
  science: { id: "science", colors: ["#0D2A33", "#0A1B2A", "#040810"], accent: "#4FE0D0", glyph: "◎" },
  nature: { id: "nature", colors: ["#12301F", "#0B1F17", "#040B08"], accent: "#7BE08F", glyph: "❦" },
  health: { id: "health", colors: ["#3A1620", "#220C16", "#0B0408"], accent: "#FF8FA3", glyph: "✚" },
  ember: { id: "ember", colors: ["#3A2410", "#1F1109", "#0A0604"], accent: "#FFB366", glyph: "✦" },
};

const RULES: [RegExp, TemplateId][] = [
  [/artificial|intelligen|\bai\b|tech|program|software|comput|startup|robot/, "tech"],
  [/psych|cogn|behav|mind|brain|neuro|emotion/, "mind"],
  [/nature|ecolog|environ|animal|plant|climate|ocean|earth|biodiv/, "nature"],
  [/health|food|nutri|medic|body|fitness|sleep/, "health"],
  [/science|space|physic|chem|biolog|astronom|math/, "science"],
];

const IDS = Object.keys(TEMPLATES) as TemplateId[];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function matchId(text: string): TemplateId | null {
  for (const [re, id] of RULES) if (re.test(text)) return id;
  return null;
}

/** DB label is authoritative; topics are the second chance; hash is the last resort. */
export function resolveTemplate(label: string, topics: string[] = []): LabelTemplate {
  const id =
    matchId(label.toLowerCase()) ??
    matchId(topics.join(" ").toLowerCase()) ??
    IDS[hash(label) % IDS.length];
  return TEMPLATES[id];
}

export const withAlpha = (hex: string, opacity: number) =>
  hex + Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");

// ─────────────────────────────────────────────────────────────────────────
// Motion helpers
// ─────────────────────────────────────────────────────────────────────────

/** 0→1 repeating. Only runs while `active`, so off-screen cards cost nothing. */
function useLoop(active: boolean, duration: number, yoyo = false) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (active) {
      v.value = withRepeat(
        withTiming(1, {
          duration,
          easing: yoyo ? Easing.inOut(Easing.sin) : Easing.linear,
        }),
        -1,
        yoyo
      );
    } else {
      cancelAnimation(v);
    }
    return () => cancelAnimation(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, duration, yoyo]);
  return v;
}

type MotifProps = { accent: string; active: boolean; width: number; height: number };

// ── tech: scrolling grid + pulsing nodes ─────────────────────────────────
const NODES: [number, number][] = [
  [0.18, 0.14], [0.72, 0.22], [0.42, 0.36], [0.86, 0.46], [0.28, 0.58], [0.64, 0.7],
];

function TechMotif({ accent, active, width, height }: MotifProps) {
  const SP = 84;
  const COLS = 7;
  const rows = Math.ceil(height / SP) + 2;
  const scroll = useLoop(active, 7000);
  const pulse = useLoop(active, 2400, true);
  const scrollStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scroll.value * SP }] }));
  const nodeStyle = useAnimatedStyle(() => ({ opacity: 0.25 + pulse.value * 0.6 }));

  return (
    <>
      <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: -SP, height: rows * SP }, scrollStyle]}>
        {Array.from({ length: rows }).map((_, i) => (
          <View
            key={i}
            style={{
              position: "absolute", left: 0, right: 0, top: i * SP,
              height: StyleSheet.hairlineWidth, backgroundColor: withAlpha(accent, 0.14),
            }}
          />
        ))}
      </Animated.View>
      {Array.from({ length: COLS }).map((_, i) => (
        <View
          key={i}
          style={{
            position: "absolute", top: 0, bottom: 0, left: (width / (COLS - 1)) * i,
            width: StyleSheet.hairlineWidth, backgroundColor: withAlpha(accent, 0.09),
          }}
        />
      ))}
      {NODES.map(([fx, fy], i) => (
        <Animated.View
          key={i}
          style={[
            { position: "absolute", left: width * fx - 4, top: height * fy - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: accent },
            nodeStyle,
          ]}
        />
      ))}
    </>
  );
}

// ── mind: breathing concentric rings + slow dashed ring ──────────────────
function BreathRing({ size, i, breath, accent, cx, cy }: {
  size: number; i: number; breath: SharedValue<number>; accent: string; cx: number; cy: number;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + (i % 2 ? 1 : -1) * 0.05 * (breath.value - 0.5) * 2 }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute", left: cx - size / 2, top: cy - size / 2, width: size, height: size,
          borderRadius: size / 2, borderWidth: 1, borderColor: withAlpha(accent, 0.2 - i * 0.025),
        },
        style,
      ]}
    />
  );
}

function MindMotif({ accent, active, width, height }: MotifProps) {
  const breath = useLoop(active, 4200, true);
  const spin = useLoop(active, 50000);
  const cx = width / 2;
  const cy = height * 0.3;
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  return (
    <>
      {[140, 230, 330, 440, 560].map((s, i) => (
        <BreathRing key={s} size={s} i={i} breath={breath} accent={accent} cx={cx} cy={cy} />
      ))}
      <Animated.View
        style={[
          {
            position: "absolute", left: cx - 190, top: cy - 190, width: 380, height: 380,
            borderRadius: 190, borderWidth: 1.5, borderStyle: "dashed", borderColor: withAlpha(accent, 0.28),
          },
          spinStyle,
        ]}
      />
      <View style={{ position: "absolute", left: cx - 5, top: cy - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: accent }} />
    </>
  );
}

// ── science: tilted orbits with travelling dots ──────────────────────────
function Orbit({ size, duration, accent }: { size: number; duration: number; accent: string }) {
  const v = useLoop(true, duration);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${v.value * 360}deg` }] }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute", left: -size / 2, top: -size / 2, width: size, height: size,
          borderRadius: size / 2, borderWidth: 1, borderColor: withAlpha(accent, 0.22),
        },
        style,
      ]}
    >
      <View style={{ position: "absolute", top: -5, left: size / 2 - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: accent }} />
    </Animated.View>
  );
}

function ScienceMotif({ accent, active, width, height }: MotifProps) {
  if (!active) {
    // Static frame when off-screen.
  }
  return (
    <View
      style={{
        position: "absolute", left: width * 0.5, top: height * 0.3,
        transform: [{ rotate: "-24deg" }, { scaleY: 0.55 }],
      }}
    >
      {[190, 300, 420].map((s, i) => (
        <Orbit key={s} size={s} duration={12000 + i * 9000} accent={accent} />
      ))}
      <View style={{ position: "absolute", left: -9, top: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: withAlpha(accent, 0.9) }} />
    </View>
  );
}

// ── nature: soft hills + rising spores ───────────────────────────────────
function Spore({ v, phase, x, height, accent }: {
  v: SharedValue<number>; phase: number; x: number; height: number; accent: string;
}) {
  const style = useAnimatedStyle(() => {
    const p = (v.value + phase) % 1;
    return {
      opacity: Math.sin(Math.PI * p) * 0.55,
      transform: [{ translateY: height * 0.85 - p * height * 0.75 }, { translateX: Math.sin(p * 6.28) * 14 }],
    };
  });
  return (
    <Animated.View
      style={[{ position: "absolute", left: x, top: 0, width: 5, height: 5, borderRadius: 3, backgroundColor: accent }, style]}
    />
  );
}

function NatureMotif({ accent, active, width, height }: MotifProps) {
  const v = useLoop(active, 14000);
  return (
    <>
      {[
        { l: -0.4, b: -1.25, a: 0.06 },
        { l: -0.05, b: -1.2, a: 0.09 },
        { l: -0.6, b: -1.3, a: 0.13 },
      ].map((h, i) => (
        <View
          key={i}
          style={{
            position: "absolute", width: width * 1.7, height: width * 1.7, borderRadius: width * 0.85,
            left: width * h.l, bottom: width * h.b, backgroundColor: withAlpha(accent, h.a),
          }}
        />
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <Spore key={i} v={v} phase={i / 9} x={((i * 97) % 100) / 100 * width} height={height} accent={accent} />
      ))}
    </>
  );
}

// ── health: heartbeat pulse rings ────────────────────────────────────────
function PulseRing({ v, phase, accent, cx, cy }: {
  v: SharedValue<number>; phase: number; accent: string; cx: number; cy: number;
}) {
  const style = useAnimatedStyle(() => {
    const p = (v.value + phase) % 1;
    return { opacity: (1 - p) * 0.4, transform: [{ scale: 0.3 + p * 2.4 }] };
  });
  return (
    <Animated.View
      style={[
        { position: "absolute", left: cx - 90, top: cy - 90, width: 180, height: 180, borderRadius: 90, borderWidth: 1.5, borderColor: accent },
        style,
      ]}
    />
  );
}

function HealthMotif({ accent, active, width, height }: MotifProps) {
  const v = useLoop(active, 4200);
  return (
    <>
      {[0, 1 / 3, 2 / 3].map((p) => (
        <PulseRing key={p} v={v} phase={p} accent={accent} cx={width * 0.72} cy={height * 0.28} />
      ))}
      <View style={{ position: "absolute", left: width * 0.72 - 6, top: height * 0.28 - 6, width: 12, height: 12, borderRadius: 6, backgroundColor: accent }} />
    </>
  );
}

// ── ember (fallback): sliding light beams ────────────────────────────────
function Beam({ i, active, accent, width, height }: { i: number; active: boolean } & Pick<MotifProps, "accent" | "width" | "height">) {
  const v = useLoop(active, 9000 + i * 3500, true);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(v.value, [0, 1], [-60, 80]) }, { rotate: "24deg" }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute", top: -height * 0.3, left: width * (0.1 + i * 0.32),
          width: 70 + i * 26, height: height * 1.6, backgroundColor: withAlpha(accent, 0.05 + i * 0.015),
        },
        style,
      ]}
    />
  );
}

function EmberMotif(p: MotifProps) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Beam key={i} i={i} active={p.active} accent={p.accent} width={p.width} height={p.height} />
      ))}
    </>
  );
}

const MOTIFS: Record<TemplateId, React.ComponentType<MotifProps>> = {
  tech: TechMotif,
  mind: MindMotif,
  science: ScienceMotif,
  nature: NatureMotif,
  health: HealthMotif,
  ember: EmberMotif,
};

// ─────────────────────────────────────────────────────────────────────────
// Backdrop
// ─────────────────────────────────────────────────────────────────────────

function SoftGlow({ size, color }: { size: number; color: string }) {
  // Stacked translucent discs fake a blur without a native blur dependency.
  return (
    <>
      {[1, 0.78, 0.56, 0.36].map((k, i) => (
        <View
          key={i}
          style={{
            position: "absolute", width: size * k, height: size * k, borderRadius: (size * k) / 2,
            left: (size - size * k) / 2, top: (size - size * k) / 2, backgroundColor: color,
          }}
        />
      ))}
    </>
  );
}

export function LabelBackdrop({
  template,
  active,
  step,
  stepCount,
}: {
  template: LabelTemplate;
  active: boolean;
  step: number;
  stepCount: number;
}) {
  const { width, height } = useWindowDimensions();
  const prog = useSharedValue(0);

  // The glow drifts across the card as you move through the steps.
  useEffect(() => {
    prog.value = withTiming(stepCount > 1 ? step / (stepCount - 1) : 0, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [step, stepCount, prog]);

  const glowA = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(prog.value, [0, 1], [-width * 0.25, width * 0.25]) },
      { translateY: interpolate(prog.value, [0, 1], [0, height * 0.22]) },
    ],
  }));
  const glowB = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(prog.value, [0, 1], [width * 0.15, -width * 0.2]) },
      { translateY: interpolate(prog.value, [0, 1], [0, -height * 0.18]) },
    ],
  }));

  const Motif = MOTIFS[template.id];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={template.colors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[{ position: "absolute", top: -width * 0.45, left: -width * 0.2, width: width * 1.3, height: width * 1.3 }, glowA]}>
        <SoftGlow size={width * 1.3} color={withAlpha(template.accent, 0.05)} />
      </Animated.View>
      <Animated.View style={[{ position: "absolute", bottom: -width * 0.4, right: -width * 0.3, width: width * 1.1, height: width * 1.1 }, glowB]}>
        <SoftGlow size={width * 1.1} color={withAlpha(template.accent, 0.035)} />
      </Animated.View>

      <Motif accent={template.accent} active={active} width={width} height={height} />

      {/* Legibility vignette: darker at top (header) and bottom (text + footer). */}
      <LinearGradient
        colors={["rgba(3,2,8,0.45)", "transparent", "rgba(3,2,8,0.88)"]}
        locations={[0, 0.38, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
