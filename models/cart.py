import datetime

from peewee import Model, CharField, DateTimeField, ForeignKeyField

from extensions import db
from models.user import User


class Cart(Model):
    user = ForeignKeyField(User, backref="carts", null=True, on_delete="CASCADE")
    session_key = CharField(max_length=64, null=True, index=True)  # guest carts
    created_at = DateTimeField(default=datetime.datetime.now)

    class Meta:
        database = db
        table_name = "carts"

    @classmethod
    def insert_fields(cls):
        return {
            "user": {"required": False, "type": int},
            "session_key": {"required": False, "type": str},
        }

    @classmethod
    def update_fields(cls):
        return cls.insert_fields()

    @classmethod
    def search_fields(cls):
        return {
            "session_key": {"type": str, "operator": "eq"},
        }
