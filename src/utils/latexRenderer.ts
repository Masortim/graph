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
    return `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-950/80 border border-red-800 text-red-300 font-mono text-[10px]" title="LaTeX Syntax Error: ${formula}">
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

// Convert standard LaTeX notations to readable canvas unicode text representations
export function latexToCanvasGlyphs(latex: string): string {
  let s = latex.trim();
  s = s.replace(/\\mathbb\{R\}/g, 'ℝ');
  s = s.replace(/\\mathbb\{C\}/g, 'ℂ');
  s = s.replace(/\\mathbb\{Z\}/g, 'ℤ');
  s = s.replace(/\\mathbb\{N\}/g, 'ℕ');
  s = s.replace(/\\mathbb\{Q\}/g, 'ℚ');
  s = s.replace(/\\mathbb\{F\}/g, '𝔽');
  
  // Greek letters
  s = s.replace(/\\alpha/g, 'α');
  s = s.replace(/\\beta/g, 'β');
  s = s.replace(/\\gamma/g, 'γ');
  s = s.replace(/\\delta/g, 'δ');
  s = s.replace(/\\lambda/g, 'λ');
  s = s.replace(/\\mu/g, 'μ');
  s = s.replace(/\\sigma/g, 'σ');
  s = s.replace(/\\theta/g, 'θ');
  s = s.replace(/\\omega/g, 'ω');
  s = s.replace(/\\pi/g, 'π');
  s = s.replace(/\\nabla/g, '∇');
  s = s.replace(/\\partial/g, '∂');

  // Math operators
  s = s.replace(/\\times/g, '×');
  s = s.replace(/\\cdot/g, '·');
  s = s.replace(/\\pm/g, '±');
  s = s.replace(/\\neq/g, '≠');
  s = s.replace(/\\leq/g, '≤');
  s = s.replace(/\\geq/g, '≥');
  s = s.replace(/\\approx/g, '≈');
  s = s.replace(/\\infty/g, '∞');
  s = s.replace(/\\in/g, '∈');
  s = s.replace(/\\notin/g, '∉');
  s = s.replace(/\\subset/g, '⊂');
  s = s.replace(/\\subseteq/g, '⊆');
  s = s.replace(/\\forall/g, '∀');
  s = s.replace(/\\exists/g, '∃');
  s = s.replace(/\\to/g, '→');
  s = s.replace(/\\leftarrow/g, '←');
  s = s.replace(/\\rightarrow/g, '→');
  s = s.replace(/\\Rightarrow/g, '⇒');
  s = s.replace(/\\iff/g, '⇔');

  // Superscripts
  s = s.replace(/\^0/g, '⁰').replace(/\^1/g, '¹').replace(/\^2/g, '²').replace(/\^3/g, '³').replace(/\^4/g, '⁴')
       .replace(/\^5/g, '⁵').replace(/\^6/g, '⁶').replace(/\^7/g, '⁷').replace(/\^8/g, '⁸').replace(/\^9/g, '⁹')
       .replace(/\^n/g, 'ⁿ').replace(/\^T/g, 'ᵀ').replace(/\^\*/g, '*').replace(/\^\{-1\}/g, '⁻¹');

  // Subscripts
  s = s.replace(/_0/g, '₀').replace(/_1/g, '₁').replace(/_2/g, '₂').replace(/_3/g, '₃').replace(/_4/g, '₄')
       .replace(/_5/g, '₅').replace(/_6/g, '₆').replace(/_7/g, '₇').replace(/_8/g, '₈').replace(/_9/g, '₉')
       .replace(/_i/g, 'ᵢ').replace(/_j/g, 'ⱼ').replace(/_k/g, 'ₖ').replace(/_n/g, 'ₙ').replace(/_m/g, 'ₘ');

  // Fractions: \frac{a}{b} -> a/b
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1/$2)');

  // Simple matrices: \begin{pmatrix} a & b \\ c & d \end{pmatrix} -> [a b; c d]
  s = s.replace(/\\begin\{(?:pmatrix|matrix|bmatrix)\}([\s\S]*?)\\end\{(?:pmatrix|matrix|bmatrix)\}/g, (_, body) => {
    const rows = body.split('\\\\').map((r: string) => r.replace(/&/g, ' ').trim()).filter(Boolean);
    return `[ ${rows.join(' | ')} ]`;
  });

  // Clean remaining commands like \text{...} or \{...\}
  s = s.replace(/\\text\{([^}]+)\}/g, '$1');
  s = s.replace(/\\mathbf\{([^}]+)\}/g, '$1');
  s = s.replace(/\\math(?:rm|it|sf)\{([^}]+)\}/g, '$1');
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');

  return s;
}

export const latexToCanvasText = latexToCanvasGlyphs;
