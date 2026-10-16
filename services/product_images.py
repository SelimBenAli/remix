import os
import shutil
import uuid

from flask import current_app
from werkzeug.utils import secure_filename

from models.base import Base
from models.product_image import ProductImage


ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024


def image_url(image):
    return "/uploads/" + image.image_path.replace(os.sep, "/")


def original_image_url(image):
    """Use a matching full-size source when a gallery row points at a derivative."""
    normalized_path = image.image_path.replace("\\", "/")
    optimized_marker = "/optimized/"
    if optimized_marker not in f"/{normalized_path}":
        return image_url(image)
    original_path = normalized_path.replace("optimized/", "", 1)
    upload_root = current_app.config.get("UPLOAD_FOLDER")
    original_file = os.path.join(upload_root, *original_path.split("/")) if upload_root else ""
    return "/uploads/" + original_path if original_file and os.path.isfile(original_file) else image_url(image)


def product_images(product):
    relation = ProductImage.base if product.__class__.__name__ == "Base" else ProductImage.swap
    return [{"id": image.id, "url": image_url(image), "originalUrl": original_image_url(image),
             "sortOrder": image.sort_order,
             "useInShowroom": bool(image.use_in_showroom),
             "showroomPlaceholder": os.path.basename(image.image_path).lower() == "showroom-empty-back.avif"}
            for image in ProductImage.select().where(relation == product).order_by(ProductImage.sort_order, ProductImage.id)]


def set_showroom_image(base, image_id):
    """Make one image in a base gallery the exclusive showroom image."""
    selected = ProductImage.get_or_none(
        (ProductImage.id == image_id) & (ProductImage.base == base)
    )
    if selected is None:
        return False
    with ProductImage._meta.database.atomic():
        ProductImage.update(use_in_showroom=False).where(ProductImage.base == base).execute()
        ProductImage.update(use_in_showroom=True).where(ProductImage.id == selected.id).execute()
    return True


def set_primary_image(product, image_id):
    """Move a selected gallery image to the first position for storefronts."""
    relation = ProductImage.base if product.__class__.__name__ == "Base" else ProductImage.swap
    selected = ProductImage.get_or_none((ProductImage.id == image_id) & (relation == product))
    if selected is None:
        return False
    images = list(ProductImage.select().where(relation == product).order_by(ProductImage.sort_order, ProductImage.id))
    images.remove(selected)
    images.insert(0, selected)
    with ProductImage._meta.database.atomic():
        for index, image in enumerate(images):
            ProductImage.update(sort_order=index).where(ProductImage.id == image.id).execute()
    return True


def ensure_base_showroom_images(upload_folder, app_root):
    """Install the example transparent garment placeholder for bases lacking one."""
    source = os.path.join(app_root, "static", "images", "try", "empty_back.avif")
    if not os.path.isfile(source):
        return
    relative_path = os.path.join("bases", "showroom-empty-back.avif")
    destination = os.path.join(upload_folder, relative_path)
    os.makedirs(os.path.dirname(destination), exist_ok=True)
    if not os.path.isfile(destination):
        shutil.copy2(source, destination)

    for base in Base.select():
        marked = list(ProductImage.select().where(
            (ProductImage.base == base) & (ProductImage.use_in_showroom == True)  # noqa: E712
        ).order_by(ProductImage.sort_order, ProductImage.id))
        if marked:
            # Keep exactly one marked image if an earlier manual edit left duplicates.
            for duplicate in marked[1:]:
                duplicate.use_in_showroom = False
                duplicate.save(only=[ProductImage.use_in_showroom])
            continue
        next_order = (ProductImage.select().where(ProductImage.base == base)
                      .order_by(ProductImage.sort_order.desc()).first())
        ProductImage.create(base=base, image_path=relative_path,
                            sort_order=(next_order.sort_order + 1 if next_order else 0),
                            use_in_showroom=True)


def validate_image_uploads(files):
    for upload in files:
        if not upload or not upload.filename:
            continue
        extension = os.path.splitext(secure_filename(upload.filename))[1].lower()
        if extension not in ALLOWED_IMAGE_EXTENSIONS:
            raise ValueError(f"'{upload.filename}' is not a supported image type")
        if upload.mimetype and not upload.mimetype.startswith("image/"):
            raise ValueError(f"'{upload.filename}' is not an image")
        upload.stream.seek(0, os.SEEK_END)
        size = upload.stream.tell()
        upload.stream.seek(0)
        if size > MAX_IMAGE_BYTES:
            raise ValueError(f"Each image must be 10 MB or smaller: '{upload.filename}'")


def save_product_images(product, files, remove_ids=()):
    relation = ProductImage.base if product.__class__.__name__ == "Base" else ProductImage.swap
    existing = list(ProductImage.select().where(relation == product))
    remove_ids = {int(value) for value in remove_ids if str(value).isdigit()}
    for image in existing:
        if image.id in remove_ids:
            image.delete_instance()
            _remove_file(image.image_path)

    next_order = max((image.sort_order for image in existing if image.id not in remove_ids), default=-1) + 1
    for upload in files:
        if not upload or not upload.filename:
            continue
        extension = os.path.splitext(secure_filename(upload.filename))[1].lower()
        folder = "bases" if product.__class__.__name__ == "Base" else "swaps"
        relative_path = os.path.join(folder, f"{uuid.uuid4().hex}{extension}")
        absolute_path = os.path.join(current_app.config["UPLOAD_FOLDER"], relative_path)
        os.makedirs(os.path.dirname(absolute_path), exist_ok=True)
        upload.save(absolute_path)
        try:
            is_first_base_image = (
                product.__class__.__name__ == "Base" and
                not ProductImage.select().where(
                    (ProductImage.base == product) & (ProductImage.use_in_showroom == True)  # noqa: E712
                ).exists()
            )
            ProductImage.create(**{relation.name: product}, image_path=relative_path,
                                sort_order=next_order, use_in_showroom=is_first_base_image)
        except Exception:
            _remove_file(relative_path)
            raise
        next_order += 1


def delete_product_images(product):
    relation = ProductImage.base if product.__class__.__name__ == "Base" else ProductImage.swap
    for image in ProductImage.select().where(relation == product):
        image.delete_instance()
        _remove_file(image.image_path)


def _remove_file(relative_path):
    if ProductImage.select().where(ProductImage.image_path == relative_path).exists():
        return
    root = os.path.abspath(current_app.config["UPLOAD_FOLDER"])
    path = os.path.abspath(os.path.join(root, relative_path))
    if os.path.commonpath([root, path]) == root and os.path.isfile(path):
        os.remove(path)
