import datetime

from peewee import Model, CharField, BooleanField, DecimalField, DateTimeField, TextField

from extensions import db


class Base(Model):
    """A base garment (jacket / hoodie) that art panels (Swaps) attach to."""
    name = CharField(max_length=160)
    type = CharField(max_length=30)  # Jacket | Hoodie
    price = DecimalField(max_digits=8, decimal_places=2)
    badge = CharField(max_length=30, null=True)  # Best Seller | Limited Run | Trending
    color = CharField(max_length=120, null=True)
    description = TextField(null=True)
    features = TextField(null=True)  # JSON list, editable through the admin
    sizes = TextField(null=True)  # JSON list of available size labels
    size_stock = TextField(null=True)  # JSON object: {"S": 3, "M": 0}; null keeps legacy stock untracked
    size_guide = TextField(null=True)  # JSON table and measurement advice
    details = TextField(null=True)
    materials_care = TextField(null=True)
    fit = TextField(null=True)
    shipping_returns = TextField(null=True)
    included_panel = BooleanField(null=True, default=None)
    sold_out = BooleanField(default=False)
    ordered_even_out_of_stock = BooleanField(default=True)
    image_url = CharField(max_length=255, null=True)
    is_active = BooleanField(default=True)
    created_at = DateTimeField(default=datetime.datetime.now)

    class Meta:
        database = db
        table_name = "bases"

    @classmethod
    def insert_fields(cls):
        return {
            "name": {"required": True, "type": str},
            "type": {"required": True, "type": str},
            "price": {"required": True, "type": float},
            "badge": {"required": False, "type": str},
            "color": {"required": False, "type": str},
            "description": {"required": False, "type": "textarea"},
            "features": {"required": False, "type": "json", "label": "Features (JSON list)", "rows": 5,
                         "help": "Enter a JSON list of short feature labels."},
            "sizes": {"required": False, "type": "json", "label": "Available sizes (JSON list)", "rows": 5,
                      "help": "Enter a JSON list, for example [\"XS\", \"S\", \"M\"]. Leave blank if this product has no size choices."},
            "size_stock": {"required": False, "type": "json", "label": "Stock by size (JSON object)", "rows": 5,
                            "help": "Set remaining stock per size, e.g. {\"S\": 4, \"M\": 0}. Leave blank to keep existing sizes untracked."},
            "size_guide": {"required": False, "type": "json", "label": "Size guide (JSON)", "rows": 12,
                           "help": "Edit the per-size measurements and fit advice as JSON."},
            "details": {"required": False, "type": "textarea", "label": "Details"},
            "materials_care": {"required": False, "type": "textarea", "label": "Materials & care"},
            "fit": {"required": False, "type": "textarea", "label": "Fit"},
            "shipping_returns": {"required": False, "type": "textarea", "label": "Shipping & returns"},
            "included_panel": {"required": False, "type": bool, "label": "Includes matching panel"},
            "sold_out": {"required": False, "type": bool},
            "ordered_even_out_of_stock": {"required": False, "type": bool, "label": "Allow ordering when out of stock"},
            "image_url": {"required": False, "type": str},
            "is_active": {"required": False, "type": bool},
        }

    @classmethod
    def update_fields(cls):
        return cls.insert_fields()

    @classmethod
    def search_fields(cls):
        return {
            "name": {"type": str, "operator": "like"},
            "type": {"type": str, "operator": "eq"},
            "badge": {"type": str, "operator": "eq"},
        }

    @classmethod
    def custom_actions(cls):
        return {
            "toggle_sold_out": {
                "method": "PATCH",
                "label": "Toggle sold out",
                "confirm": False,
            },
        }
