from flask import Blueprint

admin_ui_bp = Blueprint("admin_ui", __name__)

from . import views  # noqa: E402,F401
