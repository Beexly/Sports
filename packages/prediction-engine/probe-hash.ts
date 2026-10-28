import { EPA_DROPOFF_SHA256 } from "./src/coach-sim/sinkhorn-targets.js";
import { EPA_DROPOFF_SHA256 as PY_SHA } from "./src/gse-pre-seal/injury-operator.js";
console.log("coach-sim/sinkhorn-targets EPA_DROPOFF_SHA256:", EPA_DROPOFF_SHA256);
console.log("gse-pre-seal/injury-operator EPA_DROPOFF_SHA256:", PY_SHA);
console.log("match:", EPA_DROPOFF_SHA256 === PY_SHA);
