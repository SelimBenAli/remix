"""
Service auto-généré pour User.
Généré par scaffold.py — les règles insert/update/search viennent de
User.insert_fields() / update_fields() / search_fields().

Relance scaffold.py avec --force pour régénérer ce fichier (attention,
ça écrase tes modifications manuelles ici).
"""
from peewee import IntegrityError
from werkzeug.security import generate_password_hash

from models.user import User

# Champs à hasher avant stockage (ex: mot de passe). Vient de
# User.sensitive_fields() au moment de la génération.
SENSITIVE_FIELDS = ['password']


def _hash_sensitive(payload):
    for field in SENSITIVE_FIELDS:
        if field in payload and payload[field] is not None:
            payload[field] = generate_password_hash(payload[field])
    return payload


def create_user(data):
    """Crée un(e) User. Renvoie (instance, None) ou (None, erreurs)."""
    errors = _validate_insert(data)
    if errors:
        return None, errors

    allowed = User.insert_fields().keys()
    payload = _hash_sensitive({field: data[field] for field in allowed if field in data})
    try:
        instance = User.create(**payload)
    except IntegrityError:
        return None, ["Une valeur unique existe déjà (contrainte de base de données violée)"]

    return instance, None


def _apply_sort(query, sort, order):
    if sort and hasattr(User, sort):
        column = getattr(User, sort)
        query = query.order_by(column.desc() if order == "desc" else column.asc())
    return query


def _paginate(query, page, per_page):
    page = max(1, page)
    per_page = max(1, min(per_page, 200))  # borne haute pour éviter un ?per_page=999999
    total = query.count()
    items = list(query.paginate(page, per_page))
    return {
        "items": items,
        "page": page,
        "per_page": per_page,
        "total": total,
        "total_pages": max(1, (total + per_page - 1) // per_page),
    }


def get_all_users(page=1, per_page=20, sort=None, order="asc"):
    query = _apply_sort(User.select(), sort, order)
    return _paginate(query, page, per_page)


def get_user_by_id(id):
    return User.get_or_none(getattr(User, "id") == id)


def update_user(id, data):
    """Met à jour un(e) User. Renvoie (instance, None) ou (None, erreurs)."""
    instance = get_user_by_id(id)
    if instance is None:
        return None, ["User not found"]

    errors = _validate_update(data)
    if errors:
        return None, errors

    payload = _hash_sensitive(dict(data))
    for field in User.update_fields().keys():
        if field in payload:
            setattr(instance, field, payload[field])
    try:
        instance.save()
    except IntegrityError:
        return None, ["Une valeur unique existe déjà (contrainte de base de données violée)"]
    return instance, None


def delete_user(id):
    instance = get_user_by_id(id)
    if instance is None:
        return False
    instance.delete_instance()
    return True


def search_users(params, page=1, per_page=20, sort=None, order="asc"):
    """`params` : objet type dict/MultiDict (ex: request.args)."""
    query = User.select()
    for field, rule in User.search_fields().items():
        value = params.get(field)
        if value in (None, ""):
            continue
        column = getattr(User, field)
        operator = rule.get("operator", "eq")
        if operator == "like":
            query = query.where(column.contains(value))
        elif operator == "eq":
            query = query.where(column == value)
        elif operator == "gt":
            query = query.where(column > value)
        elif operator == "lt":
            query = query.where(column < value)
        elif operator == "in":
            values = value if isinstance(value, (list, tuple)) else [value]
            query = query.where(column.in_(values))
    query = _apply_sort(query, sort, order)
    return _paginate(query, page, per_page)


def _validate_insert(data):
    errors = []
    for field, rule in User.insert_fields().items():
        if rule.get("required") and field not in data:
            errors.append(f"'{field}' is required")
    return errors


def _validate_update(data):
    errors = []
    for field, rule in User.update_fields().items():
        if rule.get("required") and field in data and data[field] is None:
            errors.append(f"'{field}' cannot be null")
    return errors


# === CODE CUSTOM (ajoute ton code métier sous cette ligne — préservé automatiquement à chaque régénération) ===
