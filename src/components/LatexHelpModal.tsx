import React, { useState } from 'react';
import { X, Copy, Check, Sparkles, BookOpen, Search } from 'lucide-react';
import { renderLatexToHtml } from '../utils/latexRenderer';

interface LatexHelpModalProps {
  onClose: () => void;
  onInsertSnippet?: (snippet: string) => void;
}

interface LatexCategory {
  title: string;
  items: {
    label: string;
    code: string;
    description: string;
  }[];
}

const LATEX_CATEGORIES: LatexCategory[] = [
  {
    title: 'Vectors & Spaces',
    items: [
      {
        label: 'Euclidean Space ℝⁿ',
        code: '$\\mathbb{R}^n$',
        description: 'n-dimensional real Euclidean vector space',
      },
      {
        label: 'Complex Space ℂⁿ',
        code: '$\\mathbb{C}^n$',
        description: 'n-dimensional complex unitary vector space',
      },
      {
        label: 'Matrix Space ℝᵐˣⁿ',
        code: '$\\mathbb{R}^{m \\times n}$',
        description: 'Space of m×n real matrices',
      },
      {
        label: 'Column Vector',
        code: '$\\mathbf{x} = (x_1, x_2, \\dots, x_n)^T$',
        description: 'Bold column vector with transpose',
      },
      {
        label: 'Arrow Vector',
        code: '$\\vec{v} \\in V$',
        description: 'Vector notation with overhead arrow',
      },
      {
        label: 'Zero Vector',
        code: '$\\mathbf{0}$',
        description: 'Bold zero vector notation',
      },
    ],
  },
  {
    title: 'Matrices & Determinants',
    items: [
      {
        label: '2×2 Matrix (Parentheses)',
        code: '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$',
        description: 'pmatrix: elements separated by &, rows by \\\\',
      },
      {
        label: '2×2 Matrix (Brackets)',
        code: '$\\begin{bmatrix} 1 & 0 \\\\ 0 & 1 \\end{bmatrix}$',
        description: 'bmatrix: identity or block matrix representation',
      },
      {
        label: 'Matrix Determinant (det)',
        code: '$\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}$',
        description: 'vmatrix: vertical bars for matrix determinant',
      },
      {
        label: 'Arbitrary m×n Matrix',
        code: '$\\begin{pmatrix} a_{11} & \\cdots & a_{1n} \\\\ \\vdots & \\ddots & \\vdots \\\\ a_{m1} & \\cdots & a_{mn} \\end{pmatrix}$',
        description: 'General matrix with dots \\cdots, \\vdots, \\ddots',
      },
      {
        label: '3×1 Column Vector',
        code: '$\\begin{pmatrix} x_1 \\\\ x_2 \\\\ x_3 \\end{pmatrix}$',
        description: '3D coordinate column vector',
      },
    ],
  },
  {
    title: 'Linear Algebra Operators',
    items: [
      {
        label: 'Determinant det(A)',
        code: '$\\det(A)$',
        description: 'Determinant of a square matrix',
      },
      {
        label: 'Matrix Rank rank(A)',
        code: '$\\operatorname{rank}(A)$',
        description: 'Rank of a matrix or linear transformation',
      },
      {
        label: 'Matrix Trace tr(A)',
        code: '$\\operatorname{tr}(A)$',
        description: 'Sum of main diagonal elements',
      },
      {
        label: 'Kernel & Image',
        code: '$\\operatorname{ker}(T), \\operatorname{im}(T)$',
        description: 'Kernel / null space and image / column space',
      },
      {
        label: 'Linear Span span',
        code: '$\\operatorname{span}(\\mathbf{v}_1, \\mathbf{v}_2)$',
        description: 'Set of all linear combinations',
      },
      {
        label: 'Dimension dim(V)',
        code: '$\\dim(V) = n$',
        description: 'Dimension of a vector space',
      },
    ],
  },
  {
    title: 'Eigenvalues & Eigenvectors',
    items: [
      {
        label: 'Eigenvector Equation',
        code: '$A\\mathbf{x} = \\lambda \\mathbf{x}$',
        description: 'Fundamental eigenvalue problem equation',
      },
      {
        label: 'Characteristic Equation',
        code: '$\\det(A - \\lambda I) = 0$',
        description: 'Polynomial equation to find matrix spectrum',
      },
      {
        label: 'Matrix Spectrum',
        code: '$\\sigma(A) = \\{\\lambda_1, \\dots, \\lambda_n\\}$',
        description: 'Set of all eigenvalues of matrix A',
      },
      {
        label: 'Spectral Decomposition',
        code: '$A = Q \\Lambda Q^T$',
        description: 'Orthogonal diagonalization of a symmetric matrix',
      },
    ],
  },
  {
    title: 'Powers, Fractions, Norms & Inner Products',
    items: [
      {
        label: 'Transpose & Inverse',
        code: '$A^T, A^{-1}, A^*$',
        description: 'Transpose, inverse, and conjugate transpose',
      },
      {
        label: 'Fraction',
        code: '$\\frac{1}{2}$',
        description: 'Standard fraction: \\frac{numerator}{denominator}',
      },
      {
        label: 'Partial Derivative',
        code: '$\\frac{\\partial L}{\\partial w_i}$',
        description: 'Partial derivative symbol \\partial',
      },
      {
        label: 'Vector Norm (Length)',
        code: '$\\|\\mathbf{x}\\| = \\sqrt{\\sum_{i=1}^n x_i^2}$',
        description: 'Standard Euclidean L2 norm of a vector',
      },
      {
        label: 'Inner / Dot Product',
        code: '$\\langle \\mathbf{u}, \\mathbf{v} \\rangle = \\mathbf{u}^T \\mathbf{v}$',
        description: 'Angle brackets \\langle and \\rangle for inner product',
      },
      {
        label: 'Orthogonality',
        code: '$\\mathbf{u} \\perp \\mathbf{v} \\iff \\langle \\mathbf{u}, \\mathbf{v} \\rangle = 0$',
        description: 'Orthogonality symbol \\perp',
      },
    ],
  },
  {
    title: 'Greek Letters & Mathematical Symbols',
    items: [
      {
        label: 'Greek Letters (Lowercase)',
        code: '$\\alpha, \\beta, \\gamma, \\delta, \\lambda, \\sigma, \\theta, \\mu, \\omega$',
        description: 'Alpha, beta, gamma, delta, lambda, sigma, theta...',
      },
      {
        label: 'Greek Letters (Uppercase)',
        code: '$\\Delta, \\Sigma, \\Omega, \\Lambda, \\Phi$',
        description: 'Uppercase letters for matrices and operators',
      },
      {
        label: 'Arrows & Logical Connectives',
        code: '$\\to, \\Rightarrow, \\iff, \\forall, \\exists$',
        description: 'Arrow, implication, equivalence, and quantifiers',
      },
      {
        label: 'Relations & Set Inclusions',
        code: '$\\approx, \\neq, \\leq, \\geq, \\in, \\notin, \\subset, \\subseteq$',
        description: 'Approximate, not equal, inequality, and set symbols',
      },
    ],
  },
];

