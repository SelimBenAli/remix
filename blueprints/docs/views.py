"""
Documentation API (OpenAPI + Swagger UI), auto-généré par scaffold.py --docs.
Relance avec --force --docs après un changement de modèle pour régénérer
openapi.json.
"""
import json
import os

from flask import jsonify, render_template_string

from . import docs_bp

_SPEC_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "openapi.json",
)

SWAGGER_HTML = """<!doctype html>
<html>
<head>
  <title>Documentation API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function () {
      SwaggerUIBundle({ url: "/api/openapi.json", dom_id: "#swagger-ui" });
    };
  </script>
</body>
</html>
"""


@docs_bp.route("/api/openapi.json")
def openapi_spec():
    with open(_SPEC_PATH, encoding="utf-8") as f:
        return jsonify(json.load(f))


@docs_bp.route("/api/docs")
def swagger_ui():
    return render_template_string(SWAGGER_HTML)
