"""
Connexion à la base de données (auto-généré par scaffold.py, ne sera pas
écrasé si le fichier existe déjà — utilise --force pour régénérer).

`db` est un DatabaseProxy Peewee : la vraie connexion n'est branchée qu'au
démarrage de l'app via configure_database() (MySQL/PyMySQL en prod). Ça
permet aux tests de brancher une SQLite en mémoire à la place, sans toucher
aux modèles ni au reste du code (voir conftest.py si --tests a été utilisé).
"""
from peewee import DatabaseProxy

db = DatabaseProxy()


def configure_database():
    """Branche la vraie connexion MySQL/PyMySQL. Appelé par create_app() —
    n'appelle pas ça toi-même dans les tests, utilise db.initialize(...)
    avec une base de test à la place (voir conftest.py)."""
    from config import Config

    if Config.DB_ENGINE == "sqlite":
        from peewee import SqliteDatabase
        db.initialize(SqliteDatabase(Config.DB_NAME))
    elif Config.DB_ENGINE == "mysql":
        import pymysql
        pymysql.install_as_MySQLdb()
        from peewee import MySQLDatabase
        db.initialize(MySQLDatabase(
            Config.DB_NAME,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            host=Config.DB_HOST,
            port=Config.DB_PORT,
        ))
    else:
        raise ValueError(f"Unsupported DB_ENGINE: {Config.DB_ENGINE}")


# Limitation du nombre de requêtes (protège /api/auth/login, /signup... du
# brute-force). Stockage en mémoire par défaut : correct pour un seul
# process de dev, mais à passer sur Redis en prod avec plusieurs workers
# (storage_uri="redis://..." — voir la doc de flask-limiter).
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from config import Config

limiter = Limiter(key_func=get_remote_address, storage_uri=Config.RATELIMIT_STORAGE_URI)

