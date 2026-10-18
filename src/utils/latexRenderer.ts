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
  'U': 'ᵁ', 'V': 'ⱽ', 'W': 'ᵂ', '*': '*'
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', 'a': 'ₐ', 'e': 'ₑ', 'h': 'ₕ', 'i': 'ᵢ', 'j': 'ⱼ',
  'k': 'ₖ', 'l': 'ₗ', 'm': 'ₘ', 'n': 'ₙ', 'o': 'ₒ', 'p': 'ₚ', 'r': 'ᵣ', 's': 'ₛ', 't': 'ₜ', 'u': 'ᵤ',
  'v': 'ᵥ', 'x': 'ₓ'
};

function toSuperscript(str: string): string {
  return str.split('').map(c => SUPERSCRIPT_MAP[c] || c).join('');
}

function toSubscript(str: string): string {
  return str.split('').map(c => SUBSCRIPT_MAP[c] || c).join('');
}

// Convert standard LaTeX notations to readable canvas unicode text representations
export function latexToCanvasGlyphs(latex: string): string {
  let s = latex.trim();

  // Matrices & Environments first
  s = s.replace(/\\begin\{(?:pmatrix|matrix|bmatrix)\}([\s\S]*?)\\end\{(?:pmatrix|matrix|bmatrix)\}/g, (_, body) => {
    const rows = body.split('\\\\').map((r: string) => r.replace(/&/g, ' ').trim()).filter(Boolean);
    return `[ ${rows.join(' | ')} ]`;
  });

  // Number spaces
  s = s.replace(/\\mathbb\{R\}/g, 'ℝ');
  s = s.replace(/\\mathbb\{C\}/g, 'ℂ');
  s = s.replace(/\\mathbb\{Z\}/g, 'ℤ');
  s = s.replace(/\\mathbb\{N\}/g, 'ℕ');
  s = s.replace(/\\mathbb\{Q\}/g, 'ℚ');
  s = s.replace(/\\mathbb\{F\}/g, '𝔽');
  
  // Specific symbols (with boundaries / non-word lookahead to avoid partial matches)
  s = s.replace(/\\top(?![a-zA-Z])/g, '⊤');
  s = s.replace(/\\bot(?![a-zA-Z])/g, '⊥');
  s = s.replace(/\\perp(?![a-zA-Z])/g, '⊥');
  s = s.replace(/\\otimes(?![a-zA-Z])/g, '⊗');
  s = s.replace(/\\oplus(?![a-zA-Z])/g, '⊕');
  s = s.replace(/\\infty(?![a-zA-Z])/g, '∞');
  s = s.replace(/\\times(?![a-zA-Z])/g, '×');
  s = s.replace(/\\cdot(?![a-zA-Z])/g, '·');
  s = s.replace(/\\pm(?![a-zA-Z])/g, '±');
  s = s.replace(/\\mp(?![a-zA-Z])/g, '∓');
  s = s.replace(/\\neq(?![a-zA-Z])/g, '≠');
  s = s.replace(/\\leq(?![a-zA-Z])/g, '≤');
  s = s.replace(/\\geq(?![a-zA-Z])/g, '≥');
  s = s.replace(/\\approx(?![a-zA-Z])/g, '≈');
  s = s.replace(/\\notin(?![a-zA-Z])/g, '∉');
  s = s.replace(/\\in(?![a-zA-Z])/g, '∈');
  s = s.replace(/\\subset(?![a-zA-Z])/g, '⊂');
  s = s.replace(/\\subseteq(?![a-zA-Z])/g, '⊆');
  s = s.replace(/\\forall(?![a-zA-Z])/g, '∀');
  s = s.replace(/\\exists(?![a-zA-Z])/g, '∃');
  s = s.replace(/\\iff(?![a-zA-Z])/g, '⇔');
  s = s.replace(/\\implies(?![a-zA-Z])/g, '⇒');
  s = s.replace(/\\Rightarrow(?![a-zA-Z])/g, '⇒');
  s = s.replace(/\\Leftarrow(?![a-zA-Z])/g, '⇐');
  s = s.replace(/\\rightarrow(?![a-zA-Z])/g, '→');
  s = s.replace(/\\leftarrow(?![a-zA-Z])/g, '←');
  s = s.replace(/\\to(?![a-zA-Z])/g, '→');

  // Greek letters
  s = s.replace(/\\alpha(?![a-zA-Z])/g, 'α');
  s = s.replace(/\\beta(?![a-zA-Z])/g, 'β');
  s = s.replace(/\\gamma(?![a-zA-Z])/g, 'γ');
  s = s.replace(/\\delta(?![a-zA-Z])/g, 'δ');
  s = s.replace(/\\lambda(?![a-zA-Z])/g, 'λ');
  s = s.replace(/\\mu(?![a-zA-Z])/g, 'μ');
  s = s.replace(/\\sigma(?![a-zA-Z])/g, 'σ');
  s = s.replace(/\\theta(?![a-zA-Z])/g, 'θ');
  s = s.replace(/\\omega(?![a-zA-Z])/g, 'ω');
  s = s.replace(/\\pi(?![a-zA-Z])/g, 'π');
  s = s.replace(/\\nabla(?![a-zA-Z])/g, '∇');
  s = s.replace(/\\partial(?![a-zA-Z])/g, '∂');
  s = s.replace(/\\Delta(?![a-zA-Z])/g, 'Δ');
  s = s.replace(/\\Sigma(?![a-zA-Z])/g, 'Σ');
  s = s.replace(/\\Omega(?![a-zA-Z])/g, 'Ω');
  s = s.replace(/\\Lambda(?![a-zA-Z])/g, 'Λ');
  s = s.replace(/\\Phi(?![a-zA-Z])/g, 'Φ');

  // Operators
  s = s.replace(/\\det(?![a-zA-Z])/g, 'det');
  s = s.replace(/\\dim(?![a-zA-Z])/g, 'dim');
  s = s.replace(/\\ker(?![a-zA-Z])/g, 'ker');
  s = s.replace(/\\im(?![a-zA-Z])/g, 'im');
  s = s.replace(/\\rank(?![a-zA-Z])/g, 'rank');
  s = s.replace(/\\tr(?![a-zA-Z])/g, 'tr');
  s = s.replace(/\\operatorname\{([^}]+)\}/g, '$1');

  // Fractions: \frac{a}{b} -> (a/b)
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');

  // Superscripts with curly braces: ^{...}
  s = s.replace(/\^\{([^}]+)\}/g, (_, exp) => toSuperscript(exp));
  // Single char superscripts: ^x
  s = s.replace(/\^([0-9a-zA-Z+*=\-()])/g, (_, exp) => toSuperscript(exp));

  // Subscripts with curly braces: _{...}
  s = s.replace(/_\{([^}]+)\}/g, (_, sub) => toSubscript(sub));
  // Single char subscripts: _x
  s = s.replace(/_([0-9a-zA-Z+=\-()])/g, (_, sub) => toSubscript(sub));

  // Clean formatting commands
  s = s.replace(/\\text\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathbf\{([^}]+)\}/g, '$1');
  s = s.replace(/\\math(?:rm|it|sf)\{([^}]+)\}/g, '$1');
  s = s.replace(/\\vec\{([^}]+)\}/g, '→$1');
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
  s = s.replace(/\\langle/g, '⟨').replace(/\\rangle/g, '⟩');

  return s;
}

export const latexToCanvasText = latexToCanvasGlyphs;
