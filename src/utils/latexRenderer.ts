import katex from 'katex';

/**
 * Safely renders a LaTeX formula into an HTML string with KaTeX.
 * If rendering fails, returns a stylish fallback indicator.
 */
export function renderLatexToHtml(formula: string, isDisplay = false): string {
  try {
    const cleanFormula = formula.trim();
    if (!cleanFormula) return '';

    const rendered = katex.renderToString(cleanFormula, {
      displayMode: isDisplay,
      throwOnError: false,
      errorColor: '#f87171',
    });
    return rendered;
  } catch (err) {
    console.warn('LaTeX rendering error:', err);
    return `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-950/80 border border-red-800 text-red-300 font-mono text-[10px]" title="LaTeX Syntax Error: ${escapeHtml(formula)}">
      <span class="font-bold">Σ LaTeX</span>
      <span class="opacity-75">${escapeHtml(formula)}</span>
    </span>`;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parses a line containing $...$ LaTeX notations, bold **...**, and colored squares
 */
export interface RichSegment {
  type: 'text' | 'bold' | 'square' | 'latex';
  text?: string;
  latex?: string;
  squareColor?: string;
}

export function parseRichLine(line: string): RichSegment[] {
  if (!line) return [];

  const pattern = /(\$\$.*?\$\$|\$.*?\$|\*\*.*?\*\*|🟨|🟦|🟩|🟡|🔵|🟢|\[■:(?:yellow|blue|green|gold|cyan)\])/g;
  const parts = line.split(pattern);
  const segments: RichSegment[] = [];

  parts.forEach(part => {
    if (!part) return;

    if ((part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) ||
        (part.startsWith('$') && part.endsWith('$') && part.length >= 2)) {
      const isDouble = part.startsWith('$$');
      const formula = isDouble ? part.slice(2, -2) : part.slice(1, -1);
      segments.push({
        type: 'latex',
        latex: formula,
      });
    } else if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      segments.push({
        type: 'bold',
        text: part.slice(2, -2),
      });
    } else if (part === '🟨' || part === '🟡' || part === '[■:yellow]' || part === '[■:gold]') {
      segments.push({
        type: 'square',
        squareColor: '#fbbf24',
      });
    } else if (part === '🟦' || part === '🔵' || part === '[■:blue]' || part === '[■:cyan]') {
      segments.push({
        type: 'square',
        squareColor: '#38bdf8',
      });
    } else if (part === '🟩' || part === '🟢' || part === '[■:green]') {
      segments.push({
        type: 'square',
        squareColor: '#22c55e',
      });
    } else {
      segments.push({
        type: 'text',
        text: part,
      });
    }
  });

  return segments;
}

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', 'n': 'ⁿ', 'i': 'ⁱ', 'j': 'ʲ', 'k': 'ᵏ', 'm': 'ᵐ',
  'p': 'ᵖ', 'r': 'ʳ', 's': 'ˢ', 't': 'ᵗ', 'x': 'ˣ', 'y': 'ʸ', 'z': 'ᶻ', 'a': 'ᵃ', 'b': 'ᵇ', 'c': 'ᶜ',
  'd': 'ᵈ', 'e': 'ᵉ', 'f': 'ᶠ', 'g': 'ᵍ', 'h': 'ʰ', 'T': 'ᵀ', 'A': 'ᴬ', 'B': 'ᴮ', 'C': 'ᶜ', 'D': 'ᴰ',
  'E': 'ᴱ', 'H': 'ᴴ', 'I': 'ᴵ', 'J': 'ᴶ', 'K': 'ᴷ', 'L': 'ᴸ', 'M': 'ᴹ', 'N': 'ᴺ', 'P': 'ᴾ', 'R': 'ᴿ',
  'U': 'ᵁ', 'V': 'ⱽ', 'W': 'ᵂ', '*': '*', '×': 'ˣ', ' ': ' ', ',': ',', '/': '/'
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', 'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
  'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
  'v': 'ᵥ', 'x': 'ₓ', ' ': ' ', ',': ',', '*': '⁎'
};

function toSuperscript(str: string): string {
  return str.split('').map(c => SUPERSCRIPT_MAP[c] || c).join('');
}

function toSubscript(str: string): string {
  return str.split('').map(c => SUBSCRIPT_MAP[c] || c).join('');
}

