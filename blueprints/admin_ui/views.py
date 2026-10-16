"""
Vues auto-générées (pages admin) — scaffold_frontend.py.
Relance avec --force pour régénérer ce fichier après ajout d'un modèle.
"""
import json
from datetime import date

from flask import render_template
from auth import login_required, generate_csrf_token
from models.product_request import ProductRequest

from models.base import Base
from models.order import Order
from models.swap import Swap

from . import admin_ui_bp

MENU_ITEMS = [
    {
        "key": "artist",
        "label": "Artists",
        "url": "/admin/artists"
    },
    {
        "key": "base",
        "label": "Bases",
        "url": "/admin/bases"
    },
    {
        "key": "order",
        "label": "Orders",
        "url": "/admin/orders"
    },
    {
        "key": "review",
        "label": "Reviews",
        "url": "/admin/reviews"
    },
    {
        "key": "subscriber",
        "label": "Email subscribers",
        "url": "/admin/subscribers"
    },
    {
        "key": "swap",
        "label": "Swaps",
        "url": "/admin/swaps"
    },
    {
        "key": "product_request",
        "label": "Pre-order requests",
        "url": "/admin/product-requests"
    },
    {
        "key": "user",
        "label": "Customers",
        "url": "/admin/users"
    }
]
AUTH_ENABLED = True
SOCKETIO_ENABLED = False
AUDIT_ENABLED = False


@admin_ui_bp.route("/admin/artists")
@login_required
def artist_list():
    return render_template(
        "admin/artist_list.html",
        menu_items=MENU_ITEMS,
        active="artist",
        auth_enabled=AUTH_ENABLED,
        socketio_enabled=SOCKETIO_ENABLED,
        audit_enabled=AUDIT_ENABLED,
        csrf_token=generate_csrf_token(),
        menu_label='Artists',
        pk='id',
        api_base='/api/artists',
        list_fields=['id', 'name', 'bio', 'avatar_url'],
        field_labels={'id': 'id', 'name': 'name', 'bio': 'bio', 'avatar_url': 'avatar_url'},
        insert_fields={'name': {'required': True, 'type': 'str'}, 'bio': {'required': False, 'type': 'str'},
                       'avatar_url': {'required': False, 'type': 'str'}},
        update_fields={},
        search_fields=['name'],
        actions=['create', 'update', 'delete'],
        custom_actions=[],
        foreign_keys={},
    )


