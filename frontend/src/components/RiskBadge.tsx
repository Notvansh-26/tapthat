interface RiskBadgeProps {
  level: "safe" | "caution" | "danger";
  size?: "sm" | "md" | "lg";
}

const config = {
  safe: {
    label: "Safe",
    icon: "✓",
    bg: "bg-safe-light",
    text: "text-safe-dark",
    border: "border-safe",
    dot: "bg-safe",
  },
  caution: {
    label: "Caution",
    icon: "!",
    bg: "bg-caution-light",
    text: "text-caution-dark",
    border: "border-caution",
    dot: "bg-caution",
  },
  danger: {
    label: "At Risk",
    icon: "✕",
    bg: "bg-danger-light",
    text: "text-danger-dark",
    border: "border-danger",
    dot: "bg-danger",
    pulse: true,
  },
};

const sizes = {
  sm: "text-xs px-2.5 py-1",
  md: "text-sm px-3.5 py-1.5",
  lg: "text-base px-5 py-2.5",
};

export default function RiskBadge({ level, size = "md" }: RiskBadgeProps) {
  const c = config[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border
        ${c.bg} ${c.text} ${c.border} ${sizes[size]}
        ${level === "danger" ? "pulse-danger" : ""}`}
    >
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
