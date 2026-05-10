'use strict';

// Phase 5: mock implementation. Returns the exact contract a real provider
// (OpenAI / Claude) must conform to. Swap this file's implementation later;
// the export shape stays the same.
//
// Contract:
//   analyze({ code, expectedIssues }) -> {
//     errors:          string[],
//     vulnerabilities: { type, line, severity }[],
//     suggestions:     string[],
//     score:           number  // 0..100
//   }

const SEVERITY_PENALTY = { high: 25, medium: 10, low: 5 };

const PATTERNS = [
  {
    type: 'SQL_INJECTION',
    severity: 'high',
    test: /(?:SELECT|INSERT|UPDATE|DELETE|WHERE|FROM|LIKE)[^;\n]*['"][^'"]*['"]\s*\+|\+\s*['"][^'"]*['"][^;\n]*(?:WHERE|FROM|LIKE)/i,
    suggestion: 'Use parameterized queries (`$1`, `?`) instead of string concatenation.',
  },
  {
    type: 'XSS',
    severity: 'high',
    test: /res\.send\([^)]*<[^>]*>[^)]*\+|res\.send\([^)]*\+[^)]*req\./,
    suggestion: 'Escape user input before rendering, or send JSON instead of raw HTML.',
  },
  {
    type: 'PLAINTEXT_PASSWORD',
    severity: 'high',
    test: /password_hash[^,)\n]*,\s*password\b|VALUES\s*\([^)]*,\s*password\s*\)/i,
    suggestion: 'Hash passwords with bcrypt (12+ rounds) before storing.',
  },
  {
    type: 'PATH_TRAVERSAL',
    severity: 'high',
    test: /sendFile\([^)]*req\.(query|params|body)|readFile(?:Sync)?\([^)]*req\.(query|params|body)/,
    suggestion: 'Validate and normalise the path; reject inputs containing `..` segments.',
  },
  {
    type: 'BROKEN_AUTH',
    severity: 'high',
    test: /jwt\.decode\s*\(/,
    suggestion: 'Use `jwt.verify(token, secret)` — `jwt.decode` does not check the signature.',
  },
  {
    type: 'OFF_BY_ONE',
    severity: 'medium',
    test: /for\s*\([^)]*;\s*\w+\s*<\s*\w+\.length\s*-\s*1\s*;/,
    suggestion: 'Loop bound looks off-by-one; use `i < arr.length` to include the last element.',
  },
  {
    type: 'NULL_DEREFERENCE',
    severity: 'medium',
    test: /\bfunction\b[^{]*\{[^}]*\b\w+\.\w+\.\w+/,
    suggestion: 'Guard against null/undefined intermediate properties (use `?.` or an explicit check).',
  },
];

function findLine(code, pattern) {
  const lines = code.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) return i + 1;
  }
  return null;
}

function detect(code) {
  const vulnerabilities = [];
  const suggestions = [];
  for (const p of PATTERNS) {
    if (p.test.test(code)) {
      vulnerabilities.push({ type: p.type, line: findLine(code, p.test), severity: p.severity });
      suggestions.push(p.suggestion);
    }
  }
  return { vulnerabilities, suggestions };
}

function checkErrors(code) {
  const errors = [];
  // Trivially mismatched quotes / braces — the most common syntactic mistakes
  // a beginner makes; this is a heuristic, not a parser.
  const singleQuotes = (code.match(/'/g) || []).length;
  const doubleQuotes = (code.match(/"/g) || []).length;
  if (singleQuotes % 2 !== 0) errors.push('Unmatched single quote in code.');
  if (doubleQuotes % 2 !== 0) errors.push('Unmatched double quote in code.');
  const opens = (code.match(/\{/g) || []).length;
  const closes = (code.match(/\}/g) || []).length;
  if (opens !== closes) errors.push('Unbalanced curly braces.');
  return errors;
}

function scoreFor({ errors, vulnerabilities }) {
  const vulnPenalty = vulnerabilities.reduce(
    (sum, v) => sum + (SEVERITY_PENALTY[v.severity] ?? 5),
    0
  );
  const score = 100 - vulnPenalty - errors.length * 10;
  return Math.max(0, Math.min(100, score));
}

function analyze({ code = '', expectedIssues = [] } = {}) {
  const errors = checkErrors(code);
  const { vulnerabilities, suggestions } = detect(code);

  // If the challenge expected an issue and we didn't catch it via patterns,
  // we don't fabricate one. The expected list is a hint for graders, not a
  // forced finding — a clean rewrite should score full marks.
  void expectedIssues;

  return {
    errors,
    vulnerabilities,
    suggestions,
    score: scoreFor({ errors, vulnerabilities }),
  };
}

module.exports = { analyze };