@admin_ui_bp.route("/admin/bases")
@login_required
def base_list():
    return render_template(
        "admin/base_list.html",
        menu_items=MENU_ITEMS,
        active="base",
        auth_enabled=AUTH_ENABLED,
        socketio_enabled=SOCKETIO_ENABLED,
        audit_enabled=AUDIT_ENABLED,
        csrf_token=generate_csrf_token(),
        menu_label='Bases',
        pk='id',
        api_base='/api/bases',
        list_fields=['id', 'name', 'type', 'color', 'price', 'badge', 'sizes', 'size_stock', 'included_panel', 'sold_out', 'ordered_even_out_of_stock', 'is_active'],
        field_labels={'id': 'ID', 'name': 'Product name', 'type': 'Type', 'color': 'Color', 'price': 'Price',
                      'badge': 'Label', 'sizes': 'Sizes', 'size_stock': 'Stock by size', 'included_panel': 'Includes panel',
                      'sold_out': 'Sold out', 'ordered_even_out_of_stock': 'Allow orders when sold out', 'is_active': 'Visible to customers'},
        insert_fields={
            'name': {'required': True, 'type': 'str', 'label': 'Product name'},
            'type': {'required': True, 'type': 'str', 'label': 'Product type'},
            'color': {'required': False, 'type': 'str', 'label': 'Color'},
            'price': {'required': True, 'type': 'float', 'label': 'Price'},
            'badge': {'required': False, 'type': 'str', 'label': 'Badge'},
            'description': {'required': False, 'type': 'textarea', 'label': 'Short description'},
            'features': {'required': False, 'type': 'friendly_list', 'label': 'Product highlights',
                         'help': 'Add short points customers should know about this base.'},
            'sizes': {'required': False, 'type': 'friendly_list', 'label': 'Available sizes',
                      'help': 'Add each size customers can choose. Leave empty if this base has no sizes.'},
            'size_stock': {'required': False, 'type': 'friendly_stock', 'label': 'Stock for each size',
                           'help': 'Enter the number currently available for each size. Leave a size blank to avoid tracking it.'},
            'size_guide': {'required': False, 'type': 'friendly_size_guide', 'label': 'Size guide'},
            'details': {'required': False, 'type': 'textarea', 'label': 'Details'},
            'materials_care': {'required': False, 'type': 'textarea', 'label': 'Materials & care'},
            'fit': {'required': False, 'type': 'textarea', 'label': 'Fit'},
            'shipping_returns': {'required': False, 'type': 'textarea', 'label': 'Shipping & returns'},
            'included_panel': {'required': False, 'type': 'bool', 'label': 'Includes a matching panel'},
            'sold_out': {'required': False, 'type': 'bool', 'label': 'Mark as sold out'},
            'ordered_even_out_of_stock': {'required': False, 'type': 'bool', 'label': 'Allow orders while out of stock', 'default': True,
                                          'help': 'When off, customers can send a request instead of placing an order.'},
            'image_url': {'required': False, 'type': 'str', 'label': 'Fallback image address', 'help': 'Used only when no gallery image is available.'},
            'images': {'required': False, 'type': 'images', 'label': 'Product photos'},
            'is_active': {'required': False, 'type': 'bool', 'label': 'Show this product to customers', 'default': True},
        },
        update_fields={
            'name': {'required': True, 'type': 'str', 'label': 'Product name'},
            'type': {'required': True, 'type': 'str', 'label': 'Product type'},
            'color': {'required': False, 'type': 'str', 'label': 'Color'},
            'price': {'required': True, 'type': 'float', 'label': 'Price'},
            'badge': {'required': False, 'type': 'str', 'label': 'Badge'},
            'description': {'required': False, 'type': 'textarea', 'label': 'Short description'},
            'features': {'required': False, 'type': 'friendly_list', 'label': 'Product highlights',
                         'help': 'Add short points customers should know about this base.'},
            'sizes': {'required': False, 'type': 'friendly_list', 'label': 'Available sizes',
                      'help': 'Add each size customers can choose. Leave empty if this base has no sizes.'},
            'size_stock': {'required': False, 'type': 'friendly_stock', 'label': 'Stock for each size',
                           'help': 'Enter the number currently available for each size. Leave a size blank to avoid tracking it.'},
            'size_guide': {'required': False, 'type': 'friendly_size_guide', 'label': 'Size guide'},
            'details': {'required': False, 'type': 'textarea', 'label': 'Details'},
            'materials_care': {'required': False, 'type': 'textarea', 'label': 'Materials & care'},
            'fit': {'required': False, 'type': 'textarea', 'label': 'Fit'},
            'shipping_returns': {'required': False, 'type': 'textarea', 'label': 'Shipping & returns'},
            'included_panel': {'required': False, 'type': 'bool', 'label': 'Includes a matching panel'},
            'sold_out': {'required': False, 'type': 'bool', 'label': 'Mark as sold out'},
            'ordered_even_out_of_stock': {'required': False, 'type': 'bool', 'label': 'Allow orders while out of stock',
                                          'help': 'When off, customers can send a request instead of placing an order.'},
            'image_url': {'required': False, 'type': 'str', 'label': 'Fallback image address', 'help': 'Used only when no gallery image is available.'},
            'images': {'required': False, 'type': 'images', 'label': 'Product photos'},
            'is_active': {'required': False, 'type': 'bool', 'label': 'Show this product to customers'},
        },
        search_fields=['name', 'type', 'badge'],
        actions=['create', 'update', 'delete'],
        custom_actions=[
            {'name': 'toggle_sold_out', 'method': 'PATCH', 'label': 'Toggle sold out', 'confirm': False, 'params': [],
             'route': '/api/bases/<int:id>/toggle_sold_out'}],
        foreign_keys={},
    )


@admin_ui_bp.route("/admin/carts")
@login_required
def cart_list():
    return render_template(
        "admin/cart_list.html",
        menu_items=MENU_ITEMS,
        active="cart",
        auth_enabled=AUTH_ENABLED,
        socketio_enabled=SOCKETIO_ENABLED,
        audit_enabled=AUDIT_ENABLED,
        csrf_token=generate_csrf_token(),
        menu_label='Cart',
        pk='id',
        api_base='/api/carts',
        list_fields=['id', 'user', 'session_key'],
        field_labels={'id': 'id', 'user': 'user', 'session_key': 'session_key'},
        insert_fields={'user': {'required': False, 'type': 'int'}, 'session_key': {'required': False, 'type': 'str'}},
        update_fields={},
        search_fields=['session_key'],
        actions=['create', 'update', 'delete'],
        custom_actions=[],
        foreign_keys={},
    )


