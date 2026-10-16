"""
Vues auto-générées (CRUD + recherche) pour Order.
Généré par scaffold.py.
"""
from flask import request, jsonify
from peewee import ForeignKeyField
from playhouse.shortcuts import model_to_dict

from . import order_bp
from models.order_item import OrderItem
from services.order_service import (
    create_order,
    get_all_orders,
    get_order_by_id,
    update_order,
    delete_order,
    search_orders,
    mark_paid,
    ship,
    cancel
)
from auth import token_required, role_required


# Champs jamais renvoyés dans les réponses JSON (ex: mot de passe hashé).
SENSITIVE_FIELDS = []
# Champs de type fichier/image (voir uploads.py) — vide si aucun.
FILE_FIELDS = []



def _serialize(instance):
    """Sérialise une instance en dict JSON-safe. Les champs ForeignKeyField
    sont exposés sous '<field>_id' (ex: 'user_id') plutôt que sous le nom
    de champ Peewee brut ('user'), pour matcher ce qu'on attend en entrée
    (insert_fields/update_fields/search_fields utilisent tous '<field>_id').
    Les champs de SENSITIVE_FIELDS sont retirés (ex: mot de passe).
    """
    data = model_to_dict(instance, recurse=False)
    for field_name, field_obj in type(instance)._meta.fields.items():
        if isinstance(field_obj, ForeignKeyField) and field_name in data:
            data[f"{field_name}_id"] = data.pop(field_name)
    for field in SENSITIVE_FIELDS:
        data.pop(field, None)
    return data


def _json_safe(value):
    """Convertit le résultat d'une fonction métier custom (custom_functions)
    en JSON-safe : sérialise une instance Peewee (ou une liste d'instances)
    comme les autres routes, laisse le reste tel quel (dict, liste, str,
    nombre...)."""
    if hasattr(value, "_meta") and hasattr(value, "__data__"):
        return _serialize(value)
    if isinstance(value, (list, tuple)):
        return [_json_safe(v) for v in value]
    return value


def _pagination_params():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    sort = request.args.get("sort") or None
    order = "desc" if request.args.get("order") == "desc" else "asc"
    return page, per_page, sort, order


def _paginated_response(result):
    return jsonify({
        "items": [_serialize(i) for i in result["items"]],
        "page": result["page"],
        "per_page": result["per_page"],
        "total": result["total"],
        "total_pages": result["total_pages"],
    })


def _parse_incoming_data():
    """Lit le payload de la requête. Si c'est un envoi multipart (upload de
    fichier depuis un <form>), sauvegarde les fichiers de FILE_FIELDS et
    remplace leur valeur par le chemin stocké ; sinon lit du JSON classique."""
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        data = request.form.to_dict()
        for field in FILE_FIELDS:
            file_storage = request.files.get(field)
            if file_storage and file_storage.filename:
                data[field] = save_uploaded_file(file_storage, subfolder="orders")
        return data
    return request.get_json(silent=True) or {}


@order_bp.route("/orders", methods=["POST"])
@token_required
@role_required(["admin"])
def create_order_view():
    data = _parse_incoming_data()
    instance, errors = create_order(data)
    if errors:
        return jsonify({"errors": errors}), 400


    return jsonify(_serialize(instance)), 201


@order_bp.route("/orders", methods=["GET"])
@token_required
@role_required(["admin"])
def get_all_orders_view():
    page, per_page, sort, order = _pagination_params()
    result = get_all_orders(page=page, per_page=per_page, sort=sort, order=order)
    return _paginated_response(result)


@order_bp.route("/orders/search", methods=["GET"])
@token_required
@role_required(["admin"])
def search_orders_view():
    page, per_page, sort, order = _pagination_params()
    result = search_orders(request.args, page=page, per_page=per_page, sort=sort, order=order)
    return _paginated_response(result)


@order_bp.route("/orders/<int:id>", methods=["GET"])
@token_required
@role_required(["admin"])
def get_order_view(id):
    instance = get_order_by_id(id)
    if instance is None:
        return jsonify({"error": "Order not found"}), 404
    return jsonify(_serialize(instance))


@order_bp.route("/orders/<int:id>/items", methods=["GET"])
@token_required
@role_required(["admin"])
def get_order_items_view(id):
    order = get_order_by_id(id)
    if order is None:
        return jsonify({"error": "Order not found"}), 404
    items = OrderItem.select().where(OrderItem.order == order.id).order_by(OrderItem.id.asc())
    return jsonify({
        "orderId": order.id,
        "fullName": order.full_name,
        "total": float(order.total or 0),
        "status": order.status,
        "customer": {
            "email": order.email,
            "phone": order.phone,
            "address": order.address,
            "region": order.region,
            "city": order.city,
            "country": order.country,
            "paymentMethod": order.payment_method,
        },
        "items": [{
            "kind": item.kind,
            "name": item.name,
            "size": item.size,
            "quantity": item.quantity,
            "unitPrice": float(item.unit_price or 0),
            "lineTotal": float((item.unit_price or 0) * item.quantity),
        } for item in items],
    })


@order_bp.route("/orders/<int:id>", methods=["PUT"])
@token_required
@role_required(["admin"])
def update_order_view(id):
    data = _parse_incoming_data()
    instance, errors = update_order(id, data)
    if errors:
        status = 404 if errors == ["Order not found"] else 400
        return jsonify({"errors": errors}), status


    return jsonify(_serialize(instance))


@order_bp.route("/orders/<int:id>", methods=["DELETE"])
@token_required
@role_required(["admin"])
def delete_order_view(id):
    ok = delete_order(id)
    if not ok:
        return jsonify({"error": "Order not found"}), 404


    return "", 204


@order_bp.route("/orders/<int:id>/mark_paid", methods=["PATCH"])
@token_required
@role_required(["admin"])
def mark_paid_view(id):
    data = (request.get_json(silent=True) or {})
    errors = []

    if errors:
        return jsonify({"errors": errors}), 400
    result, errors = mark_paid(id)
    if errors:
        return jsonify({"errors": errors}), 400


    return jsonify(_json_safe(result))


@order_bp.route("/orders/<int:id>/ship", methods=["PATCH"])
@token_required
@role_required(["admin"])
def ship_view(id):
    data = (request.get_json(silent=True) or {})
    errors = []

    if errors:
        return jsonify({"errors": errors}), 400
    result, errors = ship(id)
    if errors:
        return jsonify({"errors": errors}), 400


    return jsonify(_json_safe(result))


@order_bp.route("/orders/<int:id>/cancel", methods=["PATCH"])
@token_required
@role_required(["admin"])
def cancel_view(id):
    data = (request.get_json(silent=True) or {})
    errors = []

    if errors:
        return jsonify({"errors": errors}), 400
    result, errors = cancel(id)
    if errors:
        return jsonify({"errors": errors}), 400


    return jsonify(_json_safe(result))


# === CODE CUSTOM (ajoute ton code métier sous cette ligne — préservé automatiquement à chaque régénération) ===
