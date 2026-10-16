from flask import Blueprint

swap_bp = Blueprint("swap", __name__)

from . import views  # noqa: E402,F401
