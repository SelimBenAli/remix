"""Product-specific starter content and backwards-compatible DB upgrades."""
import json

from peewee import fn

from extensions import db
from models.base import Base


RAVEN_CONTENT = {
    "image_url": "https://swapwear.com/cdn/shop/files/raven-swapwear-jacket-front-panel.webp?v=1776110680&width=900",
    "color": "Raven",
    "description": (
        "With a unisex fit and subtle drop shoulder, this mid-weight denim jacket molds to your body over time. "
        "Designed for seamless modular art swaps, it features four functional pockets, easy snap buttons, "
        "and adjustable waist closures."
    ),
    "features": json.dumps(["FAST & EASY", "COMFORTABLE", "MADE TO LAST", "PATENTED", "UNISEX"], ensure_ascii=False),
    "sizes": json.dumps(["XS", "S", "M", "L", "XL", "2XL", "3XL"]),
    "size_guide": json.dumps({
        "columns": ["Chest", "Length"],
        "rows": [
            {"size": "XS", "chest": [36, 38], "length": 25},
            {"size": "S", "chest": [38, 40], "length": 26},
            {"size": "M", "chest": [40, 42], "length": 27},
            {"size": "L", "chest": [42, 44], "length": 28},
            {"size": "XL", "chest": [44, 46], "length": 29},
        ],
        "how_to_measure": [
            {"label": "Chest", "text": "Measure around the widest part of your chest."},
            {"label": "Waist", "text": "Measure around the narrowest part of your torso."},
            {"label": "Hips", "text": "Measure around the fullest part of your hips."},
        ],
        "advice": {
            "men": "Choose your usual size.",
            "women": "Size down from your usual size.",
        },
    }, ensure_ascii=False),
    "details": "\n".join([
        "Made from 12oz 100% pre-shrunk cotton denim",
        "x2 Medium front side pockets",
        "x2 Large inside pockets",
        "Adjustable waist slide closures",
        "Custom quiet snap buttons",
        "Precisely crafted with 10 stitches per inch",
        "100% Vegan paper leather brand label",
        "Includes x1 blank denim swap",
    ]),
    "materials_care": (
        "Made from 12 oz pre-shrunk cotton denim with a vegan paper-leather label. "
        "Reattach the blank panel before washing the base cold; spot-clean art panels."
    ),
    "fit": "😌 If the size you ordered doesn't fit, exchange it for free!",
    "shipping_returns": (
        "Tracked shipping is available. Start a return within 30 days of delivery; "
        "items must be unworn, unwashed, unaltered, and have their original tags. "
        "International duties and taxes may apply."
    ),
    "included_panel": True,
}

# Exact values filled by the first version of this migration. If present, they
# are defaults we supplied rather than admin edits, so upgrade the guide to
# match the backup page while preserving any customized guide.
PREVIOUS_RAVEN_SIZE_GUIDE = json.dumps({
    "columns": ["Chest", "Waist", "Hips"],
    "rows": [
        {"size": "XS", "chest": [32, 35], "waist": [31, 35], "hips": [30, 34]},
        {"size": "S", "chest": [35, 38], "waist": [34, 38], "hips": [33, 37]},
        {"size": "M", "chest": [38, 41], "waist": [37, 41], "hips": [36, 40]},
        {"size": "L", "chest": [41, 44], "waist": [40, 44], "hips": [39, 43]},
        {"size": "XL", "chest": [44, 47], "waist": [43, 47], "hips": [42, 46]},
        {"size": "2XL", "chest": [47, 50], "waist": [46, 50], "hips": [45, 49]},
        {"size": "3XL", "chest": [50, 55], "waist": [49, 53], "hips": [48, 52]},
    ],
    "how_to_measure": [
        {"label": "Chest", "text": "Measure around the fullest part of your chest."},
        {"label": "Waist", "text": "Measure around your natural waist, above the hips and below the ribs."},
        {"label": "Hips", "text": "Measure around the fullest part of your hips."},
    ],
    "advice": {"men": "Choose your usual size.", "women": "Consider sizing down from your usual size."},
}, ensure_ascii=False)
PREVIOUS_RAVEN_FEATURES = json.dumps(["Modular", "Pre-shrunk", "Durable"], ensure_ascii=False)


def ensure_product_detail_schema():
    """Add the new nullable columns to databases created by earlier versions."""
    additions = {
        "bases": {
            "color": "VARCHAR(120) NULL",
            "description": "TEXT NULL",
            "features": "TEXT NULL",
            "sizes": "TEXT NULL",
            "size_stock": "TEXT NULL",
            "size_guide": "TEXT NULL",
            "details": "TEXT NULL",
            "materials_care": "TEXT NULL",
            "fit": "TEXT NULL",
            "shipping_returns": "TEXT NULL",
            "included_panel": "BOOLEAN NULL",
            "ordered_even_out_of_stock": "BOOLEAN NOT NULL DEFAULT 1",
        },
        "cart_items": {"size": "VARCHAR(16) NULL"},
        "order_items": {"size": "VARCHAR(16) NULL"},
        "swaps": {
            "stock_quantity": "INTEGER NULL",
            "ordered_even_out_of_stock": "BOOLEAN NOT NULL DEFAULT 1",
        },
        "product_images": {"use_in_showroom": "BOOLEAN NOT NULL DEFAULT 0"},
        "orders": {
            "phone": "VARCHAR(32) NULL",
            "region": "VARCHAR(120) NULL",
            "payment_method": "VARCHAR(40) NOT NULL DEFAULT 'cash_on_delivery'",
        },
    }
    quote = "`" if db.obj.__class__.__name__ == "MySQLDatabase" else '"'
    for table, columns in additions.items():
        existing = {column.name for column in db.get_columns(table)}
        for name, declaration in columns.items():
            if name not in existing:
                db.execute_sql(
                    f"ALTER TABLE {quote}{table}{quote} "
                    f"ADD COLUMN {quote}{name}{quote} {declaration}"
                )

    raven = Base.get_or_none(fn.LOWER(Base.name) == "raven denim jacket")
    if raven is None:
        return
    changed = False
    for name, value in RAVEN_CONTENT.items():
        current = getattr(raven, name)
        legacy_default = (
            (name == "size_guide" and current == PREVIOUS_RAVEN_SIZE_GUIDE) or
            (name == "features" and current == PREVIOUS_RAVEN_FEATURES) or
            (name == "description" and current == "A mid-weight denim jacket designed for seamless modular art swaps.") or
            (name == "fit" and current == (
                "Unisex fit with a subtle drop shoulder and adjustable waist closures. "
                "The denim softens with wear. Men: choose your usual size. Women: consider sizing down."
            )) or
            (name == "details" and current == (
                "A versatile denim base with two front pockets and two large inside pockets. "
                "Finished with quiet snap buttons, adjustable waist closures, and one blank matching panel to get you started."
            ))
        )
        if current is None or (isinstance(current, str) and not current.strip()) or legacy_default:
            setattr(raven, name, value)
            changed = True
    if changed:
        raven.save()
