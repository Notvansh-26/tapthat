interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
}

export default function PageHeader({ eyebrow, title, subtitle }: PageHeaderProps) {
  return (
    <div
      className="hero-bg relative overflow-hidden"
      style={{ clipPath: "polygon(0 0, 100% 0, 100% 78%, 0 100%)" }}
    >
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-20">
        <div className="flex items-center gap-3 mb-3">
          <span className="h-px w-6 bg-brand-400/50" />
          <span className="font-mono text-[10px] text-brand-300 tracking-[0.2em] uppercase">
            {eyebrow}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-white/50 text-[15px] max-w-lg font-light">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
