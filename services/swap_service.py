"""
Service auto-généré pour Swap.
Généré par scaffold.py — les règles insert/update/search viennent de
Swap.insert_fields() / update_fields() / search_fields().

Relance scaffold.py avec --force pour régénérer ce fichier (attention,
ça écrase tes modifications manuelles ici).
"""
from peewee import IntegrityError
from werkzeug.security import generate_password_hash

from models.swap import Swap

# Champs à hasher avant stockage (ex: mot de passe). Vient de
# Swap.sensitive_fields() au moment de la génération.
SENSITIVE_FIELDS = []


def _hash_sensitive(payload):
    for field in SENSITIVE_FIELDS:
        if field in payload and payload[field] is not None:
            payload[field] = generate_password_hash(payload[field])
    return payload


def create_swap(data):
    """Crée un(e) Swap. Renvoie (instance, None) ou (None, erreurs)."""
    data, stock_errors = _normalize_stock(data)
    errors = stock_errors + _validate_insert(data)
    if errors:
        return None, errors

    allowed = Swap.insert_fields().keys()
    payload = _hash_sensitive({field: data[field] for field in allowed if field in data})
    try:
        instance = Swap.create(**payload)
    except IntegrityError:
        return None, ["Une valeur unique existe déjà (contrainte de base de données violée)"]

    return instance, None


def _apply_sort(query, sort, order):
    if sort and hasattr(Swap, sort):
        column = getattr(Swap, sort)
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


def get_all_swaps(page=1, per_page=20, sort=None, order="asc"):
    query = _apply_sort(Swap.select(), sort, order)
    return _paginate(query, page, per_page)


def get_swap_by_id(id):
    return Swap.get_or_none(getattr(Swap, "id") == id)


def update_swap(id, data):
    """Met à jour un(e) Swap. Renvoie (instance, None) ou (None, erreurs)."""
    instance = get_swap_by_id(id)
    if instance is None:
        return None, ["Swap not found"]

    data, stock_errors = _normalize_stock(data)
    errors = stock_errors + _validate_update(data)
    if errors:
        return None, errors

    payload = _hash_sensitive(dict(data))
    for field in Swap.update_fields().keys():
        if field in payload:
            setattr(instance, field, payload[field])
    try:
        instance.save()
    except IntegrityError:
        return None, ["Une valeur unique existe déjà (contrainte de base de données violée)"]
    return instance, None


def delete_swap(id):
    instance = get_swap_by_id(id)
    if instance is None:
        return False
    from services.product_images import delete_product_images
    delete_product_images(instance)
    instance.delete_instance()
    return True


def search_swaps(params, page=1, per_page=20, sort=None, order="asc"):
    """`params` : objet type dict/MultiDict (ex: request.args)."""
    query = Swap.select()
    for field, rule in Swap.search_fields().items():
        value = params.get(field)
        if value in (None, ""):
            continue
        column = getattr(Swap, field)
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
    for field, rule in Swap.insert_fields().items():
        if rule.get("required") and field not in data:
            errors.append(f"'{field}' is required")
    return errors


def _validate_update(data):
    errors = []
    for field, rule in Swap.update_fields().items():
        if rule.get("required") and field in data and data[field] is None:
            errors.append(f"'{field}' cannot be null")
    return errors


def _normalize_stock(data):
    normalized = dict(data)
    if "stock_quantity" not in normalized:
        return normalized, []
    value = normalized["stock_quantity"]
    if value in (None, ""):
        normalized["stock_quantity"] = None
        return normalized, []
    try:
        value = int(value)
    except (TypeError, ValueError):
        return normalized, ["'stock_quantity' must be a non-negative integer or blank"]
    if value < 0:
        return normalized, ["'stock_quantity' cannot be negative"]
    normalized["stock_quantity"] = value
    return normalized, []


# === CODE CUSTOM (ajoute ton code métier sous cette ligne — préservé automatiquement à chaque régénération) ===
