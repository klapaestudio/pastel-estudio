const TOKEN_KEY = "pastel_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    setToken(null);
    window.location.href = "/login";
    throw new Error("No autenticado");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Error de red");
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};

// El endpoint de PDF requiere el header Authorization, así que no se puede linkear
// directo desde un <a href>: se trae como blob y se abre/descarga desde JS.
export async function fetchPresupuestoPdf(presupuestoId: string, plantilla?: string): Promise<Blob> {
  const token = getToken();
  const q = plantilla ? `?plantilla=${encodeURIComponent(plantilla)}` : "";
  const res = await fetch(`/api/presupuestos/${presupuestoId}/pdf${q}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("No se pudo generar el PDF");
  return res.blob();
}

export async function openPresupuestoPdf(presupuestoId: string, plantilla?: string) {
  const blob = await fetchPresupuestoPdf(presupuestoId, plantilla);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function downloadPresupuestoPdf(presupuestoId: string, filename: string, plantilla?: string) {
  const blob = await fetchPresupuestoPdf(presupuestoId, plantilla);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
