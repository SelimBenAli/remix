import datetime

from peewee import (
    Model, CharField, BooleanField, DecimalField, IntegerField,
    DateTimeField, ForeignKeyField,
)

from extensions import db
from models.artist import Artist


class Swap(Model):
    """An art panel (patch) attached to a Base."""
    name = CharField(max_length=160)
    artist = ForeignKeyField(Artist, backref="swaps", on_delete="CASCADE")
    price = DecimalField(max_digits=8, decimal_places=2, default=0)
    is_free = BooleanField(default=False)
    popularity = IntegerField(default=0)
    image_url = CharField(max_length=255, null=True)
    is_active = BooleanField(default=True)
    stock_quantity = IntegerField(null=True)  # null means untracked; 0 means out of stock
    ordered_even_out_of_stock = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.datetime.now)

    class Meta:
        database = db
        table_name = "swaps"

    @classmethod
    def insert_fields(cls):
        return {
            "name": {"required": True, "type": str},
            "artist": {"required": True, "type": int},
            "price": {"required": False, "type": float},
            "is_free": {"required": False, "type": bool},
            "popularity": {"required": False, "type": int},
            "image_url": {"required": False, "type": str},
            "is_active": {"required": False, "type": bool},
            "stock_quantity": {"required": False, "type": int, "label": "Stock quantity"},
            "ordered_even_out_of_stock": {"required": False, "type": bool, "label": "Allow ordering when out of stock"},
        }

    @classmethod
    def update_fields(cls):
        return cls.insert_fields()

    @classmethod
    def search_fields(cls):
        return {
            "name": {"type": str, "operator": "like"},
        }
