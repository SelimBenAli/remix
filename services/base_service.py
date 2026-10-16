"""
Service auto-généré pour Base.
Généré par scaffold.py — les règles insert/update/search viennent de
Base.insert_fields() / update_fields() / search_fields().

Relance scaffold.py avec --force pour régénérer ce fichier (attention,
ça écrase tes modifications manuelles ici).
"""
import json

from peewee import IntegrityError
from werkzeug.security import generate_password_hash

from models.base import Base

# Champs à hasher avant stockage (ex: mot de passe). Vient de
# Base.sensitive_fields() au moment de la génération.
SENSITIVE_FIELDS = []


def _hash_sensitive(payload):
    for field in SENSITIVE_FIELDS:
        if field in payload and payload[field] is not None:
            payload[field] = generate_password_hash(payload[field])
    return payload


def create_base(data):
    """Crée un(e) Base. Renvoie (instance, None) ou (None, erreurs)."""
    data, json_errors = _normalize_product_json(data)
    errors = json_errors + _validate_insert(data)
    if errors:
        return None, errors

    allowed = Base.insert_fields().keys()
    payload = _hash_sensitive({field: data[field] for field in allowed if field in data})
    try:
        instance = Base.create(**payload)
    except IntegrityError:
        return None, ["Une valeur unique existe déjà (contrainte de base de données violée)"]

    return instance, None


def _apply_sort(query, sort, order):
    if sort and hasattr(Base, sort):
        column = getattr(Base, sort)
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


def get_all_bases(page=1, per_page=20, sort=None, order="asc"):
    query = _apply_sort(Base.select(), sort, order)
    return _paginate(query, page, per_page)


def get_base_by_id(id):
    return Base.get_or_none(getattr(Base, "id") == id)


def update_base(id, data):
    """Met à jour un(e) Base. Renvoie (instance, None) ou (None, erreurs)."""
    instance = get_base_by_id(id)
    if instance is None:
        return None, ["Base not found"]

    data, json_errors = _normalize_product_json(data)
    errors = json_errors + _validate_update(data)
    if errors:
        return None, errors

    payload = _hash_sensitive(dict(data))
    for field in Base.update_fields().keys():
        if field in payload:
            setattr(instance, field, payload[field])
    try:
        instance.save()
    except IntegrityError:
        return None, ["Une valeur unique existe déjà (contrainte de base de données violée)"]
    return instance, None


def delete_base(id):
    instance = get_base_by_id(id)
    if instance is None:
        return False
    from services.product_images import delete_product_images
    delete_product_images(instance)
    instance.delete_instance()
    return True


def search_bases(params, page=1, per_page=20, sort=None, order="asc"):
    """`params` : objet type dict/MultiDict (ex: request.args)."""
    query = Base.select()
    for field, rule in Base.search_fields().items():
        value = params.get(field)
        if value in (None, ""):
            continue
        column = getattr(Base, field)
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
    for field, rule in Base.insert_fields().items():
        if rule.get("required") and field not in data:
            errors.append(f"'{field}' is required")
    return errors


def _validate_update(data):
    errors = []
    for field, rule in Base.update_fields().items():
        if rule.get("required") and field in data and data[field] is None:
            errors.append(f"'{field}' cannot be null")
    return errors


def _normalize_product_json(data):
    """Validate and serialize editable product JSON fields for TextField storage."""
    normalized = dict(data)
    errors = []
    for field, expected in (("features", list), ("sizes", list), ("size_guide", dict), ("size_stock", dict)):
        if field not in normalized:
            continue
        value = normalized[field]
        if value in (None, ""):
            normalized[field] = None
            continue
        try:
            value = json.loads(value) if isinstance(value, str) else value
        except (TypeError, ValueError):
            errors.append(f"'{field}' must contain valid JSON")
            continue
        if not isinstance(value, expected):
            errors.append(f"'{field}' must be a JSON {expected.__name__}")
            continue
        normalized[field] = json.dumps(value, ensure_ascii=False)
    if "size_stock" in normalized and normalized["size_stock"]:
        try:
            stock = json.loads(normalized["size_stock"])
            if any(int(amount) < 0 for amount in stock.values()):
                errors.append("'size_stock' values cannot be negative")
            normalized["size_stock"] = json.dumps({str(size): int(amount) for size, amount in stock.items()}, ensure_ascii=False)
        except (TypeError, ValueError):
            errors.append("'size_stock' values must be non-negative integers")
    return normalized, errors


# === CODE CUSTOM (ajoute ton code métier sous cette ligne — préservé automatiquement à chaque régénération) ===
def toggle_sold_out(id):
    """Business rule for 'toggle_sold_out'. Returns (instance, errors)."""
    instance = get_base_by_id(id)
    if instance is None:
        return None, ["Base not found"]

    instance.sold_out = not instance.sold_out
    instance.save()
    return instance, None
