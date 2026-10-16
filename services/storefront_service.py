"""
Storefront service — the public shop logic written by hand (not generated).

The generated *_service.py files are admin-oriented CRUD (and sit behind
JWT auth). This module is what the public site uses: catalogue listing,
guest carts keyed by the Flask session, checkout and the newsletter.

Convention (same as the generated services): functions return
(result, errors) where errors is None on success or a list of messages.
"""
import json
import re
from decimal import Decimal

from peewee import IntegrityError, fn

from extensions import db
from models.artist import Artist
from models.base import Base
from models.cart import Cart
from models.cart_item import CartItem
from models.order import Order
from models.order_item import OrderItem
from models.review import Review
from models.product_request import ProductRequest
from models.subscriber import Subscriber
from models.swap import Swap
from services.product_images import product_images


def _legacy_image_url(value):
    if value and not value.startswith(("/", "http://", "https://")):
        return "/uploads/" + value.lstrip("/")
    return value


def _json_field(value, fallback):
    if not value:
        return fallback
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return fallback

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class _Unavailable(Exception):
    """Raised inside the checkout transaction to roll it back."""


# ---------------------------------------------------------------------------
# Serializers (Decimal -> float so jsonify works)
# ---------------------------------------------------------------------------
def base_to_dict(b):
    images = product_images(b)
    storefront_images = [image for image in images if not image.get("useInShowroom") and not image.get("showroomPlaceholder")]
    if not storefront_images and b.image_url:
        storefront_images = [{"id": None, "url": _legacy_image_url(b.image_url), "sortOrder": 0}]
    return {
        "id": b.id, "name": b.name, "type": b.type, "price": float(b.price),
        "badge": b.badge, "soldOut": b.sold_out,
        "color": b.color,
        "description": b.description,
        "features": _json_field(b.features, []),
        "sizes": _json_field(b.sizes, []),
        "sizeStock": _json_field(b.size_stock, {}),
        "inStock": b.is_active and _is_in_stock(b),
        "sizeGuide": _json_field(b.size_guide, {}),
        "details": b.details,
        "materialsCare": b.materials_care,
        "fit": b.fit,
        "shippingReturns": b.shipping_returns,
        "includedPanel": bool(b.included_panel),
        "orderedEvenOutOfStock": bool(b.ordered_even_out_of_stock),
        "imageUrl": storefront_images[0]["url"] if storefront_images else None, "images": images,
    }


