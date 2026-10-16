from flask import Blueprint

base_bp = Blueprint("base", __name__)

from . import views  # noqa: E402,F401
