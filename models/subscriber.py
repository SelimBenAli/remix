import datetime

from peewee import Model, CharField, DateTimeField

from extensions import db


class Subscriber(Model):
    email = CharField(max_length=190, unique=True)
    created_at = DateTimeField(default=datetime.datetime.now)

    class Meta:
        database = db
        table_name = "subscribers"

    @classmethod
    def insert_fields(cls):
        return {"email": {"required": True, "type": str}}

    @classmethod
    def update_fields(cls):
        return {"email": {"required": True, "type": str}}

    @classmethod
    def search_fields(cls):
        return {
            "email": {"type": str, "operator": "like"},
        }
