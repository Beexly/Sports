import ts from "typescript";
import type { SymbolKind } from "./types.js";

export interface ParsedSymbol {
  symbolName: string;
  kind: SymbolKind;
  startLine: number; // 1-indexed
  endLine: number; // 1-indexed
  exported: boolean;
}

export interface ParsedImport {
  /** The module specifier text as written, e.g. "./ledgers" or "@/lib/auth". */
  specifier: string;
}

/**
 * Real TypeScript-AST-based extraction (via the `typescript` compiler API —
 * the same parser `tsc` uses), not regex guessing. Returns top-level
 * declarations with their exact source line spans, and the module
 * specifiers of every static import.
 */
export function parseSource(fileName: string, sourceText: string): { symbols: ParsedSymbol[]; imports: ParsedImport[] } {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.ES2022,
    /* setParentNodes */ true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const symbols: ParsedSymbol[] = [];
  const imports: ParsedImport[] = [];

  function lineOf(pos: number): number {
    return sourceFile.getLineAndCharacterOfPosition(pos).line + 1;
  }

  function hasExportModifier(node: ts.Node): boolean {
    const mods = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    return !!mods?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  }

  for (const stmt of sourceFile.statements) {
    if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
      imports.push({ specifier: stmt.moduleSpecifier.text });
      continue;
    }

    const exported = hasExportModifier(stmt);

    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      symbols.push({
        symbolName: stmt.name.text,
        kind: "function",
        startLine: lineOf(stmt.getStart(sourceFile)),
        endLine: lineOf(stmt.getEnd()),
        exported,
      });
    } else if (ts.isClassDeclaration(stmt) && stmt.name) {
      symbols.push({
        symbolName: stmt.name.text,
        kind: "class",
        startLine: lineOf(stmt.getStart(sourceFile)),
        endLine: lineOf(stmt.getEnd()),
        exported,
      });
      for (const member of stmt.members) {
        if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
          symbols.push({
            symbolName: `${stmt.name.text}.${member.name.text}`,
            kind: "method",
            startLine: lineOf(member.getStart(sourceFile)),
            endLine: lineOf(member.getEnd()),
            exported,
          });
        }
      }
    } else if (ts.isInterfaceDeclaration(stmt)) {
      symbols.push({
        symbolName: stmt.name.text,
        kind: "interface",
        startLine: lineOf(stmt.getStart(sourceFile)),
        endLine: lineOf(stmt.getEnd()),
        exported,
      });
    } else if (ts.isTypeAliasDeclaration(stmt)) {
      symbols.push({
        symbolName: stmt.name.text,
        kind: "type",
        startLine: lineOf(stmt.getStart(sourceFile)),
        endLine: lineOf(stmt.getEnd()),
        exported,
      });
    } else if (ts.isEnumDeclaration(stmt)) {
      symbols.push({
        symbolName: stmt.name.text,
        kind: "enum",
        startLine: lineOf(stmt.getStart(sourceFile)),
        endLine: lineOf(stmt.getEnd()),
        exported,
      });
    } else if (ts.isVariableStatement(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          symbols.push({
            symbolName: decl.name.text,
            kind: "const",
            startLine: lineOf(stmt.getStart(sourceFile)),
            endLine: lineOf(stmt.getEnd()),
            exported,
          });
        }
      }
    }
  }

  return { symbols, imports };
}
