"""Pastel Studio — servidor Flask con todos los endpoints."""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from flask import Flask, jsonify, request, send_from_directory

from backend import database as db

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")

with app.app_context():
    db.init_db()


def ok(data=None, status=200):
    return jsonify(data if data is not None else {"ok": True}), status


# ── Frontend ─────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


# ── Clients ──────────────────────────────────────────────────────────────

@app.route("/api/clients", methods=["GET"])
def api_list_clients():
    return ok(db.list_clients())


@app.route("/api/clients", methods=["POST"])
def api_create_client():
    cid = db.save_client(request.json or {})
    return ok(db.get_client(cid), 201)


@app.route("/api/clients/<int:client_id>", methods=["PUT"])
def api_update_client(client_id):
    db.save_client(request.json or {}, client_id)
    return ok(db.get_client(client_id))


@app.route("/api/clients/<int:client_id>", methods=["DELETE"])
def api_delete_client(client_id):
    db.delete_client(client_id)
    return ok()


# ── Presupuestos ─────────────────────────────────────────────────────────

@app.route("/api/presupuestos", methods=["GET"])
def api_list_presupuestos():
    client_id = request.args.get("client_id", type=int)
    return ok(db.list_presupuestos(client_id))


@app.route("/api/presupuestos/<int:pid>", methods=["GET"])
def api_get_presupuesto(pid):
    p = db.get_presupuesto(pid)
    if not p:
        return ok({"error": "no encontrado"}, 404)
    return ok(p)


@app.route("/api/presupuestos", methods=["POST"])
def api_create_presupuesto():
    pid = db.save_presupuesto(request.json or {})
    return ok(db.get_presupuesto(pid), 201)


@app.route("/api/presupuestos/<int:pid>", methods=["PUT"])
def api_update_presupuesto(pid):
    db.save_presupuesto(request.json or {}, pid)
    return ok(db.get_presupuesto(pid))


@app.route("/api/presupuestos/<int:pid>", methods=["DELETE"])
def api_delete_presupuesto(pid):
    db.delete_presupuesto(pid)
    return ok()


@app.route("/api/presupuestos/<int:pid>/items", methods=["POST"])
def api_create_item(pid):
    data = request.json or {}
    data["presupuesto_id"] = pid
    db.save_item(data)
    return ok(db.get_presupuesto(pid), 201)


@app.route("/api/presupuesto_items/<int:item_id>", methods=["PUT"])
def api_update_item(item_id):
    data = request.json or {}
    db.save_item(data, item_id)
    return ok(db.get_presupuesto(data.get("presupuesto_id")))


@app.route("/api/presupuesto_items/<int:item_id>", methods=["DELETE"])
def api_delete_item(item_id):
    pid = request.args.get("presupuesto_id", type=int)
    db.delete_item(item_id)
    return ok(db.get_presupuesto(pid) if pid else {"ok": True})


# ── Objetos Pastel (catálogo) ────────────────────────────────────────────

@app.route("/api/lineas", methods=["GET"])
def api_list_lineas():
    return ok(db.list_lineas())


@app.route("/api/lineas/<int:linea_id>", methods=["GET"])
def api_get_linea(linea_id):
    l = db.get_linea(linea_id)
    if not l:
        return ok({"error": "no encontrada"}, 404)
    return ok(l)


@app.route("/api/lineas", methods=["POST"])
def api_create_linea():
    lid = db.save_linea(request.json or {})
    return ok(db.get_linea(lid), 201)


@app.route("/api/lineas/<int:linea_id>", methods=["PUT"])
def api_update_linea(linea_id):
    db.save_linea(request.json or {}, linea_id)
    return ok(db.get_linea(linea_id))


@app.route("/api/lineas/<int:linea_id>", methods=["DELETE"])
def api_delete_linea(linea_id):
    db.delete_linea(linea_id)
    return ok()


@app.route("/api/lineas/<int:linea_id>/variantes", methods=["POST"])
def api_create_variante(linea_id):
    data = request.json or {}
    data["linea_id"] = linea_id
    db.save_variante(data)
    return ok(db.get_linea(linea_id), 201)