function replaceBalanced(str: string, prefix: string, replacer: (inner: string) => string): string {
  let idx = 0;
  while ((idx = str.indexOf(prefix, idx)) !== -1) {
    const openBrace = idx + prefix.length;
    if (str[openBrace] !== '{') {
      idx += prefix.length;
      continue;
    }
    let depth = 1;
    let i = openBrace + 1;
    while (i < str.length && depth > 0) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') depth--;
      i++;
    }
    if (depth === 0) {
      const inner = str.slice(openBrace + 1, i - 1);
      const replaced = replacer(inner);
      str = str.slice(0, idx) + replaced + str.slice(i);
      idx += replaced.length;
    } else {
      idx += prefix.length;
    }
  }
  return str;
}

function replaceBalancedTwoArgs(
  str: string,
  prefix: string,
  replacer: (arg1: string, arg2: string) => string
): string {
  let idx = 0;
  while ((idx = str.indexOf(prefix, idx)) !== -1) {
    const open1 = idx + prefix.length;
    if (str[open1] !== '{') {
      idx += prefix.length;
      continue;
    }
    let depth = 1;
    let i = open1 + 1;
    while (i < str.length && depth > 0) {
      if (str[i] === '{') depth++;
      else if (str[i] === '}') depth--;
      i++;
    }
    if (depth !== 0) {
      idx += prefix.length;
      continue;
    }
    const arg1 = str.slice(open1 + 1, i - 1);

    while (i < str.length && (str[i] === ' ' || str[i] === '\t')) i++;
    if (i >= str.length || str[i] !== '{') {
      idx += prefix.length;
      continue;
    }
    const open2 = i;
    depth = 1;
    let j = open2 + 1;
    while (j < str.length && depth > 0) {
      if (str[j] === '{') depth++;
      else if (str[j] === '}') depth--;
      j++;
    }
    if (depth !== 0) {
      idx += prefix.length;
      continue;
    }
    const arg2 = str.slice(open2 + 1, j - 1);

    const replaced = replacer(arg1, arg2);
    str = str.slice(0, idx) + replaced + str.slice(j);
    idx += replaced.length;
  }
  return str;
}

/**
 * Converts standard LaTeX math expressions to clean, readable Unicode representations
 * for SVG export and Canvas graphics rendering.
 */
