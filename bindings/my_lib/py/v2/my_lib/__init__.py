# Clean Python facade re-exporting the modular submodules for Preview 2
import os
import sys

# Ensure the generated directory is in the sys.path so its internal imports resolve
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_GENERATED_DIR = os.path.join(_CURRENT_DIR, "_generated")
if _GENERATED_DIR not in sys.path:
    sys.path.insert(0, _GENERATED_DIR)

from . import geometry
from . import store
from . import lang
from . import network

__all__ = ["geometry", "store", "lang", "network"]
