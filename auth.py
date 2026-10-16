"""
Authentification, auto-généré par scaffold.py (--auth) à partir de
User.auth_config(). Fournit :
  - generate_token(user_id) / decode_token(token) : JWT pour l'API
  - token_required : décorateur qui protège une route API
  - login_required : décorateur qui protège une page admin (session cookie)

Relance scaffold.py avec --force pour régénérer (écrase ce fichier).
"""
import datetime
import secrets
from functools import wraps

import jwt
from flask import g, jsonify, redirect, request, session, url_for

from config import Config

from models.user import User as AuthenticationModel

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
AUTH_ROLE_FIELD = 'role'
AUTH_MODEL_PK = 'id'


def generate_token(user_id):
    payload = {
        "user_id": user_id,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token):
    try:
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload.get("user_id")
    except jwt.PyJWTError:
        return None


def generate_csrf_token():
    """Crée (une seule fois par session) un jeton anti-CSRF, à renvoyer dans
    les pages du dashboard pour que le JS le renvoie ensuite dans le header
    'X-CSRF-Token' sur chaque requête qui modifie des données."""
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_hex(32)
    return session["csrf_token"]


def _csrf_ok():
    token = session.get("csrf_token")
    header_token = request.headers.get("X-CSRF-Token")
    return bool(token) and bool(header_token) and secrets.compare_digest(token, header_token)


def token_required(view_func):
    """Protège une route API. Accepte deux façons d'être authentifié :
    - un header 'Authorization: Bearer <token>' (API/mobile/SPA externe) —
      pas de risque CSRF ici, le navigateur n'envoie jamais ce header tout
      seul, donc aucune vérification supplémentaire n'est nécessaire ;
    - la session du navigateur (cookie posé par /admin/login), pour que le
      JS du dashboard admin appelle l'API sans gérer de token lui-même. Dans
      ce cas, les méthodes qui modifient des données (tout sauf GET/HEAD)
      exigent en plus un header 'X-CSRF-Token' valide, sinon un cookie volé
      par un autre site pourrait déclencher des actions à ton insu (CSRF)."""
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            user_id = decode_token(token)
            if user_id is None:
                return jsonify({"error": "Token invalide ou expiré"}), 401
            g.current_user_id = user_id
            return view_func(*args, **kwargs)
        if session.get("user_id"):
            if request.method not in ("GET", "HEAD", "OPTIONS") and not _csrf_ok():
                return jsonify({"error": "Jeton CSRF invalide ou manquant"}), 403
            g.current_user_id = session["user_id"]
            return view_func(*args, **kwargs)
        return jsonify({"error": "Authentification requise"}), 401
    return wrapper


def login_required(view_func):
    """Protège une page du dashboard admin (cookie de session Flask)."""
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        user_id = session.get("user_id")
        user = AuthenticationModel.get_or_none(getattr(AuthenticationModel, AUTH_MODEL_PK) == user_id) if user_id else None
        if user is None or not getattr(user, "is_active", True) or str(getattr(user, AUTH_ROLE_FIELD, None)) != "admin":
            session.clear()
            return redirect(url_for("auth.login_page", next=request.path))
        return view_func(*args, **kwargs)
    return wrapper
    

def role_required(allowed_roles):
    allowed = {str(role) for role in (allowed_roles or [])}
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(*args, **kwargs):
            user_id = getattr(g, "current_user_id", None)
            if user_id is None or not AUTH_ROLE_FIELD:
                return jsonify({"error": "Role authorization unavailable"}), 403
            user = AuthenticationModel.get_or_none(
                getattr(AuthenticationModel, AUTH_MODEL_PK) == user_id
            )
            if user is None or not getattr(user, "is_active", True) or str(getattr(user, AUTH_ROLE_FIELD, None)) not in allowed:
                return jsonify({"error": "Insufficient permissions"}), 403
            return view_func(*args, **kwargs)
        return wrapper
    return decorator


# === CODE CUSTOM (ajoute ton code métier sous cette ligne — préservé automatiquement à chaque régénération) ===
