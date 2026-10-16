from flask import Blueprint

order_item_bp = Blueprint("order_item", __name__)

from . import views  # noqa: E402,F401
