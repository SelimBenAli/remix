from flask import Blueprint

storefront_bp = Blueprint("storefront", __name__)

from . import views  # noqa: E402,F401
