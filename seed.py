"""
Seed the database with the sample catalogue from the front end + one admin.

    python seed.py                      # admin password is generated and printed once
    ADMIN_EMAIL=me@x.com ADMIN_PASSWORD=... python seed.py

Safe to re-run: it only inserts rows when the tables are empty.
"""
import os
import secrets
import datetime

from werkzeug.security import generate_password_hash

from app import create_app
from extensions import db
from models.artist import Artist
from models.base import Base
from models.review import Review
from models.swap import Swap
from models.user import User
from services.base_product_defaults import RAVEN_CONTENT

BASES = [  # name, type, price, badge, sold_out
    ("Raven Denim Jacket", "Jacket", 119, "Best Seller", False),
    ("Onyx Hoodie", "Hoodie", 94, "Limited Run", False),
    ("Oceanside Denim Jacket", "Jacket", 128, None, False),
    ("Nightfall Workwear Jacket", "Jacket", 138, "Trending", False),
    ("Slate Hoodie", "Hoodie", 94, "Limited Run", True),
    ("Cobalt Denim Jacket", "Jacket", 128, "Limited Run", True),
    ("Indigo Denim Jacket", "Jacket", 128, "Limited Run", False),
    ("Sage Hoodie", "Hoodie", 94, "Limited Run", True),
    ("Tan Workwear Jacket", "Jacket", 138, None, False),
    ("Blu Stone Denim Jacket", "Jacket", 128, None, False),
    ("Ash Hoodie", "Hoodie", 94, "Trending", False),
    ("Rust Workwear Jacket", "Jacket", 138, None, False),
]

SWAPS = [  # name, artist, price (0 = free), popularity
    ("Eternal Fungi Patch", "Alex Almeida", 0, 98), ("Sugar Rush Patch", "Tonton Art", 0, 91),
    ("Garden Florals Patch", "Julie Amlin", 14, 87), ("Soul of the Retro Wave Patch", "Marcos Abdallah", 16, 95),
    ("What a Time to Be Alive Patch", "Reika Sato", 14, 80), ("Ryujin Patch", "Devon Cole", 18, 99),
    ("Sword of Damocles Patch", "Alex Almeida", 16, 76), ("Yamato Patch", "Tonton Art", 18, 88),
    ("Toxic Patch", "Julie Amlin", 12, 70), ("Imaginary Friends Patch", "Marcos Abdallah", 14, 83),
    ("Coffee Dark Liquid Patch", "Reika Sato", 12, 65), ("Morning Ritual Patch", "Devon Cole", 12, 60),
    ("Matcha Patch", "Alex Almeida", 14, 90), ("Dim Sum Patch", "Tonton Art", 14, 77),
    ("Wild Fire Patch", "Julie Amlin", 16, 93), ("Lunar Eclipse Patch", "Marcos Abdallah", 18, 96),
]

REVIEWS = [
    ("Valerie L.", "Beautifully crafted, perfectly weighted, and made to hold its shape. This became the center of my outfits."),
    ("Maurice C.", "The quality, materials, and design feel premium without the premium markup. Easily a tremendous value."),
    ("Sandra B.", "Absolutely love my jacket and panels. The workmanship is top notch, and I'll definitely be buying again."),
]


def main():
    app = create_app()  # also creates the tables (safe=True)
    with app.app_context(), db.connection_context():
        if not User.select().exists():
            email = os.environ.get("ADMIN_EMAIL", "admin@remix.local")
            provided_password = os.environ.get("ADMIN_PASSWORD")
            if app.config.get("APP_ENV") == "production" and (not provided_password or not os.environ.get("ADMIN_EMAIL")):
                raise RuntimeError("Set ADMIN_EMAIL and ADMIN_PASSWORD before creating the first production admin")
            password = provided_password or secrets.token_urlsafe(24)
            User.create(name="Admin", email=email, role="admin",
                        password=generate_password_hash(password))
            if provided_password:
                print(f"Admin created -> {email} (password read from ADMIN_PASSWORD; value not logged)")
            else:
                print(f"Admin created -> {email} / {password}   (development password shown once)")

        if not Base.select().exists():
            for name, type_, price, badge, sold_out in BASES:
                details = RAVEN_CONTENT if name == "Raven Denim Jacket" else {}
                Base.create(name=name, type=type_, price=price, badge=badge,
                            sold_out=sold_out, **details)

        if not Swap.select().exists():
            now = datetime.datetime.now()
            artists = {}
            for i, (name, artist, price, pop) in enumerate(SWAPS):
                if artist not in artists:
                    artists[artist] = Artist.create(name=artist)
                Swap.create(name=name, artist=artists[artist], price=price, is_free=(price == 0),
                            popularity=pop, created_at=now - datetime.timedelta(days=len(SWAPS) - i))

        if not Review.select().exists():
            for author, quote in REVIEWS:
                Review.create(author_name=author, quote=quote)

        print(f"bases={Base.select().count()} swaps={Swap.select().count()} "
              f"artists={Artist.select().count()} reviews={Review.select().count()}")


if __name__ == "__main__":
    main()
