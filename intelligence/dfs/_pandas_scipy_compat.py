#!/usr/bin/env python3
"""
Pure-Python / NumPy Compatibility Layer for `pandas` and `scipy` in DFS & Engine Modules
========================================================================================
Ensures that all DFS, projection, simulation, and portfolio optimization modules run
deterministically even in sandboxed Python environments where `pandas` or `scipy` are
not installed.
"""

from __future__ import annotations

import csv
import math
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, Iterator, List, Optional, Sequence, Tuple, Union

import numpy as np


def isna(val: Any) -> bool:
    if val is None:
        return True
    if isinstance(val, float) and math.isnan(val):
        return True
    return False


def notna(val: Any) -> bool:
    return not isna(val)


class MiniSeries:
    """Lightweight 1D columnar series compatible with common pandas Series operations."""

    def __init__(self, data: Any = None, index: Optional[Sequence[int]] = None, dtype: Any = None) -> None:
        if isinstance(data, MiniSeries):
            raw = list(data._data)
        elif isinstance(data, np.ndarray):
            raw = data.tolist()
        elif isinstance(data, (list, tuple)):
            raw = list(data)
        elif data is None:
            raw = [None] * (len(index) if index is not None else 0)
        else:
            n = len(index) if index is not None else 1
            raw = [data] * n
        if dtype is not None:
            raw = self._cast_list(raw, dtype)
        self._data: List[Any] = raw

    @staticmethod
    def _cast_list(items: List[Any], dtype: Any) -> List[Any]:
        if dtype in (int, np.int64, np.int32, "int", "int64", "int32"):
            return [int(float(x)) if notna(x) and str(x) != "" else 0 for x in items]
        if dtype in (float, np.float64, np.float32, "float", "float64", "float32"):
            return [float(x) if notna(x) and str(x) != "" else 0.0 for x in items]
        if dtype in (bool, "bool"):
            return [bool(x) for x in items]
        if dtype in (str, "str"):
            return [str(x) if x is not None else "" for x in items]
        return list(items)

    def __len__(self) -> int:
        return len(self._data)

    def __iter__(self) -> Iterator[Any]:
        return iter(self._data)

    def __getitem__(self, key: Any) -> Any:
        if isinstance(key, int):
            return self._data[key]
        if isinstance(key, slice):
            return MiniSeries(self._data[key])
        if isinstance(key, (MiniSeries, np.ndarray, list)):
            arr = key._data if isinstance(key, MiniSeries) else list(key)
            if all(isinstance(x, (bool, np.bool_)) for x in arr):
                return MiniSeries([v for v, b in zip(self._data, arr) if b])
            return MiniSeries([self._data[int(i)] for i in arr])
        raise KeyError(key)

    @property
    def iloc(self) -> "MiniSeries":
        return self

    @property
    def values(self) -> np.ndarray:
        return np.asarray(self._data)

    def to_numpy(self, dtype: Any = None) -> np.ndarray:
        if dtype is not None:
            return np.asarray(self._cast_list(self._data, dtype), dtype=dtype)
        return np.asarray(self._data)

    def astype(self, dtype: Any) -> "MiniSeries":
        return MiniSeries(self._cast_list(self._data, dtype))

    def tolist(self) -> List[Any]:
        return list(self._data)

    def copy(self) -> "MiniSeries":
        return MiniSeries(list(self._data))

    def sum(self) -> float:
        return float(sum(float(x) for x in self._data if notna(x)))

    def mean(self) -> float:
        vals = [float(x) for x in self._data if notna(x)]
        return float(sum(vals) / len(vals)) if vals else 0.0

    def round(self, ndigits: int = 2) -> "MiniSeries":
        return MiniSeries([round(float(x), ndigits) if notna(x) else 0.0 for x in self._data])

    def isin(self, values: Iterable[Any]) -> "MiniSeries":
        val_set = set(values)
        return MiniSeries([x in val_set for x in self._data])

    def dropna(self) -> "MiniSeries":
        return MiniSeries([x for x in self._data if notna(x)])

    def unique(self) -> np.ndarray:
        seen: List[Any] = []
        for x in self._data:
            if x not in seen:
                seen.append(x)
        return np.asarray(seen, dtype=object)

    def _binop(self, other: Any, op: Callable[[Any, Any], Any]) -> "MiniSeries":
        if isinstance(other, MiniSeries):
            return MiniSeries([op(a, b) for a, b in zip(self._data, other._data)])
        if isinstance(other, np.ndarray):
            return MiniSeries([op(a, b) for a, b in zip(self._data, other.tolist())])
        return MiniSeries([op(a, other) for a in self._data])

    def __eq__(self, other: Any) -> "MiniSeries":  # type: ignore[override]
        return self._binop(other, lambda a, b: a == b)

    def __ne__(self, other: Any) -> "MiniSeries":  # type: ignore[override]
        return self._binop(other, lambda a, b: a != b)

    def __ge__(self, other: Any) -> "MiniSeries":
        return self._binop(other, lambda a, b: float(a) >= float(b))

    def __le__(self, other: Any) -> "MiniSeries":
        return self._binop(other, lambda a, b: float(a) <= float(b))

    def __gt__(self, other: Any) -> "MiniSeries":
        return self._binop(other, lambda a, b: float(a) > float(b))

    def __lt__(self, other: Any) -> "MiniSeries":
        return self._binop(other, lambda a, b: float(a) < float(b))

    def __and__(self, other: Any) -> "MiniSeries":
        return self._binop(other, lambda a, b: bool(a) and bool(b))

    def __or__(self, other: Any) -> "MiniSeries":
        return self._binop(other, lambda a, b: bool(a) or bool(b))

    def __invert__(self) -> "MiniSeries":
        return MiniSeries([not bool(a) for a in self._data])

    def __add__(self, other: Any) -> "MiniSeries":
        return self._binop(other, lambda a, b: float(a) + float(b))

    def __sub__(self, other: Any) -> "MiniSeries":
        return self._binop(other, lambda a, b: float(a) - float(b))

    def __mul__(self, other: Any) -> "MiniSeries":
        return self._binop(other, lambda a, b: float(a) * float(b))

    def __truediv__(self, other: Any) -> "MiniSeries":
        return self._binop(other, lambda a, b: float(a) / float(b))


