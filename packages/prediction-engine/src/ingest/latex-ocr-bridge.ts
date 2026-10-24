/**
 * LaTeX OCR & Mathematical Expression Parser Bridge
 *
 * Mathematical port and extension of `lukas-blecher/LaTeX-OCR` (pix2tex)
 * and `K-Dense-AI/scientific-agent-skills`.
 *
 * Parses raw or OCR-extracted LaTeX math expressions from scientific literature,
 * translates them into a symbolic Abstract Syntax Tree (AST), and classifies the
 * mathematical domain for direct ingestion into the GSE Omni-Cognitive Mind.
 */

export type MathExpressionDomain =
  | 'DIFFERENTIAL_EQUATION'
  | 'OPTIMIZATION_OBJECTIVE'
  | 'STATISTICAL_DISTRIBUTION'
  | 'PROBABILITY_BOUND'
  | 'CAUSAL_ESTIMAND'
  | 'GENERAL_ALGEBRAIC';

export interface MathASTNode {
  type: 'SYMBOL' | 'NUMBER' | 'OPERATOR' | 'FRACTION' | 'SUBSCRIPT' | 'SUPERSCRIPT' | 'SUMMATION' | 'INTEGRAL' | 'FUNCTION' | 'MATRIX';
  value: string;
  children?: MathASTNode[];
  meta?: Record<string, unknown>;
}

export interface ParsedMathExpression {
  rawLatex: string;
  cleanedLatex: string;
  domain: MathExpressionDomain;
  symbols: string[];
  complexityScore: number;
  ast: MathASTNode;
  executableInterpretation: string;
}

/**
 * Normalizes raw LaTeX strings by stripping redundant whitespaces and formatting wrappers.
 */
export function cleanLatexString(latex: string): string {
  return latex
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\\displaystyle\s*/g, '')
    .replace(/\\left/g, '')
    .replace(/\\right/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts unique symbols, greek letters, and variables from a LaTeX string.
 */
export function extractLatexSymbols(cleaned: string): string[] {
  const symbolRegex = /\\[a-zA-Z]+(?:_[a-zA-Z0-9]+)?|[a-zA-Z]_[a-zA-Z0-9]+|[a-zA-Z]/g;
  const matches = cleaned.match(symbolRegex) || [];
  const ignored = new Set([
    '\\frac', '\\sum', '\\prod', '\\int', '\\left', '\\right',
    '\\begin', '\\end', '\\pmatrix', '\\bmatrix', '\\text', '\\mathbf', '\\mathbb'
  ]);

  const unique = new Set<string>();
  for (const m of matches) {
    if (!ignored.has(m) && m.length > 0) {
      unique.add(m);
    }
  }
  return Array.from(unique);
}

/**
 * Classifies the mathematical domain of an extracted equation based on its operators and symbols.
 */
export function classifyMathDomain(latex: string): MathExpressionDomain {
  if (latex.includes('\\partial') || latex.includes('d X_t') || latex.includes('\\nabla') || latex.includes('dt')) {
    return 'DIFFERENTIAL_EQUATION';
  }
  if (latex.includes('\\arg\\min') || latex.includes('\\arg\\max') || latex.includes('\\min') || latex.includes('\\max') || latex.includes('\\mathcal{L}')) {
    return 'OPTIMIZATION_OBJECTIVE';
  }
  if (latex.includes('do(') || latex.includes('\\text{do}') || latex.includes('P(') && latex.includes('\\mid')) {
    return 'CAUSAL_ESTIMAND';
  }
  if (latex.includes('\\le') || latex.includes('\\ge') || latex.includes('\\Pr(') || latex.includes('\\sigma_{\\text{TW}}')) {
    return 'PROBABILITY_BOUND';
  }
  if (latex.includes('\\mathcal{N}(') || latex.includes('\\sim') || latex.includes('\\text{Poisson}') || latex.includes('\\text{Skellam}')) {
    return 'STATISTICAL_DISTRIBUTION';
  }
  return 'GENERAL_ALGEBRAIC';
}

/**
 * Parses a simple LaTeX expression into a symbolic AST.
 */
export function parseLatexToAst(latex: string): MathASTNode {
  const cleaned = cleanLatexString(latex);

  // Root node
  const root: MathASTNode = {
    type: 'FUNCTION',
    value: 'EXPRESSION_ROOT',
    children: [],
  };

  // Check for fraction
  const fracRegex = /\\frac\{([^{}]+)\}\{([^{}]+)\}/g;
  let match: RegExpExecArray | null;
  let remaining = cleaned;

  while ((match = fracRegex.exec(cleaned)) !== null) {
    const num = match[1] ?? '';
    const den = match[2] ?? '';
    root.children?.push({
      type: 'FRACTION',
      value: match[0],
      children: [
        { type: 'SYMBOL', value: num },
        { type: 'SYMBOL', value: den },
      ],
    });
    remaining = remaining.replace(match[0], `[FRAC]`);
  }

  // Check for summations
  const sumRegex = /\\sum_\{([^{}]+)\}\^\{([^{}]+)\}/g;
  while ((match = sumRegex.exec(cleaned)) !== null) {
    const lower = match[1] ?? '';
    const upper = match[2] ?? '';
    root.children?.push({
      type: 'SUMMATION',
      value: match[0],
      children: [
        { type: 'SYMBOL', value: `lower:${lower}` },
        { type: 'SYMBOL', value: `upper:${upper}` },
      ],
    });
    remaining = remaining.replace(match[0], `[SUM]`);
  }

  // Parse remaining symbols and tokens
  const tokens = remaining.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    if (token === '[FRAC]' || token === '[SUM]') continue;
    if (token.startsWith('\\')) {
      root.children?.push({ type: 'SYMBOL', value: token });
    } else if (/^[0-9]+(\.[0-9]+)?$/.test(token)) {
      root.children?.push({ type: 'NUMBER', value: token });
    } else if (['+', '-', '*', '=', '<', '>', '\\le', '\\ge'].includes(token)) {
      root.children?.push({ type: 'OPERATOR', value: token });
    } else {
      root.children?.push({ type: 'SYMBOL', value: token });
    }
  }

  return root;
}

