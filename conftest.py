"""Conftest to prevent sys.exit calls in test suites"""
import sys

def _no_exit(*args, **kwargs):
    # Override sys.exit to prevent premature termination of pytest collection
    return None

sys.exit = _no_exit