export const LatexHelpModal: React.FC<LatexHelpModalProps> = ({
  onClose,
  onInsertSnippet,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyOrInsert = (code: string) => {
    if (onInsertSnippet) {
      onInsertSnippet(code);
    }
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  const filteredCategories = LATEX_CATEGORIES.map(cat => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return cat;
    const items = cat.items.filter(
      item =>
        item.label.toLowerCase().includes(term) ||
        item.code.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
    );
    return { ...cat, items };
  }).filter(cat => cat.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-sky-950 border border-sky-800 rounded-lg text-sky-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                KaTeX / LaTeX Formula Guide
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 border border-sky-700 text-sky-300 font-mono">
                  $math$
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Click any formula card to automatically copy and insert it into the note editor
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KaTeX Rules Banner & Search */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 space-y-3">
          <div className="p-3 bg-sky-950/30 border border-sky-900/50 rounded-xl text-[11px] text-slate-300 leading-relaxed space-y-1">
            <div className="font-semibold text-sky-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Essential KaTeX Syntax Rules:
            </div>
            <ul className="list-disc list-inside text-slate-400 space-y-0.5">
              <li>Formulas must be enclosed in dollar signs: <code className="text-sky-200 bg-slate-900 px-1 py-0.2 rounded font-mono">$...$</code>.</li>
              <li>Inside matrices, rows are separated by double backslashes <code className="text-sky-200 bg-slate-900 px-1 py-0.2 rounded font-mono">\\\\</code>, and elements by <code className="text-sky-200 bg-slate-900 px-1 py-0.2 rounded font-mono">&</code>.</li>
              <li>For plain text inside math, use <code className="text-sky-200 bg-slate-900 px-1 py-0.2 rounded font-mono">\text&#123;text&#125;</code> or <code className="text-sky-200 bg-slate-900 px-1 py-0.2 rounded font-mono">\operatorname&#123;rank&#125;</code>.</li>
              <li>Markdown formatting is supported alongside math: bold <code className="text-amber-200 bg-slate-900 px-1 py-0.2 rounded font-mono">**bold**</code> and square tags <code className="text-amber-200 bg-slate-900 px-1 py-0.2 rounded font-mono">🟨 🟦 🟩</code>.</li>
            </ul>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search formulas (matrix, vector, eigenvalue, rank, det, R^n)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 shadow-inner"
            />
          </div>
        </div>

        {/* Categories & Formula Cards */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {filteredCategories.map((cat, catIdx) => (
            <div key={catIdx} className="space-y-2">
              <h4 className="font-bold text-xs text-sky-400 tracking-wide uppercase flex items-center gap-1.5 border-b border-slate-800 pb-1">
                <span>{cat.title}</span>
                <span className="text-[10px] text-slate-500 font-normal">({cat.items.length})</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {cat.items.map((item, itemIdx) => {
                  const isCopied = copiedCode === item.code;
                  const latexOnly = item.code.startsWith('$') && item.code.endsWith('$') ? item.code.slice(1, -1) : item.code;

                  return (
                    <div
                      key={itemIdx}
                      onClick={() => handleCopyOrInsert(item.code)}
                      className="group p-3 bg-slate-950/70 hover:bg-sky-950/40 border border-slate-800 hover:border-sky-600/70 rounded-xl cursor-pointer transition flex flex-col justify-between gap-2 shadow-sm relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-slate-200 text-xs group-hover:text-sky-300 transition">
                            {item.label}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.description}
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`p-1 rounded-md transition text-[10px] flex items-center gap-1 ${
                            isCopied
                              ? 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                              : 'bg-slate-900 border border-slate-700 text-slate-400 group-hover:text-sky-300 group-hover:border-sky-700'
                          }`}
                          title="Copy / Insert snippet"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span className="font-mono">{isCopied ? 'Inserted' : 'Insert'}</span>
                        </button>
                      </div>

                      {/* Live KaTeX Rendered Preview */}
                      <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-800/80 flex items-center justify-center min-h-[36px] overflow-x-auto text-sky-200 font-serif">
                        <span dangerouslySetInnerHTML={{ __html: renderLatexToHtml(latexOnly) }} />
                      </div>

                      {/* Raw LaTeX Code */}
                      <div className="font-mono text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800/60 truncate group-hover:text-slate-200">
                        {item.code}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="text-center py-12 text-slate-500 italic">
              No formulas found matching «{searchTerm}».
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
