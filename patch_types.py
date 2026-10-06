def modify_index():
    with open('packages/prediction-engine/src/index.ts', 'r') as f:
        content = f.read()

    export_statement = 'export type { DefensivePassRushInput, DefensivePassRushResult } from "./signals/trench/defensive-pass-rush-win-rate.js";\n'

    if "DefensivePassRushInput" not in content:
        content = content.replace(
            'export { evaluateDefensivePassRush } from "./signals/trench/defensive-pass-rush-win-rate.js";\n',
            'export { evaluateDefensivePassRush } from "./signals/trench/defensive-pass-rush-win-rate.js";\n' + export_statement
        )
        with open('packages/prediction-engine/src/index.ts', 'w') as f:
            f.write(content)

modify_index()
