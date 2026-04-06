import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

interface RiskBadgeProps {
  level: "safe" | "caution" | "danger";
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
}

const config = {
  safe: {
    label: "Safe",
    icon: ShieldCheck,
    bg: "bg-safe-light",
    text: "text-safe-dark",
    border: "border-safe/30",
    ring: "ring-safe/20",
  },
  caution: {
    label: "Caution",
    icon: ShieldAlert,
    bg: "bg-caution-light",
    text: "text-caution-dark",
    border: "border-caution/30",
    ring: "ring-caution/20",
  },
  danger: {
    label: "At Risk",
    icon: ShieldX,
    bg: "bg-danger-light",
    text: "text-danger-dark",
    border: "border-danger/30",
    ring: "ring-danger/20",
  },
};

const sizes = {
  sm: { badge: "text-xs px-2 py-0.5 gap-1", icon: "w-3 h-3" },
  md: { badge: "text-xs px-2.5 py-1 gap-1.5", icon: "w-3.5 h-3.5" },
  lg: { badge: "text-sm px-3 py-1.5 gap-1.5", icon: "w-4 h-4" },
  xl: { badge: "text-base px-4 py-2 gap-2", icon: "w-5 h-5" },
};

export default function RiskBadge({
  level,
  size = "md",
  showLabel = true,
}: RiskBadgeProps) {
  const c = config[level];
  const s = sizes[size];
  const Icon = c.icon;

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ring-2
        ${c.bg} ${c.text} ${c.border} ${c.ring} ${s.badge}
        ${level === "danger" ? "pulse-danger" : ""}`}
    >
      <Icon className={s.icon} />
      {showLabel && c.label}
    </span>
  );
}
