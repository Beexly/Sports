# OpenAPI examples for every mode

## entity_integrity
```json
{"mode":"entity_integrity","tables":{"crm":[{"entity_id":"alice","risk_tier":"1","kyc_status":"0"}],"risk_sot":[{"entity_id":"alice","risk_tier":"0","kyc_status":"1"}]},"sot_system":"risk_sot"}
```

## temporal_relative
```json
{"mode":"temporal_relative","windows":[{"label":"w0","nodes":["a","b"],"maps":[{"source":"a","target":"b","theta":0}],"feats":{"a":[0,1],"b":[0,1]},"reference":{"a":[0,1],"b":[0,1]}}]}
```

## ontology_hygiene
```json
{"mode":"ontology_hygiene","nodes":["e1","e2"],"same_as_edges":[["e1","e2"]],"features":{"e1":[1,0],"e2":[0,1]}}
```

## model_agreement
```json
{"mode":"model_agreement","model_outputs":{"m1":[0.1,0.9],"m2":[0.12,0.88],"m3":[0.9,0.1]}}
```
