from flask import Blueprint

artist_bp = Blueprint("artist", __name__)

from . import views  # noqa: E402,F401
