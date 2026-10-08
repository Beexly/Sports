# Kats Vendored Models

This directory contains vendored models from `facebookresearch/Kats`.
These are included locally to bypass direct pip install requirements and ensure strict environment constraints.

**Original Source:** [https://github.com/facebookresearch/Kats](https://github.com/facebookresearch/Kats)
**License:** MIT

Modifications to original source include absolute local import paths, removal of parameter search space scaffolding, and dataclass refactoring to skip `attr` dependency.
