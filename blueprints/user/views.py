"""
Vues auto-générées (CRUD + recherche) pour User.
Généré par scaffold.py.
"""
from flask import request, jsonify
from peewee import ForeignKeyField
from playhouse.shortcuts import model_to_dict

from . import user_bp
from services.user_service import (
    create_user,
    get_all_users,
    get_user_by_id,
    update_user,
    delete_user,
    search_users
)
from auth import token_required, role_required


# Champs jamais renvoyés dans les réponses JSON (ex: mot de passe hashé).
SENSITIVE_FIELDS = ['password']
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
                data[field] = save_uploaded_file(file_storage, subfolder="users")
        return data
    return request.get_json(silent=True) or {}


@user_bp.route("/users", methods=["POST"])
@token_required
@role_required(["admin"])
def create_user_view():
    data = _parse_incoming_data()
    instance, errors = create_user(data)
    if errors:
        return jsonify({"errors": errors}), 400


    return jsonify(_serialize(instance)), 201


@user_bp.route("/users", methods=["GET"])
@token_required
@role_required(["admin"])
def get_all_users_view():
    page, per_page, sort, order = _pagination_params()
    result = get_all_users(page=page, per_page=per_page, sort=sort, order=order)
    return _paginated_response(result)


@user_bp.route("/users/search", methods=["GET"])
@token_required
@role_required(["admin"])
def search_users_view():
    page, per_page, sort, order = _pagination_params()
    result = search_users(request.args, page=page, per_page=per_page, sort=sort, order=order)
    return _paginated_response(result)


@user_bp.route("/users/<int:id>", methods=["GET"])
@token_required
@role_required(["admin"])
def get_user_view(id):
    instance = get_user_by_id(id)
    if instance is None:
        return jsonify({"error": "User not found"}), 404
    return jsonify(_serialize(instance))


@user_bp.route("/users/<int:id>", methods=["PUT"])
@token_required
@role_required(["admin"])
def update_user_view(id):
    data = _parse_incoming_data()
    instance, errors = update_user(id, data)
    if errors:
        status = 404 if errors == ["User not found"] else 400
        return jsonify({"errors": errors}), status


    return jsonify(_serialize(instance))


@user_bp.route("/users/<int:id>", methods=["DELETE"])
@token_required
@role_required(["admin"])
def delete_user_view(id):
    ok = delete_user(id)
    if not ok:
        return jsonify({"error": "User not found"}), 404


    return "", 204


# === CODE CUSTOM (ajoute ton code métier sous cette ligne — préservé automatiquement à chaque régénération) ===
