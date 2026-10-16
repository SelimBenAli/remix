import datetime

from peewee import Model, CharField, DateTimeField, ForeignKeyField, IntegerField, BooleanField

from extensions import db
from models.base import Base
from models.swap import Swap


class ProductImage(Model):
    """An uploaded gallery image belonging to a base or swap product."""
    base = ForeignKeyField(Base, null=True, backref="gallery_images", on_delete="CASCADE")
    swap = ForeignKeyField(Swap, null=True, backref="gallery_images", on_delete="CASCADE")
    image_path = CharField(max_length=500)
    sort_order = IntegerField(default=0)
    use_in_showroom = BooleanField(default=False)
    created_at = DateTimeField(default=datetime.datetime.now)

    class Meta:
        database = db
        table_name = "product_images"