class _MiniGroupByCol:
    def __init__(self, rows: List[Dict[str, Any]], group_cols: List[str], target_col: str) -> None:
        self._rows = rows
        self._group_cols = group_cols
        self._target_col = target_col

    def rank(self, ascending: bool = True, method: str = "first") -> MiniSeries:
        n = len(self._rows)
        ranks = [1] * n
        groups: Dict[Tuple[Any, ...], List[int]] = {}
        for i, r in enumerate(self._rows):
            gk = tuple(r.get(c) for c in self._group_cols)
            groups.setdefault(gk, []).append(i)
        for idxs in groups.values():
            sorted_idxs = sorted(
                idxs,
                key=lambda idx: float(self._rows[idx].get(self._target_col, 0.0) or 0.0),
                reverse=not ascending,
            )
            for rk, orig_i in enumerate(sorted_idxs, start=1):
                ranks[orig_i] = rk
        return MiniSeries(ranks)


class _MiniGroupBy:
    def __init__(self, rows: List[Dict[str, Any]], group_cols: Union[str, List[str]]) -> None:
        self._rows = rows
        self._group_cols = [group_cols] if isinstance(group_cols, str) else list(group_cols)

    def __getitem__(self, col: str) -> _MiniGroupByCol:
        return _MiniGroupByCol(self._rows, self._group_cols, col)


class _MiniAtIndexer:
    def __init__(self, df: "MiniDataFrame") -> None:
        self._df = df

    def __getitem__(self, key: Tuple[int, str]) -> Any:
        row_idx, col = key
        return self._df._rows[int(row_idx)].get(col)

    def __setitem__(self, key: Tuple[int, str], val: Any) -> None:
        row_idx, col = key
        self._df._rows[int(row_idx)][col] = val
        if col not in self._df._cols:
            self._df._cols.append(col)


