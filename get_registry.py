import json

def get_registry():
    with open('packages/prediction-engine/src/metrics/core/metric-birth-certificate-registry.ts', 'r') as f:
        content = f.read()
    print("Found it!")

if __name__ == '__main__':
    get_registry()
