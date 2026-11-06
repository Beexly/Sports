# Concrete snippets

```python
from crc import EdgeMap, crc_connection
import numpy as np

nodes = ["crm", "pay"]
maps = [EdgeMap("crm", "pay", "same", 0.0)]
feats = {"crm": np.array([1.,0.]), "pay": np.array([1.,0.])}
ref = {"crm": np.array([0.,1.]), "pay": np.array([0.,1.])}
r = crc_connection(nodes, maps, feats, reference=ref)
print(r.repair_class, r.relative)
```