class _MiniLocIndexer:
    def __init__(self, df: "MiniDataFrame") -> None:
        self._df = df

    def __getitem__(self, key: Any) -> Any:
        if isinstance(key, tuple) and len(key) == 2:
            r_key, c_key = key
            if isinstance(r_key, (int, np.integer)):
                return self._df._rows[int(r_key)].get(c_key)
            mask = r_key._data if isinstance(r_key, MiniSeries) else list(r_key)
            if all(isinstance(x, (bool, np.bool_)) for x in mask):
                return MiniSeries([r.get(c_key) for r, b in zip(self._df._rows, mask) if b])
            return MiniSeries([self._df._rows[int(i)].get(c_key) for i in mask])
        if isinstance(key, (int, np.integer)):
            return dict(self._df._rows[int(key)])
        mask = key._data if isinstance(key, MiniSeries) else list(key)
        if all(isinstance(x, (bool, np.bool_)) for x in mask):
            return MiniDataFrame([dict(r) for r, b in zip(self._df._rows, mask) if b], columns=list(self._df._cols))
        return MiniDataFrame([dict(self._df._rows[int(i)]) for i in mask], columns=list(self._df._cols))

    def __setitem__(self, key: Tuple[Any, str], val: Any) -> None:
        r_key, c_key = key
        if c_key not in self._df._cols:
            self._df._cols.append(c_key)
        if isinstance(r_key, (int, np.integer)):
            self._df._rows[int(r_key)][c_key] = val
            return
        mask = r_key._data if isinstance(r_key, MiniSeries) else list(r_key)
        if isinstance(val, (MiniSeries, np.ndarray, list)):
            vals = val._data if isinstance(val, MiniSeries) else list(val)
            if all(isinstance(x, (bool, np.bool_)) for x in mask):
                selected_idxs = [i for i, b in enumerate(mask) if b]
                if len(vals) == len(selected_idxs):
                    for idx, v in zip(selected_idxs, vals):
                        self._df._rows[idx][c_key] = v
                else:
                    for idx in selected_idxs:
                        self._df._rows[idx][c_key] = vals[idx]
            else:
                for idx, v in zip(mask, vals):
                    self._df._rows[int(idx)][c_key] = v
        else:
            if all(isinstance(x, (bool, np.bool_)) for x in mask):
                for i, b in enumerate(mask):
                    if b:
                        self._df._rows[i][c_key] = val
            else:
                for i in mask:
                    self._df._rows[int(i)][c_key] = val


class _MiniIlocIndexer:
    def __init__(self, df: "MiniDataFrame") -> None:
        self._df = df

    def __getitem__(self, key: Any) -> Any:
        if isinstance(key, (int, np.integer)):
            return dict(self._df._rows[int(key)])
        if isinstance(key, slice):
            return MiniDataFrame([dict(r) for r in self._df._rows[key]], columns=list(self._df._cols))
        idxs = key._data if isinstance(key, MiniSeries) else list(key)
        return MiniDataFrame([dict(self._df._rows[int(i)]) for i in idxs], columns=list(self._df._cols))


class _MiniIndex(list):
    def __getitem__(self, key: Any) -> Any:
        if isinstance(key, (MiniSeries, np.ndarray, list)):
            arr = key._data if isinstance(key, MiniSeries) else list(key)
            if all(isinstance(x, (bool, np.bool_)) for x in arr):
                return MiniSeries([i for i, b in zip(self, arr) if b])
            return MiniSeries([super(_MiniIndex, self).__getitem__(int(i)) for i in arr])
        return super().__getitem__(key)

    def tolist(self) -> List[int]:
        return list(self)


