"""
Connexion API (JWT) + connexion dashboard admin (session), auto-généré par
scaffold.py à partir de User.auth_config().
"""
from flask import redirect, render_template, request, jsonify, session, url_for
from werkzeug.security import check_password_hash

from . import auth_bp
from auth import generate_token, generate_csrf_token
from extensions import limiter
from models.user import User

USERNAME_FIELD = "email"
PASSWORD_FIELD = "password"
ROLE_FIELD = 'role'                       # None si pas de notion de rôle
VERIFIED_FIELD = None                # None si email_verification == "none"
EMAIL_VERIFICATION = 'none'        # "none" | "signup" | "login" | "both"
ADMIN_DASHBOARD_ROLES = ['admin']  # [] = tout compte connecté a accès au dashboard admin
ROLE_REDIRECTS = {}                # utilisé pour le "redirect_url" renvoyé par l'API
DEFAULT_REDIRECT = '/'
SIGNUP_ENABLED = False
SIGNUP_FIELDS = ['name', 'email', 'password']


def _resolve_redirect(role):
    return ROLE_REDIRECTS.get(str(role), DEFAULT_REDIRECT)


def _authenticate(username, password):
    if not username or not password:
        return None
    instance = User.get_or_none(getattr(User, USERNAME_FIELD) == username)
    if instance is None:
        return None
    if not check_password_hash(getattr(instance, PASSWORD_FIELD), password):
        return None
    return instance


@auth_bp.route("/api/auth/login", methods=["POST"])
@limiter.limit("10 per minute")
def api_login():
    data = request.get_json(silent=True) or {}
    instance = _authenticate(data.get(USERNAME_FIELD), data.get("password"))
    if instance is None:
        return jsonify({"error": "Identifiants invalides"}), 401

    if VERIFIED_FIELD and EMAIL_VERIFICATION in ("signup", "both") and not getattr(instance, VERIFIED_FIELD):
        return jsonify({"error": "Compte non vérifié", "verification_required": "signup"}), 403

    if EMAIL_VERIFICATION in ("login", "both"):
        code = create_verification_code(instance.id, "login")
        send_verification_email(getattr(instance, USERNAME_FIELD), code, "login")
        return jsonify({"verification_required": "login", "user_id": instance.id})

    role = getattr(instance, ROLE_FIELD, None) if ROLE_FIELD else None
    token = generate_token(instance.id)
    return jsonify({"token": token, "redirect_url": _resolve_redirect(role)})


@auth_bp.route("/admin/login", methods=["GET", "POST"])
@limiter.limit("10 per minute", methods=["POST"])
def login_page():
    error = None
    if request.method == "POST":
        instance = _authenticate(request.form.get(USERNAME_FIELD), request.form.get("password"))
        if instance is None:
            error = "Identifiants invalides."
        elif VERIFIED_FIELD and EMAIL_VERIFICATION in ("signup", "both") and not getattr(instance, VERIFIED_FIELD):
            error = "Compte non vérifié — vérifie ton email avant de te connecter."
        elif ADMIN_DASHBOARD_ROLES and str(getattr(instance, ROLE_FIELD, None)) not in [str(r) for r in ADMIN_DASHBOARD_ROLES]:
            error = "Ce compte n'a pas accès au dashboard admin."
        else:
            session["user_id"] = instance.id
            generate_csrf_token()
            return redirect(request.args.get("next") or url_for("admin_ui.index"))
    return render_template("admin/login.html", error=error, username_field=USERNAME_FIELD, signup_enabled=SIGNUP_ENABLED)


@auth_bp.route("/admin/logout")
def logout():
    session.pop("user_id", None)
    return redirect(url_for("auth.login_page"))


# === CODE CUSTOM (ajoute ton code métier sous cette ligne — préservé automatiquement à chaque régénération) ===