@app.route("/api/variantes/<int:variante_id>", methods=["PUT"])
def api_update_variante(variante_id):
    data = request.json or {}
    db.save_variante(data, variante_id)
    return ok(db.get_linea(data.get("linea_id")))


@app.route("/api/variantes/<int:variante_id>", methods=["DELETE"])
def api_delete_variante(variante_id):
    linea_id = request.args.get("linea_id", type=int)
    db.delete_variante(variante_id)
    return ok(db.get_linea(linea_id) if linea_id else {"ok": True})


# ── Stock ────────────────────────────────────────────────────────────────

@app.route("/api/stock", methods=["GET"])
def api_list_stock():
    return ok(db.list_stock())


@app.route("/api/stock", methods=["POST"])
def api_create_stock():
    sid = db.save_stock(request.json or {})
    return ok({"id": sid}, 201)


@app.route("/api/stock/<int:stock_id>", methods=["PUT"])
def api_update_stock(stock_id):
    db.save_stock(request.json or {}, stock_id)
    return ok()


@app.route("/api/stock/<int:stock_id>", methods=["DELETE"])
def api_delete_stock(stock_id):
    db.delete_stock(stock_id)
    return ok()


# ── Finanzas ─────────────────────────────────────────────────────────────

@app.route("/api/finanzas/resumen", methods=["GET"])
def api_finance_summary():
    mes = request.args.get("mes", type=int)
    anio = request.args.get("anio", type=int)
    return ok(db.finance_summary(mes, anio))


@app.route("/api/finanzas/ingresos", methods=["GET"])
def api_list_ingresos():
    mes = request.args.get("mes", type=int)
    anio = request.args.get("anio", type=int)
    return ok(db.list_ingresos(mes, anio))


@app.route("/api/finanzas/ingresos", methods=["POST"])
def api_create_ingreso():
    iid = db.save_ingreso(request.json or {})
    return ok({"id": iid}, 201)


@app.route("/api/finanzas/ingresos/<int:ingreso_id>", methods=["DELETE"])
def api_delete_ingreso(ingreso_id):
    db.delete_ingreso(ingreso_id)
    return ok()


@app.route("/api/finanzas/gastos", methods=["GET"])
def api_list_gastos():
    mes = request.args.get("mes", type=int)
    anio = request.args.get("anio", type=int)
    return ok(db.list_gastos(mes, anio))


@app.route("/api/finanzas/gastos", methods=["POST"])
def api_create_gasto():
    gid = db.save_gasto(request.json or {})
    return ok({"id": gid}, 201)


@app.route("/api/finanzas/gastos/<int:gasto_id>", methods=["DELETE"])
def api_delete_gasto(gasto_id):
    db.delete_gasto(gasto_id)
    return ok()


@app.route("/api/finanzas/pagos_proveedores", methods=["GET"])
def api_list_pagos():
    return ok(db.list_pagos_proveedores())


@app.route("/api/finanzas/pagos_proveedores", methods=["POST"])
def api_create_pago():
    pid = db.save_pago_proveedor(request.json or {})
    return ok({"id": pid}, 201)


@app.route("/api/finanzas/pagos_proveedores/<int:pago_id>", methods=["DELETE"])
def api_delete_pago(pago_id):
    db.delete_pago_proveedor(pago_id)
    return ok()


@app.route("/api/finanzas/retiros", methods=["GET"])
def api_list_retiros():
    return ok(db.list_retiros())


@app.route("/api/finanzas/retiros", methods=["POST"])
def api_create_retiro():
    rid = db.save_retiro(request.json or {})
    return ok({"id": rid}, 201)


@app.route("/api/finanzas/retiros/<int:retiro_id>", methods=["DELETE"])
def api_delete_retiro(retiro_id):
    db.delete_retiro(retiro_id)
    return ok()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    app.run(host="0.0.0.0", port=port, debug=True)