def swap_to_dict(s):
    images = product_images(s)
    if not images and s.image_url:
        images = [{"id": None, "url": _legacy_image_url(s.image_url), "sortOrder": 0}]
    return {
        "id": s.id, "name": s.name, "artist": s.artist.name, "artistId": s.artist_id,
        "artistBio": s.artist.bio,
        "price": 0.0 if s.is_free else float(s.price), "free": s.is_free,
        "popularity": s.popularity, "imageUrl": images[0]["url"] if images else None,
        "originalImageUrl": images[0].get("originalUrl", images[0]["url"]) if images else None,
        "images": images,
        "stockQuantity": s.stock_quantity,
        "inStock": s.is_active and (s.stock_quantity is None or s.stock_quantity > 0),
        "orderedEvenOutOfStock": bool(s.ordered_even_out_of_stock),
        "created": s.created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# Catalogue
# ---------------------------------------------------------------------------
def list_bases(type_=None, sort="featured"):
    query = Base.select().where(Base.is_active == True)  # noqa: E712
    if type_:
        query = query.where(Base.type == type_)
    order = {
        "price-asc": [Base.price.asc()],
        "price-desc": [Base.price.desc()],
        "name-asc": [Base.name.asc()],
    }.get(sort, [Base.id.asc()])
    return [base_to_dict(b) for b in query.order_by(*order)]


def list_swaps(artist_id=None, sort="newest"):
    query = (Swap.select(Swap, Artist).join(Artist)
             .where(Swap.is_active == True))  # noqa: E712
    if artist_id:
        query = query.where(Swap.artist == artist_id)
    order = {
        "popular": [Swap.popularity.desc()],
        "price-asc": [Swap.price.asc()],
        "price-desc": [Swap.price.desc()],
    }.get(sort, [Swap.created_at.desc(), Swap.id.desc()])
    return [swap_to_dict(s) for s in query.order_by(*order)]


def get_product(kind, product_id):
    """Return one active base or swap in the same shape used by the catalogues."""
    if kind == "base":
        product = Base.get_or_none(
            (Base.id == product_id) & (Base.is_active == True)  # noqa: E712
        )
        if product is None:
            return None
        result = {**base_to_dict(product), "kind": "base", "category": product.type}
        stock = result["sizeStock"]
        if result["soldOut"]:
            result["inStock"] = False
        elif stock:
            result["inStock"] = any(int(stock.get(size, 0) or 0) > 0 for size in result["sizes"])
        else:
            result["inStock"] = True
        return result

    if kind == "swap":
        product = (Swap.select(Swap, Artist).join(Artist)
                   .where((Swap.id == product_id) & (Swap.is_active == True))  # noqa: E712
                   .first())
        if product is None:
            return None
        return {**swap_to_dict(product), "kind": "swap", "category": "Art panel"}

    return None


def list_artists(limit=None):
    """Artists that have at least one active swap, with up to 3 swap names."""
    artists = (Artist.select().join(Swap).where(Swap.is_active == True)  # noqa: E712
               .group_by(Artist.id).order_by(fn.COUNT(Swap.id).desc()))
    if limit:
        artists = artists.limit(limit)
    result = []
    for a in artists:
        swaps = list(a.swaps.where(Swap.is_active == True).limit(3))  # noqa: E712
        result.append({"id": a.id, "name": a.name, "bio": a.bio,
                       "swaps": [s.name for s in swaps]})
    return result


def list_reviews(limit=3):
    query = (Review.select().where(Review.is_published == True)  # noqa: E712
             .order_by(Review.created_at.desc()).limit(limit))
    return [{"name": r.author_name, "rating": r.rating, "quote": r.quote} for r in query]


# ---------------------------------------------------------------------------
# Cart (guest cart identified by the Flask session key)
# ---------------------------------------------------------------------------
def get_or_create_cart(session_key):
    cart = Cart.get_or_none(Cart.session_key == session_key)
    return cart or Cart.create(session_key=session_key)


def _item_info(item):
    """(name, unit_price, available) for a cart item."""
    if item.kind == "base":
        b = item.base
        return b.name, Decimal(b.price), b.is_active and (_is_in_stock(b, item.size) or _can_order_out_of_stock(b))
    s = item.swap
    return s.name, Decimal(0) if s.is_free else Decimal(s.price), s.is_active and (_is_in_stock(s) or _can_order_out_of_stock(s))


def _primary_image(product):
    images = product_images(product)
    storefront_images = [image for image in images if not image.get("useInShowroom") and not image.get("showroomPlaceholder")]
    if storefront_images:
        return storefront_images[0]["url"]
    return _legacy_image_url(product.image_url)


def _is_in_stock(product, size=None):
    if isinstance(product, Base):
        if product.sold_out:
            return False
        stock = _json_field(product.size_stock, {})
        if not stock:
            return True
        if size is None:
            return any(int(stock.get(label, 0) or 0) > 0 for label in _json_field(product.sizes, []))
        return int(stock.get(size, 0) or 0) > 0
    return product.stock_quantity is None or product.stock_quantity > 0


def _can_order_out_of_stock(product):
    return bool(product.ordered_even_out_of_stock)


def cart_summary(session_key):
    cart = get_or_create_cart(session_key)
    lines, total = [], Decimal(0)
    for item in cart.items:
        name, price, available = _item_info(item)
        product = item.base if item.kind == "base" else item.swap
        line_total = price * item.quantity
        total += line_total
        lines.append({"id": item.id, "kind": item.kind, "name": name,
                      "unitPrice": float(price), "quantity": item.quantity,
                      "size": item.size, "lineTotal": float(line_total), "available": available,
                      "imageUrl": _primary_image(product)})
    return {"items": lines, "total": float(total),
            "count": sum(i["quantity"] for i in lines)}


def cart_bases(session_key):
    """Return unique base products currently present in this visitor's cart."""
    cart = get_or_create_cart(session_key)
    seen = set()
    bases = []
    for item in cart.items:
        if item.kind != "base" or item.base_id is None or item.base_id in seen:
            continue
        seen.add(item.base_id)
        bases.append(base_to_dict(item.base))
    return bases


def add_to_cart(session_key, kind, product_id, quantity=1, size=None):
    if kind not in ("base", "swap"):
        return None, ["kind must be 'base' or 'swap'"]
    try:
        quantity = int(quantity)
    except (TypeError, ValueError):
        return None, ["quantity must be a number"]
    if not 1 <= quantity <= 20:
        return None, ["quantity must be between 1 and 20"]

    model = Base if kind == "base" else Swap
    product = model.get_or_none(model.id == product_id)
    if product is None or not product.is_active:
        return None, [f"{kind} not found"]
    size = str(size).strip() if size is not None else None
    if size == "":
        size = None
    if kind == "base":
        available_sizes = _json_field(product.sizes, [])
        if available_sizes and not size:
            return None, ["Please choose a size for this base"]
        if size and size not in available_sizes:
            return None, ["That size is not available for this base"]
    elif size:
        return None, ["Art panels do not have size options"]

    if not _is_in_stock(product, size) and not _can_order_out_of_stock(product):
        return None, ["This product is out of stock. Submit a preorder request instead."]
    cart = get_or_create_cart(session_key)
    column = CartItem.base if kind == "base" else CartItem.swap
    item = CartItem.get_or_none(
        (CartItem.cart == cart) & (CartItem.kind == kind) & (column == product) &
        (CartItem.size == size)
    )
    requested_total = quantity + (item.quantity if item else 0)
    if not _can_order_out_of_stock(product) and kind == "base" and size:
        stock = _json_field(product.size_stock, {})
        if stock and int(stock.get(size, 0) or 0) < requested_total:
            return None, ["There is not enough stock for that size. Submit a preorder request instead."]
    if not _can_order_out_of_stock(product) and kind == "swap" and product.stock_quantity is not None and product.stock_quantity < requested_total:
        return None, ["There is not enough stock. Submit a preorder request instead."]
    if item:
        item.quantity = min(item.quantity + quantity, 20)
        item.save()
    else:
        CartItem.create(cart=cart, kind=kind, quantity=quantity, size=size, **{kind: product})
    return cart_summary(session_key), None


class _BundleAddError(Exception):
    def __init__(self, errors):
        self.errors = errors


def add_bundle_to_cart(session_key, base_id, base_size, swap_id, base_quantity=0, swap_quantity=1):
    """Add a swap and optionally a chosen base, rolling back if either fails."""
    try:
        base_quantity = int(base_quantity or 0)
        swap_quantity = int(swap_quantity or 0)
    except (TypeError, ValueError):
        return None, ["Quantities must be whole numbers"]
    if not 0 <= base_quantity <= 20:
        return None, ["Base quantity must be between 0 and 20"]
    if not 1 <= swap_quantity <= 20:
        return None, ["Swap quantity must be between 1 and 20"]
    if base_quantity and not base_id:
        return None, ["Choose a base before adding a base quantity"]
    try:
        with db.atomic():
            if base_quantity:
                _, errors = add_to_cart(session_key, "base", base_id, base_quantity, base_size)
                if errors:
                    raise _BundleAddError(errors)
            _, errors = add_to_cart(session_key, "swap", swap_id, swap_quantity)
            if errors:
                raise _BundleAddError(errors)
        return cart_summary(session_key), None
    except _BundleAddError as exc:
        return None, exc.errors


def set_cart_item_quantity(session_key, item_id, quantity):
    cart = get_or_create_cart(session_key)
    item = CartItem.get_or_none((CartItem.id == item_id) & (CartItem.cart == cart))
    if item is None:
        return None, ["Cart item not found"]
    try:
        quantity = int(quantity)
    except (TypeError, ValueError):
        return None, ["quantity must be a number"]
    if quantity <= 0:
        item.delete_instance()
    else:
        item.quantity = min(quantity, 20)
        item.save()
    return cart_summary(session_key), None


def remove_cart_item(session_key, item_id):
    return set_cart_item_quantity(session_key, item_id, 0)


# ---------------------------------------------------------------------------
# Checkout — creates an Order with price snapshots, then empties the cart
# ---------------------------------------------------------------------------
def checkout(session_key, data):
    errors = [f"'{f}' is required" for f in ("full_name", "email", "phone", "address", "region")
              if not str(data.get(f, "")).strip()]
    if data.get("email") and not EMAIL_RE.match(str(data["email"]).strip()):
        errors.append("'email' is not a valid email address")
    if data.get("phone") and len(str(data["phone"]).strip()) > 32:
        errors.append("'phone' must be 32 characters or fewer")
    if data.get("region") and len(str(data["region"]).strip()) > 120:
        errors.append("'region' must be 120 characters or fewer")
    if data.get("full_name") and len(str(data["full_name"]).strip()) > 120:
        errors.append("'full_name' must be 120 characters or fewer")
    if data.get("email") and len(str(data["email"]).strip()) > 190:
        errors.append("'email' must be 190 characters or fewer")
    if data.get("address") and len(str(data["address"]).strip()) > 255:
        errors.append("'address' must be 255 characters or fewer")
    if errors:
        return None, errors

    cart = get_or_create_cart(session_key)
    try:
        with db.atomic():
            cart_query = Cart.select().where(Cart.id == cart.id)
            if db.obj.__class__.__name__ == "MySQLDatabase":
                cart_query = cart_query.for_update()
            cart = cart_query.get()
            items = list(cart.items)
            if not items:
                return None, ["Your cart is empty"]

            order = Order.create(
                full_name=data["full_name"].strip(), email=data["email"].strip(),
                phone=data["phone"].strip(), address=data["address"].strip(),
                region=data["region"].strip(), city=data["region"].strip(),
                country=str(data.get("country") or data["region"]).strip(),
                payment_method="cash_on_delivery",
            )
            total = Decimal(0)
            for item in items:
                product_model = Base if item.kind == "base" else Swap
                product_id = item.base_id if item.kind == "base" else item.swap_id
                product_query = product_model.select().where(product_model.id == product_id)
                if db.obj.__class__.__name__ == "MySQLDatabase":
                    product_query = product_query.for_update()
                product = product_query.get_or_none()
                if product is None:
                    raise _Unavailable("A product in your bag")
                name = product.name
                price = Decimal(product.price) if item.kind == "base" else Decimal(0) if product.is_free else Decimal(product.price)
                if not product.is_active:
                    raise _Unavailable(name)
                if not _is_in_stock(product, item.size) and not _can_order_out_of_stock(product):
                    raise _Unavailable(name)
                if item.kind == "base" and item.size and _json_field(product.size_stock, {}) and not _can_order_out_of_stock(product):
                    if int(_json_field(product.size_stock, {}).get(item.size, 0) or 0) < item.quantity:
                        raise _Unavailable(name)
                if item.kind == "swap" and product.stock_quantity is not None and not _can_order_out_of_stock(product):
                    if product.stock_quantity < item.quantity:
                        raise _Unavailable(name)
                OrderItem.create(order=order, kind=item.kind, base=item.base_id, swap=item.swap_id,
                                 name=name, unit_price=price, quantity=item.quantity, size=item.size)
                if item.kind == "base" and item.size:
                    stock = _json_field(product.size_stock, {})
                    if item.size in stock:
                        remaining = int(stock.get(item.size, 0) or 0)
                        stock[item.size] = max(0, remaining - item.quantity)
                        product.size_stock = json.dumps(stock, ensure_ascii=False)
                        product.save(only=[Base.size_stock])
                elif item.kind == "swap" and product.stock_quantity is not None:
                    product.stock_quantity = max(0, product.stock_quantity - item.quantity)
                    product.save(only=[Swap.stock_quantity])
                total += price * item.quantity
            order.total = total
            order.save()
            CartItem.delete().where(CartItem.cart == cart).execute()
    except _Unavailable as exc:
        return None, [f"'{exc}' is no longer available. Remove it from your bag or request a pre-order from its product page."]

    return {"orderId": order.id, "status": order.status, "total": float(total),
            "paymentMethod": order.payment_method}, None


def create_product_request(data):
    kind = str(data.get("kind", ""))
    if kind not in ("base", "swap"):
        return None, ["Product type is invalid"]
    try:
        product_id = int(data.get("product_id"))
        quantity = int(data.get("quantity", 1))
    except (TypeError, ValueError):
        return None, ["Product and quantity must be valid"]
    if quantity < 1 or quantity > 20:
        return None, ["Quantity must be between 1 and 20"]
    name = str(data.get("full_name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    if not name or not email or not EMAIL_RE.match(email):
        return None, ["Enter your name and a valid email address"]
    if len(name) > 120 or len(email) > 190 or len(str(data.get("note") or "")) > 2000:
        return None, ["Name, email, or note is too long"]
    model = Base if kind == "base" else Swap
    product = model.get_or_none((model.id == product_id) & (model.is_active == True))  # noqa: E712
    if product is None:
        return None, ["Product not found"]
    size = str(data.get("size") or "").strip() or None
    if kind == "base":
        sizes = _json_field(product.sizes, [])
        if sizes and size not in sizes:
            return None, ["Choose a valid size"]
    elif size:
        return None, ["Art panels do not have size options"]
    if _can_order_out_of_stock(product):
        return None, ["This product accepts orders while out of stock; add it to your bag instead"]
    if _is_in_stock(product, size):
        return None, ["This item is now in stock. Refresh the product page to order it"]
    request = ProductRequest.create(
        kind=kind, product_id=product.id, product_name=product.name, size=size,
        quantity=quantity, full_name=name, email=email,
        note=str(data.get("note") or "").strip() or None,
    )
    return {"requestId": request.id}, None


# ---------------------------------------------------------------------------
# Newsletter
# ---------------------------------------------------------------------------
def subscribe(email):
    email = (email or "").strip().lower()
    if len(email) > 190 or not EMAIL_RE.match(email):
        return None, ["Please enter a valid email address"]
    try:
        Subscriber.create(email=email)
    except IntegrityError:
        pass  # already subscribed — treat as success, don't leak who is on the list
    return {"subscribed": True}, None
