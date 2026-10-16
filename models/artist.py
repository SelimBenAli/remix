import datetime

from peewee import Model, CharField, TextField, DateTimeField

from extensions import db


class Artist(Model):
    name = CharField(max_length=120, unique=True)
    bio = TextField(null=True)
    avatar_url = CharField(max_length=255, null=True)
    created_at = DateTimeField(default=datetime.datetime.now)

    class Meta:
        database = db
        table_name = "artists"

    @classmethod
    def insert_fields(cls):
        return {
            "name": {"required": True, "type": str},
            "bio": {"required": False, "type": str},
            "avatar_url": {"required": False, "type": str},
        }

    @classmethod
    def update_fields(cls):
        return cls.insert_fields()

    @classmethod
    def search_fields(cls):
        return {
            "name": {"type": str, "operator": "like"},
        }
