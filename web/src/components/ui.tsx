import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

// ── Button ───────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: "md" | "sm";
}
export function Button({ variant = "secondary", size = "md", className = "", ...rest }: ButtonProps) {
  const cls = `btn btn-${variant} ${size === "sm" ? "btn-sm" : ""} ${className}`.trim();
  return <button className={cls} {...rest} />;
}

// ── Card ─────────────────────────────────────────────────────────────────
export function Card({
  title,
  description,
  actions,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card">
      {(title || actions) && (
        <div className="card-header">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {description && <p className="card-desc">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Field / Input / Select / Textarea ──────────────────────────────────
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`.trim()} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`input ${className}`.trim()} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`input ${className}`.trim()} {...props} />;
}

// ── Badge ────────────────────────────────────────────────────────────────
type BadgeTone = "positive" | "warning" | "negative" | "neutral" | "accent";
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

// ── Empty state ─────────────────────────────────────────────────────────
export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

// ── Modal ────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" style={wide ? { maxWidth: 880 } : undefined}>
        <div className="modal-header">
          <h3 className="card-title">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Stat tile ───────────────────────────────────────────────────────────
type StatTone = "accent" | "sand" | "ink" | "outline" | "plain";
export function StatTile({ label, value, tone = "outline" }: { label: string; value: ReactNode; tone?: StatTone }) {
  const cls = tone === "plain" ? "stat-tile stat-tile-plain" : `stat-tile stat-tile-${tone}`;
  return (
    <div className={cls}>
      <span className="label">{label}</span>
      <span className="value">{value}</span>
    </div>
  );
}

// ── Tabs ─────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t.key} className={`tab-btn ${active === t.key ? "active" : ""}`} onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
