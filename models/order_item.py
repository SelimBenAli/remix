from peewee import Model, CharField, IntegerField, DecimalField, ForeignKeyField

from extensions import db
from models.order import Order
from models.base import Base
from models.swap import Swap


class OrderItem(Model):
    order = ForeignKeyField(Order, backref="items", on_delete="CASCADE")
    kind = CharField(max_length=10)  # base | swap
    base = ForeignKeyField(Base, null=True, on_delete="SET NULL")
    swap = ForeignKeyField(Swap, null=True, on_delete="SET NULL")
    size = CharField(max_length=16, null=True)
    name = CharField(max_length=160)  # snapshot at purchase time
    unit_price = DecimalField(max_digits=8, decimal_places=2)
    quantity = IntegerField(default=1)

    class Meta:
        database = db
        table_name = "order_items"

    @classmethod
    def insert_fields(cls):
        return {
            "order": {"required": True, "type": int},
            "kind": {"required": True, "type": str},
            "base": {"required": False, "type": int},
            "swap": {"required": False, "type": int},
            "size": {"required": False, "type": str},
            "name": {"required": True, "type": str},
            "unit_price": {"required": True, "type": float},
            "quantity": {"required": False, "type": int},
        }

    @classmethod
    def update_fields(cls):
        return {"quantity": {"required": True, "type": int}}

    @classmethod
    def search_fields(cls):
        return {
            "name": {"type": str, "operator": "like"},
        }
