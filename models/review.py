import datetime

from peewee import Model, CharField, TextField, IntegerField, BooleanField, DateTimeField

from extensions import db


class Review(Model):
    author_name = CharField(max_length=120)
    rating = IntegerField(default=5)
    quote = TextField()
    is_published = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.datetime.now)

    class Meta:
        database = db
        table_name = "reviews"

    @classmethod
    def insert_fields(cls):
        return {
            "author_name": {"required": True, "type": str},
            "rating": {"required": False, "type": int},
            "quote": {"required": True, "type": str},
            "is_published": {"required": False, "type": bool},
        }

    @classmethod
    def update_fields(cls):
        return cls.insert_fields()

    @classmethod
    def search_fields(cls):
        return {
            "author_name": {"type": str, "operator": "like"},
            "quote": {"type": str, "operator": "like"},
        }
