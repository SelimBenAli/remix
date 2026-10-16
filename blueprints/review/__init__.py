from flask import Blueprint

review_bp = Blueprint("review", __name__)

from . import views  # noqa: E402,F401
