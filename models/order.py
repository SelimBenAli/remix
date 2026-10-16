import datetime

from peewee import (
    Model, CharField, DecimalField, DateTimeField, ForeignKeyField,
)

from extensions import db
from models.user import User


class Order(Model):
    user = ForeignKeyField(User, backref="orders", null=True, on_delete="SET NULL")
    status = CharField(max_length=20, default="pending")  # pending | paid | shipped | cancelled
    total = DecimalField(max_digits=10, decimal_places=2, default=0)
    full_name = CharField(max_length=120)
    email = CharField(max_length=190)
    phone = CharField(max_length=32, null=True)
    address = CharField(max_length=255)
    region = CharField(max_length=120, null=True)
    city = CharField(max_length=120)
    country = CharField(max_length=120)
    payment_method = CharField(max_length=40, default="cash_on_delivery")
    created_at = DateTimeField(default=datetime.datetime.now)

    class Meta:
        database = db
        table_name = "orders"

    @classmethod
    def insert_fields(cls):
        return {
            "user": {"required": False, "type": int},
            "full_name": {"required": True, "type": str},
            "email": {"required": True, "type": str},
            "phone": {"required": False, "type": str},
            "address": {"required": True, "type": str},
            "region": {"required": False, "type": str},
            "city": {"required": True, "type": str},
            "country": {"required": True, "type": str},
            "payment_method": {"required": False, "type": str},
        }

    @classmethod
    def update_fields(cls):
        return {"status": {"required": True, "type": str}}

    @classmethod
    def search_fields(cls):
        return {
            "full_name": {"type": str, "operator": "like"},
            "email": {"type": str, "operator": "like"},
            "status": {"type": str, "operator": "eq"},
        }

    @classmethod
    def custom_actions(cls):
        return {
            "mark_paid": {"method": "PATCH", "label": "Mark as paid", "confirm": True},
            "ship": {"method": "PATCH", "label": "Mark as shipped", "confirm": True},
            "cancel": {"method": "PATCH", "label": "Cancel order", "confirm": True},
        }
