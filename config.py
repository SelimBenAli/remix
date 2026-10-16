"""
Configuration de la connexion DB (auto-généré par scaffold.py, ne sera pas
écrasé si le fichier existe déjà — utilise --force pour régénérer).

Adapte les valeurs par défaut ou fixe les variables d'environnement
correspondantes.
"""
import json
import os
from datetime import timedelta


def _load_local_env():
    """Load generator-created .env values without requiring python-dotenv."""
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.isfile(env_path):
        return
    with open(env_path, "r", encoding="utf-8") as env_file:
        for line in env_file:
            key, separator, raw_value = line.partition("=")
            if not separator or not key.strip() or key.lstrip().startswith("#"):
                continue
            try:
                value = json.loads(raw_value.strip())
            except (ValueError, TypeError):
                value = raw_value.strip()
            os.environ.setdefault(key.strip(), str(value))


_load_local_env()


class Config:
    DB_ENGINE = os.environ.get("DB_ENGINE", "mysql").lower()
    DB_NAME = os.environ.get("DB_NAME", "remix")
    DB_USER = os.environ.get("DB_USER", "root")
    DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
    DB_HOST = os.environ.get("DB_HOST", "localhost")
    DB_PORT = int(os.environ.get("DB_PORT", "3306"))
    SOCKETIO_MESSAGE_QUEUE = os.environ.get("SOCKETIO_MESSAGE_QUEUE", "")

    # Utilisé pour signer les JWT (API) et les sessions (dashboard admin).
    # !! Change impérativement cette valeur par défaut en production !!
    DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    SECRET_KEY = os.environ.get("SECRET_KEY", "local-development-only-change-me")
    HSTS_SECONDS = int(os.environ.get("HSTS_SECONDS", "0"))
    RATELIMIT_STORAGE_URI = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")
    RUNNING_FLASK_CLI = os.environ.get("FLASK_RUN_FROM_CLI", "").lower() == "true"
    APP_ENV = os.environ.get("APP_ENV", "development" if DEBUG or RUNNING_FLASK_CLI else "production").lower()
    TRUSTED_PROXY_FOR_HOPS = int(os.environ.get("TRUSTED_PROXY_FOR_HOPS", "0"))
    TRUSTED_PROXY_PROTO_HOPS = int(os.environ.get("TRUSTED_PROXY_PROTO_HOPS", "0"))

    # SMTP pour l'envoi des codes de vérification par email (voir
    # send_verification_email() dans auth.py). Si SMTP_HOST est vide, les
    # codes sont juste affichés dans les logs — pratique en dev sans serveur
    # SMTP réel, mais à configurer avant la mise en prod.
    SMTP_HOST = os.environ.get("SMTP_HOST", "")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
    SMTP_USER = os.environ.get("SMTP_USER", "")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
    SMTP_FROM = os.environ.get("SMTP_FROM", "no-reply@example.com")
    SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", "true").lower() == "true"

    # Protection de base contre le CSRF : le cookie de session n'est envoyé
    # que pour des requêtes du même site. "Lax" est le bon compromis par
    # défaut (n'empêche pas la navigation normale, bloque les requêtes
    # cross-site qui modifient des données).
    SESSION_COOKIE_SAMESITE = os.environ.get("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_HTTPONLY = True
    PERMANENT_SESSION_LIFETIME = timedelta(hours=int(os.environ.get("ADMIN_SESSION_HOURS", "8")))
    # Flask's development server is plain HTTP unless HTTPS is configured.
    # Phone testing over the local network therefore needs a non-Secure
    # session cookie, even when debug mode is off. Keep Secure cookies enabled
    # by default under production WSGI servers; deployments can explicitly set
    # SESSION_COOKIE_SECURE=true or false to override this behavior.
    _session_cookie_secure_default = APP_ENV == "production" and not DEBUG
    SESSION_COOKIE_SECURE = os.environ.get(
        "SESSION_COOKIE_SECURE", str(_session_cookie_secure_default).lower()
    ).lower() == "true"

    # Dossier de stockage des fichiers/images uploadés (voir uploads.py).
    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER", "uploads")
    MAX_CONTENT_LENGTH = int(os.environ.get("MAX_CONTENT_LENGTH", str(100 * 1024 * 1024)))  # 100 MB per request; per-image limit is enforced separately
