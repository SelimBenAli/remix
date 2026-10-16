"""
Vues auto-générées (CRUD + recherche) pour Base.
Généré par scaffold.py.
"""
from flask import request, jsonify
from peewee import ForeignKeyField
from playhouse.shortcuts import model_to_dict

from . import base_bp
from services.base_service import (
    create_base,
    get_all_bases,
    get_base_by_id,
    update_base,
    delete_base,
    search_bases,
    toggle_sold_out
)
from auth import token_required
from services.product_images import product_images, save_product_images, validate_image_uploads, set_showroom_image, set_primary_image


# Champs jamais renvoyés dans les réponses JSON (ex: mot de passe hashé).
SENSITIVE_FIELDS = []
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
    data["images"] = product_images(instance)
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
        for field in ("sold_out", "is_active", "ordered_even_out_of_stock"):
            if field in data:
                data[field] = data[field].strip().lower() in ("true", "1", "yes", "on")
        data["_images"] = request.files.getlist("images")
        data["_remove_image_ids"] = request.form.getlist("remove_image_ids")
        data["_showroom_image_id"] = request.form.get("showroom_image_id")
        data["_main_image_id"] = request.form.get("main_image_id")
        return data
    data = request.get_json(silent=True) or {}
    data["_showroom_image_id"] = data.pop("showroom_image_id", None)
    data["_main_image_id"] = data.pop("main_image_id", None)
    return data


@base_bp.route("/bases", methods=["POST"])
@token_required
def create_base_view():
    data = _parse_incoming_data()
    files = data.pop("_images", [])
    remove_ids = data.pop("_remove_image_ids", [])
    showroom_image_id = data.pop("_showroom_image_id", None)
    main_image_id = data.pop("_main_image_id", None)
    try:
        validate_image_uploads(files)
    except ValueError as exc:
        return jsonify({"errors": [str(exc)]}), 400
    instance, errors = create_base(data)
    if errors:
        return jsonify({"errors": errors}), 400
    save_product_images(instance, files, remove_ids)
    if main_image_id and not set_primary_image(instance, int(main_image_id)):
        return jsonify({"errors": ["The selected main image does not belong to this base"]}), 400
    if showroom_image_id and not set_showroom_image(instance, int(showroom_image_id)):
        return jsonify({"errors": ["The selected showroom image does not belong to this base"]}), 400
    return jsonify(_serialize(instance)), 201


@base_bp.route("/bases", methods=["GET"])
@token_required
def get_all_bases_view():
    page, per_page, sort, order = _pagination_params()
    result = get_all_bases(page=page, per_page=per_page, sort=sort, order=order)
    return _paginated_response(result)


@base_bp.route("/bases/search", methods=["GET"])
@token_required
def search_bases_view():
    page, per_page, sort, order = _pagination_params()
    result = search_bases(request.args, page=page, per_page=per_page, sort=sort, order=order)
    return _paginated_response(result)


@base_bp.route("/bases/<int:id>", methods=["GET"])
@token_required
def get_base_view(id):
    instance = get_base_by_id(id)
    if instance is None:
        return jsonify({"error": "Base not found"}), 404
    return jsonify(_serialize(instance))


@base_bp.route("/bases/<int:id>", methods=["PUT"])
@token_required
def update_base_view(id):
    data = _parse_incoming_data()
    files = data.pop("_images", [])
    remove_ids = data.pop("_remove_image_ids", [])
    showroom_image_id = data.pop("_showroom_image_id", None)
    main_image_id = data.pop("_main_image_id", None)
    try:
        validate_image_uploads(files)
    except ValueError as exc:
        return jsonify({"errors": [str(exc)]}), 400
    instance, errors = update_base(id, data)
    if errors:
        status = 404 if errors == ["Base not found"] else 400
        return jsonify({"errors": errors}), status
    save_product_images(instance, files, remove_ids)
    if main_image_id and not set_primary_image(instance, int(main_image_id)):
        return jsonify({"errors": ["The selected main image does not belong to this base"]}), 400
    if showroom_image_id and not set_showroom_image(instance, int(showroom_image_id)):
        return jsonify({"errors": ["The selected showroom image does not belong to this base"]}), 400
    return jsonify(_serialize(instance))


@base_bp.route("/bases/<int:id>", methods=["DELETE"])
@token_required
def delete_base_view(id):
    ok = delete_base(id)
    if not ok:
        return jsonify({"error": "Base not found"}), 404


    return "", 204


@base_bp.route("/bases/<int:id>/toggle_sold_out", methods=["PATCH"])
@token_required
def toggle_sold_out_view(id):
    data = (request.get_json(silent=True) or {})
    errors = []

    if errors:
        return jsonify({"errors": errors}), 400
    result, errors = toggle_sold_out(id)
    if errors:
        return jsonify({"errors": errors}), 400


    return jsonify(_json_safe(result))


# === CODE CUSTOM (ajoute ton code métier sous cette ligne — préservé automatiquement à chaque régénération) ===