@admin_ui_bp.route("/admin/cart_items")
@login_required
def cart_item_list():
    return render_template(
        "admin/cart_item_list.html",
        menu_items=MENU_ITEMS,
        active="cart_item",
        auth_enabled=AUTH_ENABLED,
        socketio_enabled=SOCKETIO_ENABLED,
        audit_enabled=AUDIT_ENABLED,
        csrf_token=generate_csrf_token(),
        menu_label='CartItem',
        pk='id',
        api_base='/api/cart_items',
         list_fields=['id', 'cart', 'kind', 'base', 'swap', 'size', 'quantity'],
         field_labels={'id': 'id', 'cart': 'cart', 'kind': 'kind', 'base': 'base', 'swap': 'swap',
                       'size': 'size', 'quantity': 'quantity'},
        insert_fields={'cart': {'required': True, 'type': 'int'}, 'kind': {'required': True, 'type': 'str'},
                       'base': {'required': False, 'type': 'int'}, 'swap': {'required': False, 'type': 'int'},
                      'size': {'required': False, 'type': 'str'}, 'quantity': {'required': False, 'type': 'int'}},
        update_fields={'quantity': {'required': True, 'type': 'int'}},
        search_fields=['kind'],
        actions=['create', 'update', 'delete'],
        custom_actions=[],
        foreign_keys={},
    )


@admin_ui_bp.route("/admin/orders")
@login_required
def order_list():
    return render_template(
        "admin/order_list.html",
        menu_items=MENU_ITEMS,
        active="order",
        auth_enabled=AUTH_ENABLED,
        socketio_enabled=SOCKETIO_ENABLED,
        audit_enabled=AUDIT_ENABLED,
        csrf_token=generate_csrf_token(),
        menu_label='Orders',
        pk='id',
        api_base='/api/orders',
        list_fields=['id', 'full_name', 'email', 'phone', 'total', 'status', 'created_at'],
        field_labels={'id': 'Order #', 'full_name': 'Customer', 'email': 'Email', 'phone': 'Phone',
                      'address': 'Address', 'region': 'Region', 'payment_method': 'Payment', 'total': 'Total', 'status': 'Order stage', 'created_at': 'Placed'},
        insert_fields={'user': {'required': False, 'type': 'int'}, 'full_name': {'required': True, 'type': 'str'},
                       'email': {'required': True, 'type': 'str'}, 'phone': {'required': False, 'type': 'str'},
                       'address': {'required': True, 'type': 'str'}, 'region': {'required': False, 'type': 'str'},
                       'city': {'required': True, 'type': 'str'}, 'country': {'required': True, 'type': 'str'}},
        update_fields={'status': {'required': True, 'type': 'str', 'label': 'Order stage', 'choices': ['pending', 'contacted', 'confirmed', 'paid', 'shipped', 'cancelled'],
                                  'choiceLabels': {'pending': 'New', 'contacted': 'Contacted', 'confirmed': 'Confirmed', 'paid': 'Confirmed (legacy)', 'shipped': 'Shipped', 'cancelled': 'Cancelled'}}},
        search_fields=['id', 'full_name', 'email', 'phone', 'status'],
        status_choices={'pending,contacted': 'Needs follow-up', 'pending': 'New', 'contacted': 'Contacted', 'confirmed': 'Confirmed', 'paid': 'Confirmed', 'shipped': 'Shipped', 'cancelled': 'Cancelled'},
        actions=[],
        custom_actions=[],
        foreign_keys={},
    )


@admin_ui_bp.route("/admin/order_items")
@login_required
def order_item_list():
    return render_template(
        "admin/order_item_list.html",
        menu_items=MENU_ITEMS,
        active="order_item",
        auth_enabled=AUTH_ENABLED,
        socketio_enabled=SOCKETIO_ENABLED,
        audit_enabled=AUDIT_ENABLED,
        csrf_token=generate_csrf_token(),
        menu_label='OrderItem',
        pk='id',
        api_base='/api/order_items',
         list_fields=['id', 'order', 'kind', 'base', 'swap', 'name', 'size', 'unit_price', 'quantity'],
         field_labels={'id': 'id', 'order': 'order', 'kind': 'kind', 'base': 'base', 'swap': 'swap', 'name': 'name',
                       'size': 'size',
                      'unit_price': 'unit_price', 'quantity': 'quantity'},
        insert_fields={'order': {'required': True, 'type': 'int'}, 'kind': {'required': True, 'type': 'str'},
                       'base': {'required': False, 'type': 'int'}, 'swap': {'required': False, 'type': 'int'},
                      'name': {'required': True, 'type': 'str'}, 'size': {'required': False, 'type': 'str'}, 'unit_price': {'required': True, 'type': 'float'},
                       'quantity': {'required': False, 'type': 'int'}},
        update_fields={'quantity': {'required': True, 'type': 'int'}},
        search_fields=['name'],
        actions=['create', 'update', 'delete'],
        custom_actions=[],
        foreign_keys={},
    )


