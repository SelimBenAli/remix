from flask import Blueprint

subscriber_bp = Blueprint("subscriber", __name__)

from . import views  # noqa: E402,F401
