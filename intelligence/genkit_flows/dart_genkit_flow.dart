// Genkit Dart 1.0 (`genkit: ^1.0.0`) implementation for GSE NFL Situational Flows,
// Schemantic (`@Schema()`) typed data models, Resumable `.interrupt(...)` tools,
// Experimental Multi-Turn Agents (`package:genkit/experimental.dart`), A2UI (`A2uiPlugin()`),
// and `GenkitRouter` HTTP serving.
//
// Run with trace capture:
//   genkit start --non-interactive -- dart run intelligence/genkit_flows/dart_genkit_flow.dart
//   genkit flow:run nflSituationalSynthesisDartFlow '{"gameId":"2024_10_CIN_BAL","homeTeam":"BAL","awayTeam":"CIN","windMph":8.5}' -- dart run intelligence/genkit_flows/dart_genkit_flow.dart

import 'dart:async';
import 'package:genkit/genkit.dart';
import 'package:genkit/experimental.dart';
import 'package:genkit/io.dart';
import 'package:genkit_a2ui/genkit_a2ui.dart';
import 'package:genkit_google_genai/genkit_google_genai.dart';
import 'package:genkit_middleware/genkit_middleware.dart';
import 'package:schemantic/schemantic.dart';

part 'dart_genkit_flow.g.dart';

@Schema()
abstract class $SituationalInput {
  String get gameId;
  String get homeTeam;
  String get awayTeam;
  double get windMph;
}

@Schema()
abstract class $SituationalOutput {
  String get gameId;
  double get situationalDeltaLogOdds;
  int get activeFamiliesConsumed;
  bool get adversaryChallengePassed;
  String get publishDecision;
}

final ai = Genkit(
  plugins: [
    googleAI(),
    A2uiPlugin(),
  ],
);

final gateInterruptTool = ai.defineTool<$SituationalInput, String>(
  name: 'verifyConjunctionGateApproval',
  description: 'Checks the 5-stage conjunction gate and returns .interrupt(...) if human sign-off is needed.',
  inputSchema: SituationalInput.$schema,
  outputSchema: SchemanticType.string(),
  fn: (input, ctx) async {
    if (input.windMph > 25.0) {
      return ctx.interrupt({
        'gameId': input.gameId,
        'reason': 'Extreme weather threshold requires manual beat-desk verification',
      });
    }
    return 'PASS';
  },
);

final nflSituationalSynthesisDartFlow = ai.defineFlow<$SituationalInput, $SituationalOutput>(
  name: 'nflSituationalSynthesisDartFlow',
  inputSchema: SituationalInput.$schema,
  outputSchema: SituationalOutput.$schema,
  fn: (input, ctx) async {
    final result = await ai.generate(
      model: googleAI.gemini('gemini-flash-latest'),
      prompt: 'Evaluate situational football matchup for ${input.awayTeam} at ${input.homeTeam} (${input.gameId})',
      outputSchema: SituationalOutput.$schema,
      tools: [gateInterruptTool],
      use: [
        retry(
          initialDelay: const Duration(milliseconds: 250),
          maxDelay: const Duration(seconds: 2),
        ),
        a2ui(),
      ],
    );
    return result.output!;
  },
);

final gseMatchupAgent = ai.defineAgent(
  name: 'gseMatchupAnalystDartAgent',
  description: 'Multi-turn NFL matchup analyst streaming A2UI surfaces to Flutter genui clients.',
  model: googleAI.gemini('gemini-flash-latest'),
  sessionStore: InMemorySessionStore(),
  tools: [gateInterruptTool],
  use: [
    a2ui(),
    agents([]),
  ],
);

Future<void> main() async {
  // Explicitly evaluate top-level final declarations so Genkit registers them before flow:run.
  final registeredFlows = [nflSituationalSynthesisDartFlow];
  final registeredAgents = [gseMatchupAgent];

  final router = GenkitRouter()
    ..addFlow(registeredFlows.first)
    ..addAgent(registeredAgents.first);

  await router.serve(
    port: 8081,
    corsOptions: const CorsOptions(allowOrigins: ['*']),
  );
}