/**
 * Evaluates mathematical complexity based on symbol depth, fraction nesting, and operators.
 */
export function calculateComplexityScore(latex: string, symbols: string[]): number {
  let score = symbols.length * 1.5;
  if (latex.includes('\\frac')) score += 3;
  if (latex.includes('\\sum') || latex.includes('\\int')) score += 4;
  if (latex.includes('\\partial') || latex.includes('\\nabla')) score += 5;
  if (latex.includes('\\begin{pmatrix}') || latex.includes('\\mathbf')) score += 4;
  return Number(score.toFixed(2));
}

/**
 * Bridges OCR LaTeX strings into the GSE mathematical corpus pipeline.
 */
export function bridgeLatexToMind(rawLatex: string): ParsedMathExpression {
  const cleaned = cleanLatexString(rawLatex);
  const domain = classifyMathDomain(cleaned);
  const symbols = extractLatexSymbols(cleaned);
  const ast = parseLatexToAst(cleaned);
  const complexityScore = calculateComplexityScore(cleaned, symbols);

  let executableInterpretation = `Symbolic expression in ${domain}`;
  if (domain === 'DIFFERENTIAL_EQUATION') {
    executableInterpretation = 'Continuous state-space transition equation (compatible with Runge-Kutta / SDE solver)';
  } else if (domain === 'OPTIMIZATION_OBJECTIVE') {
    executableInterpretation = 'Convex/regularized loss function (compatible with coordinate descent / L-BFGS)';
  } else if (domain === 'CAUSAL_ESTIMAND') {
    executableInterpretation = 'Interventional do-calculus identification query (compatible with do-calculus-id engine)';
  }

  return {
    rawLatex,
    cleanedLatex: cleaned,
    domain,
    symbols,
    complexityScore,
    ast,
    executableInterpretation,
  };
}
