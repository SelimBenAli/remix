"""
Storefront blueprint — public pages and the JSON endpoints they use.
Hand-written (not generated). The generated /api/* routes and /admin stay
behind JWT/admin login; everything here is open to visitors.
"""
import uuid

from flask import abort, jsonify, render_template, request, session

from . import storefront_bp
from services import storefront_service as store


def _session_key():
    if "cart_key" not in session:
        session["cart_key"] = uuid.uuid4().hex
        session.permanent = True
    return session["cart_key"]


def _result(result, errors, status=200):
    if errors:
        return jsonify({"errors": errors}), 400
    return jsonify(result), status


# ----------------------------- pages ---------------------------------------
@storefront_bp.route("/")
def home():
    return render_template("index.html", active_page="home")


@storefront_bp.route("/bases")
def bases():
    return render_template("bases.html", active_page="bases")


@storefront_bp.route("/swaps")
def swaps():
    return render_template("swaps.html", active_page="swaps")


@storefront_bp.route("/order")
@storefront_bp.route("/checkout")
def order_page():
    return render_template("order.html", active_page="order")


@storefront_bp.route("/product/<kind>/<int:product_id>")
def product_page(kind, product_id):
    if kind not in ("base", "swap"):
        abort(404)
    return render_template(
        "product.html",
        active_page="product",
        product_kind=kind,
        product_id=product_id,
    )


# ----------------------------- catalogue JSON ------------------------------
@storefront_bp.route("/store/bases")
def bases_json():
    return jsonify(store.list_bases(request.args.get("type"), request.args.get("sort", "featured")))


@storefront_bp.route("/store/swaps")
def swaps_json():
    artist_id = request.args.get("artist_id", type=int)
    return jsonify(store.list_swaps(artist_id, request.args.get("sort", "newest")))


@storefront_bp.route("/store/products/<kind>/<int:product_id>")
def product_json(kind, product_id):
    product = store.get_product(kind, product_id)
    if product is None:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(product)


@storefront_bp.route("/store/artists")
def artists_json():
    return jsonify(store.list_artists(request.args.get("limit", type=int)))


@storefront_bp.route("/store/reviews")
def reviews_json():
    return jsonify(store.list_reviews(request.args.get("limit", 3, type=int)))


# ----------------------------- cart ----------------------------------------
@storefront_bp.route("/store/cart", methods=["GET"])
def cart_get():
    return jsonify(store.cart_summary(_session_key()))


@storefront_bp.route("/store/cart/bases", methods=["GET"])
def cart_bases_get():
    return jsonify(store.cart_bases(_session_key()))


@storefront_bp.route("/store/cart/items", methods=["POST"])
def cart_add():
    data = request.get_json(silent=True) or {}
    result, errors = store.add_to_cart(
        _session_key(), data.get("kind"), data.get("product_id"),
        data.get("quantity", 1), data.get("size"))
    return _result(result, errors, 201)


@storefront_bp.route("/store/cart/bundle", methods=["POST"])
def cart_add_bundle():
    data = request.get_json(silent=True) or {}
    result, errors = store.add_bundle_to_cart(
        _session_key(), data.get("base_id"), data.get("base_size"), data.get("swap_id"),
        data.get("base_quantity", 0), data.get("swap_quantity", 1)
    )
    return _result(result, errors, 201)


@storefront_bp.route("/store/cart/items/<int:item_id>", methods=["PATCH"])
def cart_update(item_id):
    data = request.get_json(silent=True) or {}
    result, errors = store.set_cart_item_quantity(_session_key(), item_id, data.get("quantity"))
    return _result(result, errors)


@storefront_bp.route("/store/cart/items/<int:item_id>", methods=["DELETE"])
def cart_remove(item_id):
    result, errors = store.remove_cart_item(_session_key(), item_id)
    return _result(result, errors)


@storefront_bp.route("/store/checkout", methods=["POST"])
def checkout():
    result, errors = store.checkout(_session_key(), request.get_json(silent=True) or {})
    return _result(result, errors, 201)


@storefront_bp.route("/store/product-requests", methods=["POST"])
def product_request():
    result, errors = store.create_product_request(request.get_json(silent=True) or {})
    return _result(result, errors, 201)


# ----------------------------- newsletter ----------------------------------
@storefront_bp.route("/store/newsletter", methods=["POST"])
def newsletter():
    data = request.get_json(silent=True) or {}
    result, errors = store.subscribe(data.get("email"))
    return _result(result, errors, 201)