class MiniDataFrame:
    """Lightweight tabular container implementing the subset of pandas.DataFrame used in GSE."""

    def __init__(self, data: Optional[Iterable[Dict[str, Any]]] = None, columns: Optional[List[str]] = None) -> None:
        if isinstance(data, MiniDataFrame):
            self._rows: List[Dict[str, Any]] = [dict(r) for r in data._rows]
            self._cols: List[str] = list(columns if columns is not None else data._cols)
        elif data is None:
            self._rows = []
            self._cols = list(columns or [])
        else:
            self._rows = [dict(r) for r in data]
            if columns is not None:
                self._cols = list(columns)
            else:
                cols: List[str] = []
                for r in self._rows:
                    for k in r.keys():
                        if k not in cols:
                            cols.append(k)
                self._cols = cols

    @property
    def columns(self) -> List[str]:
        return list(self._cols)

    @property
    def index(self) -> _MiniIndex:
        return _MiniIndex(range(len(self._rows)))

    @property
    def at(self) -> _MiniAtIndexer:
        return _MiniAtIndexer(self)

    @property
    def loc(self) -> _MiniLocIndexer:
        return _MiniLocIndexer(self)

    @property
    def iloc(self) -> _MiniIlocIndexer:
        return _MiniIlocIndexer(self)

    def __len__(self) -> int:
        return len(self._rows)

    def copy(self) -> "MiniDataFrame":
        return MiniDataFrame([dict(r) for r in self._rows], columns=list(self._cols))

    def reset_index(self, drop: bool = False) -> "MiniDataFrame":
        return self.copy()

    def iterrows(self) -> Iterator[Tuple[int, Dict[str, Any]]]:
        for idx, r in enumerate(self._rows):
            yield idx, r

    def get(self, col: str, default: Any = None) -> Any:
        if col in self._cols:
            return self[col]
        return default

    def __getitem__(self, key: Any) -> Any:
        if isinstance(key, str):
            return MiniSeries([r.get(key) for r in self._rows])
        if isinstance(key, list) and all(isinstance(k, str) for k in key):
            return MiniDataFrame([{k: r.get(k) for k in key} for r in self._rows], columns=list(key))
        if isinstance(key, (MiniSeries, np.ndarray, list)):
            arr = key._data if isinstance(key, MiniSeries) else list(key)
            return MiniDataFrame([dict(r) for r, b in zip(self._rows, arr) if b], columns=list(self._cols))
        raise KeyError(key)

    def __setitem__(self, col: str, val: Any) -> None:
        if col not in self._cols:
            self._cols.append(col)
        if isinstance(val, MiniSeries):
            for r, v in zip(self._rows, val._data):
                r[col] = v
        elif isinstance(val, np.ndarray):
            for r, v in zip(self._rows, val.tolist()):
                r[col] = v
        elif isinstance(val, (list, tuple)) and len(val) == len(self._rows):
            for r, v in zip(self._rows, val):
                r[col] = v
        else:
            for r in self._rows:
                r[col] = val

    def groupby(self, cols: Union[str, List[str]]) -> _MiniGroupBy:
        return _MiniGroupBy(self._rows, cols)

    def sort_values(
        self,
        by: Union[str, List[str]],
        ascending: Union[bool, List[bool]] = True,
    ) -> "MiniDataFrame":
        cols = [by] if isinstance(by, str) else list(by)
        asc_list = [ascending] * len(cols) if isinstance(ascending, bool) else list(ascending)
        rows_copy = [dict(r) for r in self._rows]
        for col, asc in reversed(list(zip(cols, asc_list))):
            rows_copy.sort(key=lambda r: (r.get(col) is None, r.get(col, 0)), reverse=not asc)
        return MiniDataFrame(rows_copy, columns=list(self._cols))

    def drop(self, columns: Optional[List[str]] = None) -> "MiniDataFrame":
        drop_set = set(columns or [])
        new_cols = [c for c in self._cols if c not in drop_set]
        new_rows = [{k: v for k, v in r.items() if k not in drop_set} for r in self._rows]
        return MiniDataFrame(new_rows, columns=new_cols)

    def to_dict(self, orient: str = "records") -> List[Dict[str, Any]]:
        return [dict(r) for r in self._rows]

    def to_string(self, index: bool = True) -> str:
        if not self._rows:
            return "Empty DataFrame"
        lines = ["\t".join(self._cols)]
        for r in self._rows:
            lines.append("\t".join(str(r.get(c, "")) for c in self._cols))
        return "\n".join(lines)


class MiniPandasModule:
    """Drop-in fallback when `pandas` is not installed."""

    DataFrame = MiniDataFrame
    Series = MiniSeries
    isna = staticmethod(isna)
    notna = staticmethod(notna)

    @staticmethod
    def read_csv(filepath_or_buffer: Union[str, Path]) -> MiniDataFrame:
        p = Path(filepath_or_buffer)
        with p.open("r", encoding="utf-8", errors="replace", newline="") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            cols = list(reader.fieldnames or [])
        return MiniDataFrame(rows, columns=cols)


def get_pandas_or_shim() -> Any:
    try:
        import pandas as _pd
        return _pd
    except ImportError:
        return MiniPandasModule()
