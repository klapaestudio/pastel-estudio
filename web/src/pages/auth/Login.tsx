import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import { Button, Card, Field, Input } from "../../components/ui";

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={user.role === "CLIENTE" ? "/portal" : "/"} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card card">
        <div style={{ marginBottom: 22 }}>
          <img src="/logo.png" alt="Pastel Studio" className="brand-logo-lg" />
          <p className="muted" style={{ marginTop: 6 }}>Ingresá a tu cuenta</p>
        </div>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </Field>
          <Field label="Contraseña">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error && (
            <div className="badge badge-negative" style={{ width: "fit-content" }}>
              {error}
            </div>
          )}
          <Button variant="primary" type="submit" disabled={loading} style={{ marginTop: 6 }}>
            {loading ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
