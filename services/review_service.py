"""
Service auto-généré pour Review.
Généré par scaffold.py — les règles insert/update/search viennent de
Review.insert_fields() / update_fields() / search_fields().

Relance scaffold.py avec --force pour régénérer ce fichier (attention,
ça écrase tes modifications manuelles ici).
"""
from peewee import IntegrityError
from werkzeug.security import generate_password_hash

from models.review import Review

# Champs à hasher avant stockage (ex: mot de passe). Vient de
# Review.sensitive_fields() au moment de la génération.
SENSITIVE_FIELDS = []


def _hash_sensitive(payload):
    for field in SENSITIVE_FIELDS:
        if field in payload and payload[field] is not None:
            payload[field] = generate_password_hash(payload[field])
    return payload


def create_review(data):
    """Crée un(e) Review. Renvoie (instance, None) ou (None, erreurs)."""
    errors = _validate_insert(data)
    if errors:
        return None, errors

    allowed = Review.insert_fields().keys()
    payload = _hash_sensitive({field: data[field] for field in allowed if field in data})
    try:
        instance = Review.create(**payload)
    except IntegrityError:
        return None, ["Une valeur unique existe déjà (contrainte de base de données violée)"]

    return instance, None


def _apply_sort(query, sort, order):
    if sort and hasattr(Review, sort):
        column = getattr(Review, sort)
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


def get_all_reviews(page=1, per_page=20, sort=None, order="asc"):
    query = _apply_sort(Review.select(), sort, order)
    return _paginate(query, page, per_page)


def get_review_by_id(id):
    return Review.get_or_none(getattr(Review, "id") == id)


def update_review(id, data):
    """Met à jour un(e) Review. Renvoie (instance, None) ou (None, erreurs)."""
    instance = get_review_by_id(id)
    if instance is None:
        return None, ["Review not found"]

    errors = _validate_update(data)
    if errors:
        return None, errors

    payload = _hash_sensitive(dict(data))
    for field in Review.update_fields().keys():
        if field in payload:
            setattr(instance, field, payload[field])
    try:
        instance.save()
    except IntegrityError:
        return None, ["Une valeur unique existe déjà (contrainte de base de données violée)"]
    return instance, None


def delete_review(id):
    instance = get_review_by_id(id)
    if instance is None:
        return False
    instance.delete_instance()
    return True


def search_reviews(params, page=1, per_page=20, sort=None, order="asc"):
    """`params` : objet type dict/MultiDict (ex: request.args)."""
    query = Review.select()
    for field, rule in Review.search_fields().items():
        value = params.get(field)
        if value in (None, ""):
            continue
        column = getattr(Review, field)
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
    for field, rule in Review.insert_fields().items():
        if rule.get("required") and field not in data:
            errors.append(f"'{field}' is required")
    return errors


def _validate_update(data):
    errors = []
    for field, rule in Review.update_fields().items():
        if rule.get("required") and field in data and data[field] is None:
            errors.append(f"'{field}' cannot be null")
    return errors


# === CODE CUSTOM (ajoute ton code métier sous cette ligne — préservé automatiquement à chaque régénération) ===
