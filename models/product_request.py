import datetime

from peewee import Model, CharField, IntegerField, DateTimeField, TextField

from extensions import db


class ProductRequest(Model):
    """Customer request to preorder or be notified about an unavailable item."""
    kind = CharField(max_length=10)
    product_id = IntegerField()
    product_name = CharField(max_length=160)
    size = CharField(max_length=16, null=True)
    quantity = IntegerField(default=1)
    full_name = CharField(max_length=120)
    email = CharField(max_length=190)
    note = TextField(null=True)
    status = CharField(max_length=20, default="new")
    created_at = DateTimeField(default=datetime.datetime.now)

    class Meta:
        database = db
        table_name = "product_requests"
