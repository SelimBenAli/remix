"""
Vues auto-générées (pages admin) — scaffold_frontend.py.
Relance avec --force pour régénérer ce fichier après ajout d'un modèle.
"""
from flask import render_template
from auth import login_required, generate_csrf_token
from models.product_request import ProductRequest

from . import admin_ui_bp

MENU_ITEMS = [
    {
        "key": "artist",
        "label": "Artist",
        "url": "/admin/artists"
    },
    {
        "key": "base",
        "label": "Base",
        "url": "/admin/bases"
    },
    {
        "key": "order",
        "label": "Order",
        "url": "/admin/orders"
    },
    {
        "key": "review",
        "label": "Review",
        "url": "/admin/reviews"
    },
    {
        "key": "subscriber",
        "label": "Subscriber",
        "url": "/admin/subscribers"
    },
    {
        "key": "swap",
        "label": "Swap",
        "url": "/admin/swaps"
    },
    {
        "key": "product_request",
        "label": "Pre-order requests",
        "url": "/admin/product-requests"
    },
    {
        "key": "user",
        "label": "User",
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
        menu_label='Artist',
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
        menu_label='Base',
        pk='id',
        api_base='/api/bases',
        list_fields=['id', 'name', 'type', 'color', 'price', 'badge', 'sizes', 'included_panel', 'sold_out', 'ordered_even_out_of_stock', 'is_active'],
        field_labels={'id': 'id', 'name': 'name', 'type': 'type', 'color': 'color', 'price': 'price',
                      'badge': 'badge', 'sizes': 'sizes', 'included_panel': 'includes panel',
                      'sold_out': 'sold_out', 'ordered_even_out_of_stock': 'Allow order when out of stock', 'is_active': 'is_active'},
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
            'included_panel': {'required': False, 'type': 'bool', 'label': 'Includes matching panel'},
            'sold_out': {'required': False, 'type': 'bool', 'label': 'Sold out'},
            'ordered_even_out_of_stock': {'required': False, 'type': 'bool', 'label': 'Allow ordering when out of stock', 'default': True},
            'image_url': {'required': False, 'type': 'str', 'label': 'Image URL'},
            'images': {'required': False, 'type': 'images', 'label': 'Product images'},
            'is_active': {'required': False, 'type': 'bool', 'label': 'Active'},
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
            'included_panel': {'required': False, 'type': 'bool', 'label': 'Includes matching panel'},
            'sold_out': {'required': False, 'type': 'bool', 'label': 'Sold out'},
            'ordered_even_out_of_stock': {'required': False, 'type': 'bool', 'label': 'Allow ordering when out of stock'},
            'image_url': {'required': False, 'type': 'str', 'label': 'Image URL'},
            'images': {'required': False, 'type': 'images', 'label': 'Product images'},
            'is_active': {'required': False, 'type': 'bool', 'label': 'Active'},
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
        menu_label='Order',
        pk='id',
        api_base='/api/orders',
        list_fields=['id', 'user', 'full_name', 'email', 'phone', 'address', 'region', 'payment_method', 'total', 'status'],
        field_labels={'id': 'id', 'user': 'user', 'full_name': 'full_name', 'email': 'email', 'phone': 'phone',
                      'address': 'address', 'region': 'region', 'payment_method': 'payment_method', 'total': 'total', 'status': 'status'},
        insert_fields={'user': {'required': False, 'type': 'int'}, 'full_name': {'required': True, 'type': 'str'},
                       'email': {'required': True, 'type': 'str'}, 'phone': {'required': False, 'type': 'str'},
                       'address': {'required': True, 'type': 'str'}, 'region': {'required': False, 'type': 'str'},
                       'city': {'required': True, 'type': 'str'}, 'country': {'required': True, 'type': 'str'}},
        update_fields={'status': {'required': True, 'type': 'str'}},
        search_fields=['full_name', 'email', 'status'],
        actions=['create', 'update', 'delete'],
        custom_actions=[{'name': 'mark_paid', 'method': 'PATCH', 'label': 'Mark as paid', 'confirm': True, 'params': [],
                         'route': '/api/orders/<int:id>/mark_paid'},
                        {'name': 'ship', 'method': 'PATCH', 'label': 'Mark as shipped', 'confirm': True, 'params': [],
                         'route': '/api/orders/<int:id>/ship'},
                        {'name': 'cancel', 'method': 'PATCH', 'label': 'Cancel order', 'confirm': True, 'params': [],
                         'route': '/api/orders/<int:id>/cancel'}],
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
        menu_label='Review',
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
        menu_label='Subscriber',
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
        menu_label='Swap',
        pk='id',
        api_base='/api/swaps',
        list_fields=['id', 'name', 'artist', 'price', 'is_free', 'stock_quantity', 'ordered_even_out_of_stock', 'popularity', 'image_url', 'images', 'is_active'],
        field_labels={'id': 'id', 'name': 'name', 'artist': 'artist', 'price': 'price', 'is_free': 'is_free',
                      'popularity': 'popularity', 'stock_quantity': 'stock', 'ordered_even_out_of_stock': 'Allow order when out of stock', 'image_url': 'image_url', 'images': 'images', 'is_active': 'is_active'},
        insert_fields={'name': {'required': True, 'type': 'str'}, 'artist': {'required': True, 'type': 'int', 'label': 'Artist'},
                       'price': {'required': False, 'type': 'float'}, 'is_free': {'required': False, 'type': 'bool'},
                       'popularity': {'required': False, 'type': 'int'},
                       'image_url': {'required': False, 'type': 'str'}, 'images': {'required': False, 'type': 'images', 'label': 'Product images'},
                       'stock_quantity': {'required': False, 'type': 'int', 'label': 'Stock quantity (blank = untracked)'},
                       'ordered_even_out_of_stock': {'required': False, 'type': 'bool', 'label': 'Allow ordering when out of stock', 'default': True},
                       'is_active': {'required': False, 'type': 'bool'}},
        update_fields={'name': {'required': False, 'type': 'str'}, 'artist': {'required': False, 'type': 'int', 'label': 'Artist'},
                       'price': {'required': False, 'type': 'float'}, 'is_free': {'required': False, 'type': 'bool'},
                       'popularity': {'required': False, 'type': 'int'}, 'image_url': {'required': False, 'type': 'str'},
                       'images': {'required': False, 'type': 'images', 'label': 'Product images'},
                       'stock_quantity': {'required': False, 'type': 'int', 'label': 'Stock quantity (blank = untracked)'},
                       'ordered_even_out_of_stock': {'required': False, 'type': 'bool', 'label': 'Allow ordering when out of stock'},
                       'is_active': {'required': False, 'type': 'bool'}},
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
        menu_label='User',
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
    return render_template(
        "admin/index.html", menu_items=MENU_ITEMS, active=None,
        auth_enabled=AUTH_ENABLED, csrf_token=generate_csrf_token(),
        socketio_enabled=SOCKETIO_ENABLED,
        audit_enabled=AUDIT_ENABLED,
    )
