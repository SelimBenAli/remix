from peewee import Model, CharField, IntegerField, ForeignKeyField

from extensions import db
from models.cart import Cart
from models.base import Base
from models.swap import Swap


class CartItem(Model):
    cart = ForeignKeyField(Cart, backref="items", on_delete="CASCADE")
    kind = CharField(max_length=10)  # base | swap
    base = ForeignKeyField(Base, null=True, on_delete="CASCADE")
    swap = ForeignKeyField(Swap, null=True, on_delete="CASCADE")
    size = CharField(max_length=16, null=True)
    quantity = IntegerField(default=1)

    class Meta:
        database = db
        table_name = "cart_items"

    @classmethod
    def insert_fields(cls):
        return {
            "cart": {"required": True, "type": int},
            "kind": {"required": True, "type": str},
            "base": {"required": False, "type": int},
            "swap": {"required": False, "type": int},
            "size": {"required": False, "type": str},
            "quantity": {"required": False, "type": int},
        }

    @classmethod
    def update_fields(cls):
        return {"quantity": {"required": True, "type": int}}

    @classmethod
    def search_fields(cls):
        return {
            "kind": {"type": str, "operator": "eq"},
        }
