from flask import Blueprint

cart_item_bp = Blueprint("cart_item", __name__)

from . import views  # noqa: E402,F401
