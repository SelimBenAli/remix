import datetime

from peewee import Model, CharField, BooleanField, DateTimeField

from extensions import db


class User(Model):
    name = CharField(max_length=120)
    email = CharField(max_length=190, unique=True)
    password = CharField(max_length=255)
    role = CharField(max_length=20, default="customer")  # customer | admin
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.datetime.now)

    class Meta:
        database = db
        table_name = "users"

    @classmethod
    def insert_fields(cls):
        return {
            "name": {"required": True, "type": str},
            "email": {"required": True, "type": str},
            "password": {"required": True, "type": str},
        }

    @classmethod
    def update_fields(cls):
        return {
            "name": {"required": False, "type": str},
            "role": {"required": False, "type": str},
            "is_active": {"required": False, "type": bool},
        }

    @classmethod
    def search_fields(cls):
        return {
            "name": {"type": str, "operator": "like"},
            "email": {"type": str, "operator": "like"},
        }

    @classmethod
    def sensitive_fields(cls):
        return ["password"]

    @classmethod
    def auth_config(cls):
        return {
            "username_field": "email",
            "role_field": "role",
            "signup_enabled": False,
            "default_role": "customer",
            "admin_dashboard_roles": ["admin"],
        }
