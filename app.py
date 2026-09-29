'''Top-level entry point for the Flask application.

The test suite expects to import `app` from a module named `app`.
We provide a thin wrapper that re-exports the Flask application
instance defined in `backend/app.py`. This avoids altering the existing
backend structure while satisfying the import path used in the tests.
'''

from backend.app import app, create_app  # noqa: F401
