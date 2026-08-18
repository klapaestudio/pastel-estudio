"""Acceso a datos de Pastel Studio — SQLite."""
import os
import sqlite3
from datetime import datetime

DB_PATH = os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(__file__), "..", "data", "pastel.db"))

_conn = None


def get_conn():
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA foreign_keys = ON")
    return _conn


def _rows(cur):
    return [dict(r) for r in cur.fetchall()]


def _row(cur):
    r = cur.fetchone()
    return dict(r) if r else None


def init_db():
    conn = get_conn()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            contacto TEXT,
            email TEXT,
            telefono TEXT,
            notas TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS presupuestos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            titulo TEXT NOT NULL,
            fecha TEXT DEFAULT (date('now')),
            estado TEXT DEFAULT 'Borrador',
            envio_tipo TEXT DEFAULT 'Estimativo',
            envio_costo REAL DEFAULT 0,
            notas TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (client_id) REFERENCES clients(id)
        );

        CREATE TABLE IF NOT EXISTS presupuesto_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            presupuesto_id INTEGER NOT NULL,
            orden INTEGER DEFAULT 0,
            producto TEXT NOT NULL,
            medidas TEXT,
            tela TEXT,
            cantidad_tela REAL DEFAULT 0,
            precio_tela_metro REAL DEFAULT 0,
            mano_obra_costo REAL DEFAULT 0,
            mano_obra_estado TEXT DEFAULT 'Estimativo',
            insumos_cantidad REAL DEFAULT 0,
            insumos_valor_unitario REAL DEFAULT 0,
            unidades REAL DEFAULT 1,
            precio_unidad REAL DEFAULT 0,
            FOREIGN KEY (presupuesto_id) REFERENCES presupuestos(id)
        );

        CREATE TABLE IF NOT EXISTS producto_lineas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            modelo TEXT NOT NULL,
            medidas TEXT,
            mano_obra_costo REAL DEFAULT 0,
            cantidad_tela REAL DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS producto_variantes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            linea_id INTEGER NOT NULL,
            nombre TEXT NOT NULL,
            tela_precio_metro REAL DEFAULT 0,
            precio_final REAL DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (linea_id) REFERENCES producto_lineas(id)
        );

        CREATE TABLE IF NOT EXISTS stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            producto TEXT NOT NULL,
            cantidad REAL DEFAULT 0,
            tela TEXT,
            estado TEXT DEFAULT 'Disponible',
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS finance_ingresos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER,
            presupuesto_id INTEGER,
            concepto TEXT NOT NULL,
            categoria TEXT,
            monto REAL NOT NULL,
            fecha TEXT DEFAULT (date('now')),
            FOREIGN KEY (client_id) REFERENCES clients(id),
            FOREIGN KEY (presupuesto_id) REFERENCES presupuestos(id)
        );

        CREATE TABLE IF NOT EXISTS finance_gastos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            concepto TEXT NOT NULL,
            categoria TEXT,
            proveedor TEXT,
            monto REAL NOT NULL,
            fecha TEXT DEFAULT (date('now'))
        );

        CREATE TABLE IF NOT EXISTS finance_pagos_proveedores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            proveedor TEXT NOT NULL,
            concepto TEXT,
            monto REAL NOT NULL,
            metodo TEXT,
            fecha TEXT DEFAULT (date('now'))
        );

        CREATE TABLE IF NOT EXISTS finance_retiros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            socia TEXT NOT NULL,
            monto REAL NOT NULL,
            notas TEXT,
            fecha TEXT DEFAULT (date('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_presupuestos_client ON presupuestos(client_id);
        CREATE INDEX IF NOT EXISTS idx_items_presupuesto ON presupuesto_items(presupuesto_id);
        CREATE INDEX IF NOT EXISTS idx_variantes_linea ON producto_variantes(linea_id);
        CREATE INDEX IF NOT EXISTS idx_ingresos_fecha ON finance_ingresos(fecha);
        CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON finance_gastos(fecha);
        """
    )
    conn.commit()


# ── Clients ──────────────────────────────────────────────────────────────

def list_clients():
    return _rows(get_conn().execute("SELECT * FROM clients ORDER BY nombre"))


def get_client(client_id):
    return _row(get_conn().execute("SELECT * FROM clients WHERE id=?", (client_id,)))


def save_client(data, client_id=None):
    conn = get_conn()
    if client_id:
        conn.execute(
            "UPDATE clients SET nombre=?, contacto=?, email=?, telefono=?, notas=? WHERE id=?",
            (data.get("nombre"), data.get("contacto"), data.get("email"), data.get("telefono"), data.get("notas"), client_id),
        )
        conn.commit()
        return client_id
    cur = conn.execute(
        "INSERT INTO clients (nombre, contacto, email, telefono, notas) VALUES (?,?,?,?,?)",
        (data.get("nombre"), data.get("contacto"), data.get("email"), data.get("telefono"), data.get("notas")),
    )
    conn.commit()
    return cur.lastrowid


def delete_client(client_id):
    conn = get_conn()
    conn.execute("DELETE FROM clients WHERE id=?", (client_id,))
    conn.commit()


# ── Presupuestos ─────────────────────────────────────────────────────────

def _item_calc(it):
    costo_tela = (it.get("cantidad_tela") or 0) * (it.get("precio_tela_metro") or 0)
    insumos_subtotal = (it.get("insumos_cantidad") or 0) * (it.get("insumos_valor_unitario") or 0)
    costo_unitario = costo_tela + (it.get("mano_obra_costo") or 0) + insumos_subtotal
    subtotal = (it.get("unidades") or 0) * (it.get("precio_unidad") or 0)
    margen = subtotal - costo_unitario * (it.get("unidades") or 0)
    it["costo_tela"] = round(costo_tela, 2)
    it["insumos_subtotal"] = round(insumos_subtotal, 2)
    it["costo_unitario"] = round(costo_unitario, 2)
    it["subtotal"] = round(subtotal, 2)
    it["margen"] = round(margen, 2)
    return it


def list_presupuestos(client_id=None):
    conn = get_conn()
    if client_id:
        rows = _rows(conn.execute(
            "SELECT p.*, c.nombre AS client_nombre FROM presupuestos p JOIN clients c ON c.id=p.client_id "
            "WHERE p.client_id=? ORDER BY p.fecha DESC, p.id DESC", (client_id,)))
    else:
        rows = _rows(conn.execute(
            "SELECT p.*, c.nombre AS client_nombre FROM presupuestos p JOIN clients c ON c.id=p.client_id "
            "ORDER BY p.fecha DESC, p.id DESC"))
    for p in rows:
        items = _rows(conn.execute("SELECT * FROM presupuesto_items WHERE presupuesto_id=? ORDER BY orden, id", (p["id"],)))
        items = [_item_calc(i) for i in items]
        p["items"] = items
        p["subtotal_items"] = round(sum(i["subtotal"] for i in items), 2)
        p["margen_total"] = round(sum(i["margen"] for i in items), 2)
        p["total"] = round(p["subtotal_items"] + (p.get("envio_costo") or 0), 2)
    return rows


def get_presupuesto(presupuesto_id):
    conn = get_conn()
    p = _row(conn.execute(
        "SELECT p.*, c.nombre AS client_nombre FROM presupuestos p JOIN clients c ON c.id=p.client_id WHERE p.id=?",
        (presupuesto_id,)))
    if not p:
        return None
    items = _rows(conn.execute("SELECT * FROM presupuesto_items WHERE presupuesto_id=? ORDER BY orden, id", (presupuesto_id,)))
    items = [_item_calc(i) for i in items]
    p["items"] = items
    p["subtotal_items"] = round(sum(i["subtotal"] for i in items), 2)
    p["margen_total"] = round(sum(i["margen"] for i in items), 2)
    p["total"] = round(p["subtotal_items"] + (p.get("envio_costo") or 0), 2)
    return p


def save_presupuesto(data, presupuesto_id=None):
    conn = get_conn()
    if presupuesto_id:
        conn.execute(
            "UPDATE presupuestos SET client_id=?, titulo=?, fecha=?, estado=?, envio_tipo=?, envio_costo=?, notas=?, updated_at=datetime('now') WHERE id=?",
            (data.get("client_id"), data.get("titulo"), data.get("fecha"), data.get("estado"),
             data.get("envio_tipo"), data.get("envio_costo") or 0, data.get("notas"), presupuesto_id),
        )
        conn.commit()
        return presupuesto_id
    cur = conn.execute(
        "INSERT INTO presupuestos (client_id, titulo, fecha, estado, envio_tipo, envio_costo, notas) VALUES (?,?,?,?,?,?,?)",
        (data.get("client_id"), data.get("titulo"), data.get("fecha") or datetime.now().strftime("%Y-%m-%d"),
         data.get("estado") or "Borrador", data.get("envio_tipo") or "Estimativo", data.get("envio_costo") or 0, data.get("notas")),
    )
    conn.commit()
    return cur.lastrowid


def delete_presupuesto(presupuesto_id):
    conn = get_conn()
    conn.execute("DELETE FROM presupuesto_items WHERE presupuesto_id=?", (presupuesto_id,))
    conn.execute("DELETE FROM presupuestos WHERE id=?", (presupuesto_id,))
    conn.commit()


def save_item(data, item_id=None):
    conn = get_conn()
    fields = ("presupuesto_id", "orden", "producto", "medidas", "tela", "cantidad_tela", "precio_tela_metro",
              "mano_obra_costo", "mano_obra_estado", "insumos_cantidad", "insumos_valor_unitario",
              "unidades", "precio_unidad")
    if item_id:
        set_clause = ", ".join(f"{f}=?" for f in fields)
        conn.execute(f"UPDATE presupuesto_items SET {set_clause} WHERE id=?", tuple(data.get(f) for f in fields) + (item_id,))
        conn.commit()
        return item_id
    cols = ", ".join(fields)
    placeholders = ", ".join("?" for _ in fields)
    cur = conn.execute(f"INSERT INTO presupuesto_items ({cols}) VALUES ({placeholders})", tuple(data.get(f) for f in fields))
    conn.commit()
    return cur.lastrowid


def delete_item(item_id):
    conn = get_conn()
    conn.execute("DELETE FROM presupuesto_items WHERE id=?", (item_id,))
    conn.commit()


# ── Objetos Pastel (catálogo) ────────────────────────────────────────────

def _variante_calc(v, linea):
    tela_costo_total = (linea.get("cantidad_tela") or 0) * (v.get("tela_precio_metro") or 0)
    v["tela_costo_total"] = round(tela_costo_total, 2)
    v["costo_total"] = round(tela_costo_total + (linea.get("mano_obra_costo") or 0), 2)
    return v


def list_lineas():
    conn = get_conn()
    lineas = _rows(conn.execute("SELECT * FROM producto_lineas ORDER BY modelo"))
    for l in lineas:
        variantes = _rows(conn.execute("SELECT * FROM producto_variantes WHERE linea_id=? ORDER BY nombre", (l["id"],)))
        l["variantes"] = [_variante_calc(v, l) for v in variantes]
    return lineas


def get_linea(linea_id):
    conn = get_conn()
    l = _row(conn.execute("SELECT * FROM producto_lineas WHERE id=?", (linea_id,)))
    if not l:
        return None
    variantes = _rows(conn.execute("SELECT * FROM producto_variantes WHERE linea_id=? ORDER BY nombre", (linea_id,)))
    l["variantes"] = [_variante_calc(v, l) for v in variantes]
    return l


def save_linea(data, linea_id=None):
    conn = get_conn()
    if linea_id:
        conn.execute(
            "UPDATE producto_lineas SET modelo=?, medidas=?, mano_obra_costo=?, cantidad_tela=? WHERE id=?",
            (data.get("modelo"), data.get("medidas"), data.get("mano_obra_costo") or 0, data.get("cantidad_tela") or 0, linea_id),
        )
        conn.commit()
        return linea_id
    cur = conn.execute(
        "INSERT INTO producto_lineas (modelo, medidas, mano_obra_costo, cantidad_tela) VALUES (?,?,?,?)",
        (data.get("modelo"), data.get("medidas"), data.get("mano_obra_costo") or 0, data.get("cantidad_tela") or 0),
    )
    conn.commit()
    return cur.lastrowid


def delete_linea(linea_id):
    conn = get_conn()
    conn.execute("DELETE FROM producto_variantes WHERE linea_id=?", (linea_id,))
    conn.execute("DELETE FROM producto_lineas WHERE id=?", (linea_id,))
    conn.commit()


def save_variante(data, variante_id=None):
    conn = get_conn()
    if variante_id:
        conn.execute(
            "UPDATE producto_variantes SET linea_id=?, nombre=?, tela_precio_metro=?, precio_final=? WHERE id=?",
            (data.get("linea_id"), data.get("nombre"), data.get("tela_precio_metro") or 0, data.get("precio_final") or 0, variante_id),
        )
        conn.commit()
        return variante_id
    cur = conn.execute(
        "INSERT INTO producto_variantes (linea_id, nombre, tela_precio_metro, precio_final) VALUES (?,?,?,?)",
        (data.get("linea_id"), data.get("nombre"), data.get("tela_precio_metro") or 0, data.get("precio_final") or 0),
    )
    conn.commit()
    return cur.lastrowid


def delete_variante(variante_id):
    conn = get_conn()
    conn.execute("DELETE FROM producto_variantes WHERE id=?", (variante_id,))
    conn.commit()


# ── Stock ────────────────────────────────────────────────────────────────

def list_stock():
    return _rows(get_conn().execute("SELECT * FROM stock ORDER BY updated_at DESC"))


def save_stock(data, stock_id=None):
    conn = get_conn()
    if stock_id:
        conn.execute(
            "UPDATE stock SET producto=?, cantidad=?, tela=?, estado=?, updated_at=datetime('now') WHERE id=?",
            (data.get("producto"), data.get("cantidad") or 0, data.get("tela"), data.get("estado") or "Disponible", stock_id),
        )
        conn.commit()
        return stock_id
    cur = conn.execute(
        "INSERT INTO stock (producto, cantidad, tela, estado) VALUES (?,?,?,?)",
        (data.get("producto"), data.get("cantidad") or 0, data.get("tela"), data.get("estado") or "Disponible"),
    )
    conn.commit()
    return cur.lastrowid


def delete_stock(stock_id):
    conn = get_conn()
    conn.execute("DELETE FROM stock WHERE id=?", (stock_id,))
    conn.commit()


# ── Finanzas ─────────────────────────────────────────────────────────────

def list_ingresos(mes=None, anio=None):
    conn = get_conn()
    q = "SELECT i.*, c.nombre AS client_nombre FROM finance_ingresos i LEFT JOIN clients c ON c.id=i.client_id"
    params = []
    if mes and anio:
        q += " WHERE strftime('%m', i.fecha)=? AND strftime('%Y', i.fecha)=?"
        params = [f"{mes:02d}", str(anio)]
    q += " ORDER BY i.fecha DESC, i.id DESC"
    return _rows(conn.execute(q, params))


def save_ingreso(data, ingreso_id=None):
    conn = get_conn()
    if ingreso_id:
        conn.execute(
            "UPDATE finance_ingresos SET client_id=?, presupuesto_id=?, concepto=?, categoria=?, monto=?, fecha=? WHERE id=?",
            (data.get("client_id"), data.get("presupuesto_id"), data.get("concepto"), data.get("categoria"),
             data.get("monto") or 0, data.get("fecha"), ingreso_id),
        )
        conn.commit()
        return ingreso_id
    cur = conn.execute(
        "INSERT INTO finance_ingresos (client_id, presupuesto_id, concepto, categoria, monto, fecha) VALUES (?,?,?,?,?,?)",
        (data.get("client_id"), data.get("presupuesto_id"), data.get("concepto"), data.get("categoria"),
         data.get("monto") or 0, data.get("fecha") or datetime.now().strftime("%Y-%m-%d")),
    )
    conn.commit()
    return cur.lastrowid


def delete_ingreso(ingreso_id):
    conn = get_conn()
    conn.execute("DELETE FROM finance_ingresos WHERE id=?", (ingreso_id,))
    conn.commit()


def list_gastos(mes=None, anio=None):
    conn = get_conn()
    q = "SELECT * FROM finance_gastos"
    params = []
    if mes and anio:
        q += " WHERE strftime('%m', fecha)=? AND strftime('%Y', fecha)=?"
        params = [f"{mes:02d}", str(anio)]
    q += " ORDER BY fecha DESC, id DESC"
    return _rows(conn.execute(q, params))


def save_gasto(data, gasto_id=None):
    conn = get_conn()
    if gasto_id:
        conn.execute(
            "UPDATE finance_gastos SET concepto=?, categoria=?, proveedor=?, monto=?, fecha=? WHERE id=?",
            (data.get("concepto"), data.get("categoria"), data.get("proveedor"), data.get("monto") or 0, data.get("fecha"), gasto_id),
        )
        conn.commit()
        return gasto_id
    cur = conn.execute(
        "INSERT INTO finance_gastos (concepto, categoria, proveedor, monto, fecha) VALUES (?,?,?,?,?)",
        (data.get("concepto"), data.get("categoria"), data.get("proveedor"), data.get("monto") or 0,
         data.get("fecha") or datetime.now().strftime("%Y-%m-%d")),
    )
    conn.commit()
    return cur.lastrowid


def delete_gasto(gasto_id):
    conn = get_conn()
    conn.execute("DELETE FROM finance_gastos WHERE id=?", (gasto_id,))
    conn.commit()


def list_pagos_proveedores():
    return _rows(get_conn().execute("SELECT * FROM finance_pagos_proveedores ORDER BY fecha DESC, id DESC"))


def save_pago_proveedor(data, pago_id=None):
    conn = get_conn()
    if pago_id:
        conn.execute(
            "UPDATE finance_pagos_proveedores SET proveedor=?, concepto=?, monto=?, metodo=?, fecha=? WHERE id=?",
            (data.get("proveedor"), data.get("concepto"), data.get("monto") or 0, data.get("metodo"), data.get("fecha"), pago_id),
        )
        conn.commit()
        return pago_id
    cur = conn.execute(
        "INSERT INTO finance_pagos_proveedores (proveedor, concepto, monto, metodo, fecha) VALUES (?,?,?,?,?)",
        (data.get("proveedor"), data.get("concepto"), data.get("monto") or 0, data.get("metodo"),
         data.get("fecha") or datetime.now().strftime("%Y-%m-%d")),
    )
    conn.commit()
    return cur.lastrowid


def delete_pago_proveedor(pago_id):
    conn = get_conn()
    conn.execute("DELETE FROM finance_pagos_proveedores WHERE id=?", (pago_id,))
    conn.commit()


def list_retiros():
    return _rows(get_conn().execute("SELECT * FROM finance_retiros ORDER BY fecha DESC, id DESC"))


def save_retiro(data, retiro_id=None):
    conn = get_conn()
    if retiro_id:
        conn.execute(
            "UPDATE finance_retiros SET socia=?, monto=?, notas=?, fecha=? WHERE id=?",
            (data.get("socia"), data.get("monto") or 0, data.get("notas"), data.get("fecha"), retiro_id),
        )
        conn.commit()
        return retiro_id
    cur = conn.execute(
        "INSERT INTO finance_retiros (socia, monto, notas, fecha) VALUES (?,?,?,?)",
        (data.get("socia"), data.get("monto") or 0, data.get("notas"), data.get("fecha") or datetime.now().strftime("%Y-%m-%d")),
    )
    conn.commit()
    return cur.lastrowid


def delete_retiro(retiro_id):
    conn = get_conn()
    conn.execute("DELETE FROM finance_retiros WHERE id=?", (retiro_id,))
    conn.commit()


def finance_summary(mes, anio):
    conn = get_conn()
    ingresos = conn.execute(
        "SELECT COALESCE(SUM(monto),0) AS t FROM finance_ingresos WHERE strftime('%m', fecha)=? AND strftime('%Y', fecha)=?",
        (f"{mes:02d}", str(anio))).fetchone()["t"]
    gastos = conn.execute(
        "SELECT COALESCE(SUM(monto),0) AS t FROM finance_gastos WHERE strftime('%m', fecha)=? AND strftime('%Y', fecha)=?",
        (f"{mes:02d}", str(anio))).fetchone()["t"]
    pagos = conn.execute(
        "SELECT COALESCE(SUM(monto),0) AS t FROM finance_pagos_proveedores WHERE strftime('%m', fecha)=? AND strftime('%Y', fecha)=?",
        (f"{mes:02d}", str(anio))).fetchone()["t"]
    retiros = conn.execute(
        "SELECT COALESCE(SUM(monto),0) AS t FROM finance_retiros WHERE strftime('%m', fecha)=? AND strftime('%Y', fecha)=?",
        (f"{mes:02d}", str(anio))).fetchone()["t"]
    egresos_total = round(gastos + pagos + retiros, 2)
    return {
        "ingresos": round(ingresos, 2),
        "gastos": round(gastos, 2),
        "pagos_proveedores": round(pagos, 2),
        "retiros": round(retiros, 2),
        "egresos_total": egresos_total,
        "balance": round(ingresos - egresos_total, 2),
    }
