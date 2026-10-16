"""
Point d'entrée Flask, auto-généré par scaffold.py.
Relance scaffold.py avec --force pour régénérer ce fichier (ex: après
ajout d'un nouveau modèle) — ça écrasera les modifications manuelles ici.
"""
import os

from flask import Flask

from config import Config
from extensions import db, configure_database


from blueprints.artist import artist_bp
from blueprints.base import base_bp
from blueprints.cart import cart_bp
from blueprints.cart_item import cart_item_bp
from blueprints.order import order_bp
from blueprints.order_item import order_item_bp
from blueprints.review import review_bp
from blueprints.subscriber import subscriber_bp
from blueprints.swap import swap_bp
from blueprints.user import user_bp
from blueprints.auth import auth_bp
from blueprints.docs import docs_bp
from blueprints.storefront import storefront_bp
from blueprints.admin_ui import admin_ui_bp
from extensions import limiter
from models.artist import Artist
from models.base import Base
from models.cart import Cart
from models.cart_item import CartItem
from models.order import Order
from models.order_item import OrderItem
from models.product_image import ProductImage
from models.product_request import ProductRequest
from models.review import Review
from models.subscriber import Subscriber
from models.swap import Swap
from models.user import User
from services.base_product_defaults import ensure_product_detail_schema
from services.product_images import ensure_base_showroom_images


def create_app():
    if Config.APP_ENV == "production" and (
        not Config.SECRET_KEY or len(Config.SECRET_KEY) < 32 or
        Config.SECRET_KEY in {"local-development-only-change-me", "generate-a-unique-random-secret-at-least-32-characters"}
    ):
        raise RuntimeError("Set SECRET_KEY to at least 32 random characters before running with FLASK_DEBUG=false")
    if Config.APP_ENV == "production" and (Config.DEBUG or not Config.SESSION_COOKIE_SECURE):
        raise RuntimeError("Production requires FLASK_DEBUG=false and SESSION_COOKIE_SECURE=true")
    if Config.APP_ENV == "production" and Config.DB_ENGINE == "mysql" and (
        not Config.DB_PASSWORD or not Config.DB_NAME or Config.DB_USER.lower() == "root"
    ):
        raise RuntimeError("Production MySQL requires a database name, password, and a dedicated non-root user")

    app = Flask(__name__)
    app.secret_key = Config.SECRET_KEY
    upload_folder = Config.UPLOAD_FOLDER
    if not os.path.isabs(upload_folder):
        upload_folder = os.path.join(app.root_path, upload_folder)
    app.config["UPLOAD_FOLDER"] = upload_folder
    app.config["APP_ENV"] = Config.APP_ENV
    app.config["SESSION_COOKIE_SAMESITE"] = Config.SESSION_COOKIE_SAMESITE
    app.config["SESSION_COOKIE_HTTPONLY"] = Config.SESSION_COOKIE_HTTPONLY
    app.config["SESSION_COOKIE_SECURE"] = Config.SESSION_COOKIE_SECURE
    app.config["PERMANENT_SESSION_LIFETIME"] = Config.PERMANENT_SESSION_LIFETIME
    app.config["MAX_CONTENT_LENGTH"] = Config.MAX_CONTENT_LENGTH
    if Config.TRUSTED_PROXY_FOR_HOPS > 0 or Config.TRUSTED_PROXY_PROTO_HOPS > 0:
        from werkzeug.middleware.proxy_fix import ProxyFix
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=Config.TRUSTED_PROXY_FOR_HOPS,
                                x_proto=Config.TRUSTED_PROXY_PROTO_HOPS, x_host=0)
    limiter.init_app(app)



    # Ne branche la vraie DB que si rien n'est déjà connecté au proxy — les
    # tests appellent db.initialize(<sqlite en mémoire>) avant create_app().
    if db.obj is None:
        configure_database()

    app.register_blueprint(artist_bp, url_prefix="/api")
    app.register_blueprint(base_bp, url_prefix="/api")
    app.register_blueprint(cart_bp, url_prefix="/api")
    app.register_blueprint(cart_item_bp, url_prefix="/api")
    app.register_blueprint(order_bp, url_prefix="/api")
    app.register_blueprint(order_item_bp, url_prefix="/api")
    app.register_blueprint(review_bp, url_prefix="/api")
    app.register_blueprint(subscriber_bp, url_prefix="/api")
    app.register_blueprint(swap_bp, url_prefix="/api")
    app.register_blueprint(user_bp, url_prefix="/api")
    app.register_blueprint(auth_bp)
    app.register_blueprint(docs_bp)
    app.register_blueprint(storefront_bp)
    app.register_blueprint(admin_ui_bp)

    if Config.APP_ENV == "production" and Config.RATELIMIT_STORAGE_URI == "memory://":
        app.logger.warning("Rate limits use per-process memory storage. Configure shared Redis storage for multi-worker production.")

    @app.after_request
    def add_security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        response.headers.setdefault("Content-Security-Policy", "frame-ancestors 'none'")
        if Config.HSTS_SECONDS > 0:
            response.headers.setdefault("Strict-Transport-Security", f"max-age={Config.HSTS_SECONDS}")
        return response

    @app.route("/uploads/<path:filename>")
    def uploaded_file(filename):
        from flask import send_from_directory
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    @app.before_request
    def _db_connect():
        if db.is_closed():
            db.connect()

    @app.teardown_request
    def _db_close(exc):
        if not db.is_closed():
            db.close()

    # Pratique en dev pour créer les tables sans migration. En prod,
    # gère les migrations séparément (ex: peewee-migrate).
    with db.connection_context():
        db.create_tables([Artist, Base, Cart, CartItem, Order, OrderItem, Review, Subscriber, Swap, User, ProductImage, ProductRequest], safe=True)
        ensure_product_detail_schema()
        ensure_base_showroom_images(app.config["UPLOAD_FOLDER"], app.root_path)



    return app


if __name__ == "__main__":
    if "APP_ENV" not in os.environ:
        Config.APP_ENV = "development"
        Config.SESSION_COOKIE_SECURE = False
    app = create_app()
    app.run(debug=Config.DEBUG)