@admin_ui_bp.route("/admin/reviews")
@login_required
def review_list():
    return render_template(
        "admin/review_list.html",
        menu_items=MENU_ITEMS,
        active="review",
        auth_enabled=AUTH_ENABLED,
        socketio_enabled=SOCKETIO_ENABLED,
        audit_enabled=AUDIT_ENABLED,
        csrf_token=generate_csrf_token(),
        menu_label='Reviews',
        pk='id',
        api_base='/api/reviews',
        list_fields=['id', 'author_name', 'rating', 'quote', 'is_published'],
        field_labels={'id': 'id', 'author_name': 'author_name', 'rating': 'rating', 'quote': 'quote',
                      'is_published': 'is_published'},
        insert_fields={'author_name': {'required': True, 'type': 'str'}, 'rating': {'required': False, 'type': 'int'},
                       'quote': {'required': True, 'type': 'str'}, 'is_published': {'required': False, 'type': 'bool'}},
        update_fields={},
        search_fields=['author_name', 'quote'],
        actions=['create', 'update', 'delete'],
        custom_actions=[],
        foreign_keys={},
    )


@admin_ui_bp.route("/admin/subscribers")
@login_required
def subscriber_list():
    return render_template(
        "admin/subscriber_list.html",
        menu_items=MENU_ITEMS,
        active="subscriber",
        auth_enabled=AUTH_ENABLED,
        socketio_enabled=SOCKETIO_ENABLED,
        audit_enabled=AUDIT_ENABLED,
        csrf_token=generate_csrf_token(),
        menu_label='Email subscribers',
        pk='id',
        api_base='/api/subscribers',
        list_fields=['id', 'email'],
        field_labels={'id': 'id', 'email': 'email'},
        insert_fields={'email': {'required': True, 'type': 'str'}},
        update_fields={'email': {'required': True, 'type': 'str'}},
        search_fields=['email'],
        actions=['create', 'update', 'delete'],
        custom_actions=[],
        foreign_keys={},
    )


@admin_ui_bp.route("/admin/swaps")
@login_required
def swap_list():
    return render_template(
        "admin/swap_list.html",
        menu_items=MENU_ITEMS,
        active="swap",
        auth_enabled=AUTH_ENABLED,
        socketio_enabled=SOCKETIO_ENABLED,
        audit_enabled=AUDIT_ENABLED,
        csrf_token=generate_csrf_token(),
        menu_label='Swaps',
        pk='id',
        api_base='/api/swaps',
        list_fields=['id', 'name', 'artist', 'price', 'is_free', 'stock_quantity', 'ordered_even_out_of_stock', 'popularity', 'images', 'is_active'],
        field_labels={'id': 'ID', 'name': 'Swap name', 'artist': 'Artist', 'price': 'Price', 'is_free': 'Free',
                      'popularity': 'Display order', 'stock_quantity': 'Stock', 'ordered_even_out_of_stock': 'Allow orders when sold out', 'image_url': 'Fallback image address', 'images': 'Product photos', 'is_active': 'Visible to customers'},
        insert_fields={'name': {'required': True, 'type': 'str', 'label': 'Swap name'}, 'artist': {'required': True, 'type': 'int', 'label': 'Artist'},
                       'price': {'required': False, 'type': 'float', 'label': 'Price'}, 'is_free': {'required': False, 'type': 'bool', 'label': 'This swap is free'},
                       'popularity': {'required': False, 'type': 'int', 'label': 'Sort rank', 'help': 'Optional: smaller numbers appear earlier.'},
                       'image_url': {'required': False, 'type': 'str', 'label': 'Fallback image address', 'help': 'Used only when no gallery image is available.'}, 'images': {'required': False, 'type': 'images', 'label': 'Swap photos'},
                       'stock_quantity': {'required': False, 'type': 'int', 'label': 'Available quantity', 'help': 'Leave blank if you do not track stock.'},
                       'ordered_even_out_of_stock': {'required': False, 'type': 'bool', 'label': 'Allow orders while out of stock', 'default': True,
                                                     'help': 'When off, customers can send a request instead of placing an order.'},
                       'is_active': {'required': False, 'type': 'bool', 'label': 'Show this swap to customers', 'default': True}},
        update_fields={'name': {'required': False, 'type': 'str', 'label': 'Swap name'}, 'artist': {'required': False, 'type': 'int', 'label': 'Artist'},
                       'price': {'required': False, 'type': 'float', 'label': 'Price'}, 'is_free': {'required': False, 'type': 'bool', 'label': 'This swap is free'},
                       'popularity': {'required': False, 'type': 'int', 'label': 'Sort rank', 'help': 'Optional: smaller numbers appear earlier.'}, 'image_url': {'required': False, 'type': 'str', 'label': 'Fallback image address', 'help': 'Used only when no gallery image is available.'},
                       'images': {'required': False, 'type': 'images', 'label': 'Swap photos'},
                       'stock_quantity': {'required': False, 'type': 'int', 'label': 'Available quantity', 'help': 'Leave blank if you do not track stock.'},
                       'ordered_even_out_of_stock': {'required': False, 'type': 'bool', 'label': 'Allow orders while out of stock',
                                                     'help': 'When off, customers can send a request instead of placing an order.'},
                       'is_active': {'required': False, 'type': 'bool', 'label': 'Show this swap to customers'}},
        search_fields=['name'],
        actions=['create', 'update', 'delete'],
        custom_actions=[],
        foreign_keys={'artist': {'apiBase': '/api/artists', 'displayField': 'name', 'sourceField': 'artist_id'}},
    )