export function latexToCanvasGlyphs(latex: string): string {
  if (!latex) return '';
  let s = latex.trim();

  // Matrices & Environments
  s = s.replace(/\\begin\{pmatrix\}([\s\S]*?)\\end\{pmatrix\}/g, (_, body: string) => {
    const rows = body.split('\\\\').map(r => r.replace(/&/g, '  ').trim()).filter(Boolean);
    return `( ${rows.join(' | ')} )`;
  });
  s = s.replace(/\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}/g, (_, body: string) => {
    const rows = body.split('\\\\').map(r => r.replace(/&/g, '  ').trim()).filter(Boolean);
    return `[ ${rows.join(' | ')} ]`;
  });
  s = s.replace(/\\begin\{vmatrix\}([\s\S]*?)\\end\{vmatrix\}/g, (_, body: string) => {
    const rows = body.split('\\\\').map(r => r.replace(/&/g, '  ').trim()).filter(Boolean);
    return `| ${rows.join(' | ')} |`;
  });
  s = s.replace(/\\begin\{matrix\}([\s\S]*?)\\end\{matrix\}/g, (_, body: string) => {
    const rows = body.split('\\\\').map(r => r.replace(/&/g, '  ').trim()).filter(Boolean);
    return `[ ${rows.join(' | ')} ]`;
  });

  // Brackets and Delimiters
  s = s.replace(/\\left\\\{/g, '{').replace(/\\right\\\}/g, '}');
  s = s.replace(/\\left\{/g, '{').replace(/\\right\}/g, '}');
  s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  s = s.replace(/\\left\|/g, '|').replace(/\\right\|/g, '|');
  s = s.replace(/\\left\./g, '').replace(/\\right\./g, '');
  s = s.replace(/\\\{/g, '{').replace(/\\\}/g, '}');
  s = s.replace(/\\langle/g, '⟨').replace(/\\rangle/g, '⟩');
  s = s.replace(/\\lVert/g, '‖').replace(/\\rVert/g, '‖');
  s = s.replace(/\\\|/g, '‖');
  s = s.replace(/\\lvert/g, '|').replace(/\\rvert/g, '|');
  s = s.replace(/\\mid(?![a-zA-Z])/g, '|');
  s = s.replace(/\\vert(?![a-zA-Z])/g, '|');
  s = s.replace(/\\parallel(?![a-zA-Z])/g, '∥');

  // Number spaces & Blackboard Bold
  s = s.replace(/\\mathbb\{R\}/g, 'ℝ');
  s = s.replace(/\\mathbb\{C\}/g, 'ℂ');
  s = s.replace(/\\mathbb\{Z\}/g, 'ℤ');
  s = s.replace(/\\mathbb\{N\}/g, 'ℕ');
  s = s.replace(/\\mathbb\{Q\}/g, 'ℚ');
  s = s.replace(/\\mathbb\{F\}/g, '𝔽');
  s = s.replace(/\\mathbb\{K\}/g, '𝕂');
  s = s.replace(/\\mathbb\{P\}/g, 'ℙ');
  s = s.replace(/\\mathbb\{H\}/g, 'ℍ');
  s = s.replace(/\\mathbb\{E\}/g, '𝔼');

  // Mathcal calligraphic
  s = s.replace(/\\mathcal\{P\}/g, '𝒫');
  s = s.replace(/\\mathcal\{V\}/g, '𝒱');
  s = s.replace(/\\mathcal\{B\}/g, 'ℬ');
  s = s.replace(/\\mathcal\{L\}/g, 'ℒ');
  s = s.replace(/\\mathcal\{S\}/g, '𝒮');
  s = s.replace(/\\mathcal\{M\}/g, 'ℳ');
  s = s.replace(/\\mathcal\{([A-Z])\}/g, '$1');

  // Text formatting
  s = replaceBalanced(s, '\\text', inner => inner);
  s = replaceBalanced(s, '\\mathbf', inner => inner);
  s = replaceBalanced(s, '\\boldsymbol', inner => inner);
  s = replaceBalanced(s, '\\bm', inner => inner);
  s = replaceBalanced(s, '\\mathrm', inner => inner);
  s = replaceBalanced(s, '\\mathit', inner => inner);
  s = replaceBalanced(s, '\\mathsf', inner => inner);
  s = replaceBalanced(s, '\\operatorname', inner => inner);
  s = replaceBalanced(s, '\\vec', inner => `→${inner}`);
  s = replaceBalanced(s, '\\bar', inner => `${inner}̄`);
  s = replaceBalanced(s, '\\hat', inner => `${inner}̂`);
  s = replaceBalanced(s, '\\tilde', inner => `${inner}̃`);

  // Fractions
  s = replaceBalancedTwoArgs(s, '\\frac', (a, b) => `(${latexToCanvasGlyphs(a)} / ${latexToCanvasGlyphs(b)})`);

  // Roots
  s = replaceBalanced(s, '\\sqrt', inner => `√(${latexToCanvasGlyphs(inner)})`);

  // Dots
  s = s.replace(/\\(?:ldots|cdots|dots)(?![a-zA-Z])/g, '…');
  s = s.replace(/\\vdots(?![a-zA-Z])/g, '⋮');
  s = s.replace(/\\ddots(?![a-zA-Z])/g, '⋱');

  // Spaces and formatting
  s = s.replace(/\\[,;:!]/g, ' ');
  s = s.replace(/\\quad(?![a-zA-Z])/g, '  ').replace(/\\qquad(?![a-zA-Z])/g, '    ');

  // Roots & Integrals & Sums
  s = s.replace(/\\sum(?![a-zA-Z])/g, '∑');
  s = s.replace(/\\prod(?![a-zA-Z])/g, '∏');
  s = s.replace(/\\int(?![a-zA-Z])/g, '∫');
  s = s.replace(/\\oint(?![a-zA-Z])/g, '∮');

  // Operators & Functions
  s = s.replace(/\\det(?![a-zA-Z])/g, 'det');
  s = s.replace(/\\dim(?![a-zA-Z])/g, 'dim');
  s = s.replace(/\\ker(?![a-zA-Z])/g, 'ker');
  s = s.replace(/\\im(?![a-zA-Z])/g, 'im');
  s = s.replace(/\\rank(?![a-zA-Z])/g, 'rank');
  s = s.replace(/\\tr(?![a-zA-Z])/g, 'tr');
  s = s.replace(/\\span(?![a-zA-Z])/g, 'span');
  s = s.replace(/\\deg(?![a-zA-Z])/g, 'deg');
  s = s.replace(/\\exp(?![a-zA-Z])/g, 'exp');
  s = s.replace(/\\ln(?![a-zA-Z])/g, 'ln');
  s = s.replace(/\\log(?![a-zA-Z])/g, 'log');
  s = s.replace(/\\sin(?![a-zA-Z])/g, 'sin');
  s = s.replace(/\\cos(?![a-zA-Z])/g, 'cos');
  s = s.replace(/\\tan(?![a-zA-Z])/g, 'tan');
  s = s.replace(/\\max(?![a-zA-Z])/g, 'max');
  s = s.replace(/\\min(?![a-zA-Z])/g, 'min');
  s = s.replace(/\\sup(?![a-zA-Z])/g, 'sup');
  s = s.replace(/\\inf(?![a-zA-Z])/g, 'inf');
  s = s.replace(/\\adj(?![a-zA-Z])/g, 'adj');
  s = s.replace(/\\diag(?![a-zA-Z])/g, 'diag');
  s = s.replace(/\\null(?![a-zA-Z])/g, 'null');

  // Greek letters
  s = s.replace(/\\alpha(?![a-zA-Z])/g, 'α');
  s = s.replace(/\\beta(?![a-zA-Z])/g, 'β');
  s = s.replace(/\\gamma(?![a-zA-Z])/g, 'γ');
  s = s.replace(/\\delta(?![a-zA-Z])/g, 'δ');
  s = s.replace(/\\epsilon(?![a-zA-Z])/g, 'ε');
  s = s.replace(/\\varepsilon(?![a-zA-Z])/g, 'ε');
  s = s.replace(/\\zeta(?![a-zA-Z])/g, 'ζ');
  s = s.replace(/\\eta(?![a-zA-Z])/g, 'η');
  s = s.replace(/\\theta(?![a-zA-Z])/g, 'θ');
  s = s.replace(/\\vartheta(?![a-zA-Z])/g, 'ϑ');
  s = s.replace(/\\iota(?![a-zA-Z])/g, 'ι');
  s = s.replace(/\\kappa(?![a-zA-Z])/g, 'κ');
  s = s.replace(/\\lambda(?![a-zA-Z])/g, 'λ');
  s = s.replace(/\\mu(?![a-zA-Z])/g, 'μ');
  s = s.replace(/\\nu(?![a-zA-Z])/g, 'ν');
  s = s.replace(/\\xi(?![a-zA-Z])/g, 'ξ');
  s = s.replace(/\\pi(?![a-zA-Z])/g, 'π');
  s = s.replace(/\\varpi(?![a-zA-Z])/g, 'ϖ');
  s = s.replace(/\\rho(?![a-zA-Z])/g, 'ρ');
  s = s.replace(/\\varrho(?![a-zA-Z])/g, 'ϱ');
  s = s.replace(/\\sigma(?![a-zA-Z])/g, 'σ');
  s = s.replace(/\\varsigma(?![a-zA-Z])/g, 'ς');
  s = s.replace(/\\tau(?![a-zA-Z])/g, 'τ');
  s = s.replace(/\\upsilon(?![a-zA-Z])/g, 'υ');
  s = s.replace(/\\phi(?![a-zA-Z])/g, 'φ');
  s = s.replace(/\\varphi(?![a-zA-Z])/g, 'ϕ');
  s = s.replace(/\\chi(?![a-zA-Z])/g, 'χ');
  s = s.replace(/\\psi(?![a-zA-Z])/g, 'ψ');
  s = s.replace(/\\omega(?![a-zA-Z])/g, 'ω');

  // Uppercase Greek
  s = s.replace(/\\Gamma(?![a-zA-Z])/g, 'Γ');
  s = s.replace(/\\Delta(?![a-zA-Z])/g, 'Δ');
  s = s.replace(/\\Theta(?![a-zA-Z])/g, 'Θ');
  s = s.replace(/\\Lambda(?![a-zA-Z])/g, 'Λ');
  s = s.replace(/\\Xi(?![a-zA-Z])/g, 'Ξ');
  s = s.replace(/\\Pi(?![a-zA-Z])/g, 'Π');
  s = s.replace(/\\Sigma(?![a-zA-Z])/g, 'Σ');
  s = s.replace(/\\Upsilon(?![a-zA-Z])/g, 'Υ');
  s = s.replace(/\\Phi(?![a-zA-Z])/g, 'Φ');
  s = s.replace(/\\Psi(?![a-zA-Z])/g, 'Ψ');
  s = s.replace(/\\Omega(?![a-zA-Z])/g, 'Ω');

  // Symbols & Relations
  s = s.replace(/\\top(?![a-zA-Z])/g, '⊤');
  s = s.replace(/\\bot(?![a-zA-Z])/g, '⊥');
  s = s.replace(/\\perp(?![a-zA-Z])/g, '⊥');
  s = s.replace(/\\otimes(?![a-zA-Z])/g, '⊗');
  s = s.replace(/\\oplus(?![a-zA-Z])/g, '⊕');
  s = s.replace(/\\infty(?![a-zA-Z])/g, '∞');
  s = s.replace(/\\times(?![a-zA-Z])/g, '×');
  s = s.replace(/\\cdot(?![a-zA-Z])/g, '·');
  s = s.replace(/\\circ(?![a-zA-Z])/g, '∘');
  s = s.replace(/\\bullet(?![a-zA-Z])/g, '•');
  s = s.replace(/\\star(?![a-zA-Z])/g, '⋆');
  s = s.replace(/\\pm(?![a-zA-Z])/g, '±');
  s = s.replace(/\\mp(?![a-zA-Z])/g, '∓');
  s = s.replace(/\\neq(?![a-zA-Z])/g, '≠');
  s = s.replace(/\\ne(?![a-zA-Z])/g, '≠');
  s = s.replace(/\\leq(?![a-zA-Z])/g, '≤');
  s = s.replace(/\\le(?![a-zA-Z])/g, '≤');
  s = s.replace(/\\geq(?![a-zA-Z])/g, '≥');
  s = s.replace(/\\ge(?![a-zA-Z])/g, '≥');
  s = s.replace(/\\approx(?![a-zA-Z])/g, '≈');
  s = s.replace(/\\equiv(?![a-zA-Z])/g, '≡');
  s = s.replace(/\\sim(?![a-zA-Z])/g, '∼');
  s = s.replace(/\\cong(?![a-zA-Z])/g, '≅');
  s = s.replace(/\\notin(?![a-zA-Z])/g, '∉');
  s = s.replace(/\\in(?![a-zA-Z])/g, '∈');
  s = s.replace(/\\ni(?![a-zA-Z])/g, '∋');
  s = s.replace(/\\subset(?![a-zA-Z])/g, '⊂');
  s = s.replace(/\\subseteq(?![a-zA-Z])/g, '⊆');
  s = s.replace(/\\supset(?![a-zA-Z])/g, '⊃');
  s = s.replace(/\\supseteq(?![a-zA-Z])/g, '⊇');
  s = s.replace(/\\cap(?![a-zA-Z])/g, '∩');
  s = s.replace(/\\cup(?![a-zA-Z])/g, '∪');
  s = s.replace(/\\setminus(?![a-zA-Z])/g, '∖');
  s = s.replace(/\\forall(?![a-zA-Z])/g, '∀');
  s = s.replace(/\\exists(?![a-zA-Z])/g, '∃');
  s = s.replace(/\\nexists(?![a-zA-Z])/g, '∄');
  s = s.replace(/\\iff(?![a-zA-Z])/g, '⇔');
  s = s.replace(/\\implies(?![a-zA-Z])/g, '⇒');
  s = s.replace(/\\Rightarrow(?![a-zA-Z])/g, '⇒');
  s = s.replace(/\\Leftarrow(?![a-zA-Z])/g, '⇐');
  s = s.replace(/\\Leftrightarrow(?![a-zA-Z])/g, '⇔');
  s = s.replace(/\\longleftrightarrow(?![a-zA-Z])/g, '⟷');
  s = s.replace(/\\longrightarrow(?![a-zA-Z])/g, '⟶');
  s = s.replace(/\\rightarrow(?![a-zA-Z])/g, '→');
  s = s.replace(/\\leftarrow(?![a-zA-Z])/g, '←');
  s = s.replace(/\\to(?![a-zA-Z])/g, '→');
  s = s.replace(/\\uparrow(?![a-zA-Z])/g, '↑');
  s = s.replace(/\\downarrow(?![a-zA-Z])/g, '↓');
  s = s.replace(/\\partial(?![a-zA-Z])/g, '∂');
  s = s.replace(/\\nabla(?![a-zA-Z])/g, '∇');
  s = s.replace(/\\emptyset(?![a-zA-Z])/g, '∅');
  s = s.replace(/\\prime(?![a-zA-Z])/g, '′');

  // Superscripts with balanced braces or single char
  s = replaceBalanced(s, '^', inner => toSuperscript(inner));
  s = s.replace(/\^([0-9a-zA-Z+*=\-()])/g, (_, exp) => toSuperscript(exp));

  // Subscripts with balanced braces or single char
  s = replaceBalanced(s, '_', inner => toSubscript(inner));
  s = s.replace(/_([0-9a-zA-Z+=\-()])/g, (_, sub) => toSubscript(sub));

  // Clean remaining stray backslashes for standard symbols
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');

  return s;
}

export const latexToCanvasText = latexToCanvasGlyphs;