@admin_ui_bp.route("/admin/product-requests")
@login_required
def product_request_list():
    return render_template(
        "admin/product_requests.html",
        menu_items=MENU_ITEMS,
        active="product_request",
        auth_enabled=AUTH_ENABLED,
        socketio_enabled=SOCKETIO_ENABLED,
        audit_enabled=AUDIT_ENABLED,
        csrf_token=generate_csrf_token(),
        menu_label="Pre-order requests",
        requests=ProductRequest.select().order_by(ProductRequest.created_at.desc()),
    )


@admin_ui_bp.route("/admin/users")
@login_required
def user_list():
    return render_template(
        "admin/user_list.html",
        menu_items=MENU_ITEMS,
        active="user",
        auth_enabled=AUTH_ENABLED,
        socketio_enabled=SOCKETIO_ENABLED,
        audit_enabled=AUDIT_ENABLED,
        csrf_token=generate_csrf_token(),
        menu_label='Customers',
        pk='id',
        api_base='/api/users',
        list_fields=['id', 'name', 'email', 'password'],
        field_labels={'id': 'id', 'name': 'name', 'email': 'email', 'password': 'password'},
        insert_fields={'name': {'required': True, 'type': 'str'}, 'email': {'required': True, 'type': 'str'},
                       'password': {'required': True, 'type': 'str'}},
        update_fields={'name': {'required': False, 'type': 'str'}, 'role': {'required': False, 'type': 'str'},
                       'is_active': {'required': False, 'type': 'bool'}},
        search_fields=['name', 'email'],
        actions=['create', 'update', 'delete'],
        custom_actions=[],
        foreign_keys={},
    )


@admin_ui_bp.route("/admin/")
@admin_ui_bp.route("/admin")
@login_required
def index():
    pending_orders = Order.select().where(Order.status.in_(['pending', 'contacted'])).order_by(Order.created_at.desc())
    today_orders = Order.select().where(Order.created_at >= date.today()).count()
    low_stock = []
    for base in Base.select().where(Base.is_active == True):
        try:
            stock = json.loads(base.size_stock or '{}')
            if not isinstance(stock, dict):
                stock = {}
        except (TypeError, ValueError):
            stock = {}
        quantities = []
        for value in stock.values():
            try:
                quantities.append(int(value))
            except (TypeError, ValueError):
                continue
        if any(0 <= quantity <= 3 for quantity in quantities):
            low_stock.append({'name': base.name, 'url': '/admin/bases'})
    for swap in Swap.select().where(Swap.is_active == True, Swap.stock_quantity.is_null(False), Swap.stock_quantity <= 3):
        low_stock.append({'name': swap.name, 'url': '/admin/swaps'})
    recent_orders = list(Order.select().order_by(Order.created_at.desc()).limit(5))
    return render_template(
        "admin/index.html", menu_items=MENU_ITEMS, active=None,
        auth_enabled=AUTH_ENABLED, csrf_token=generate_csrf_token(),
        socketio_enabled=SOCKETIO_ENABLED,
        audit_enabled=AUDIT_ENABLED,
        pending_orders=list(pending_orders.limit(5)),
        pending_order_count=pending_orders.count(),
        today_order_count=today_orders,
        low_stock=low_stock[:8],
        low_stock_count=len(low_stock),
        recent_orders=recent_orders,
    )
