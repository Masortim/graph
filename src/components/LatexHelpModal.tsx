import React, { useMemo, useState } from 'react';
import { X, Copy, Check, Sparkles, BookOpen, Search } from 'lucide-react';
import { renderLatexToHtml } from '../utils/latexRenderer';
import type { AppMode } from '../types/graph';

interface LatexHelpModalProps {
  onClose: () => void;
  onInsertSnippet?: (snippet: string) => void;
  /**
   * UI language of the reference: the Assistant view is English, every other view
   * (Student / legacy Author) keeps the original Russian wording.
   */
  mode?: AppMode;
}

interface LatexItem {
  labelEn: string;
  labelRu: string;
  code: string;
  descriptionEn: string;
  descriptionRu: string;
}

interface LatexCategory {
  titleEn: string;
  titleRu: string;
  items: LatexItem[];
}

const LATEX_CATEGORIES: LatexCategory[] = [
  {
    titleEn: 'Vectors & Spaces',
    titleRu: 'Векторы и пространства (Vectors & Spaces)',
    items: [
      {
        labelEn: 'Space ℝⁿ',
        labelRu: 'Пространство ℝⁿ',
        code: '$\\mathbb{R}^n$',
        descriptionEn: 'n-dimensional Euclidean space',
        descriptionRu: 'n-мерное евклидово пространство',
      },
      {
        labelEn: 'Complex space ℂⁿ',
        labelRu: 'Комплексное пространство ℂⁿ',
        code: '$\\mathbb{C}^n$',
        descriptionEn: 'n-dimensional unitary space',
        descriptionRu: 'n-мерное унитарное пространство',
      },
      {
        labelEn: 'Matrix space',
        labelRu: 'Матричное пространство',
        code: '$\\mathbb{R}^{m \\times n}$',
        descriptionEn: 'Space of matrices of size m by n',
        descriptionRu: 'Пространство матриц размера m на n',
      },
      {
        labelEn: 'Column vector',
        labelRu: 'Вектор-столбец',
        code: '$\\mathbf{x} = (x_1, x_2, \\dots, x_n)^T$',
        descriptionEn: 'Bold vector with transposition',
        descriptionRu: 'Жирный вектор с транспонированием',
      },
      {
        labelEn: 'Arrow vector',
        labelRu: 'Стрелочный вектор',
        code: '$\\vec{v} \\in V$',
        descriptionEn: 'Vector with an arrow above the symbol',
        descriptionRu: 'Вектор со стрелкой над символом',
      },
      {
        labelEn: 'Zero vector',
        labelRu: 'Нулевой вектор',
        code: '$\\mathbf{0}$',
        descriptionEn: 'Bold zero (zero vector)',
        descriptionRu: 'Жирный ноль (нулевой вектор)',
      },
    ],
  },
  {
    titleEn: 'Matrices & Determinants',
    titleRu: 'Матрицы и определители (Matrices & Determinants)',
    items: [
      {
        labelEn: '2×2 matrix (round brackets)',
        labelRu: 'Матрица 2×2 (круглые скобки)',
        code: '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$',
        descriptionEn: 'pmatrix: elements are separated by &, rows by \\\\',
        descriptionRu: 'pmatrix: элементы разделяются &, строки — \\\\',
      },
      {
        labelEn: '2×2 matrix (square brackets)',
        labelRu: 'Матрица 2×2 (квадратные скобки)',
        code: '$\\begin{bmatrix} 1 & 0 \\\\ 0 & 1 \\end{bmatrix}$',
        descriptionEn: 'bmatrix: identity or block matrix',
        descriptionRu: 'bmatrix: единичная или блочная матрица',
      },
      {
        labelEn: 'Matrix determinant (det)',
        labelRu: 'Определитель матрицы (det)',
        code: '$\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}$',
        descriptionEn: 'vmatrix: vertical straight lines of the determinant',
        descriptionRu: 'vmatrix: вертикальные прямые линии определителя',
      },
      {
        labelEn: 'Matrix of arbitrary size',
        labelRu: 'Матрица произвольного размера',
        code: '$\\begin{pmatrix} a_{11} & \\cdots & a_{1n} \\\\ \\vdots & \\ddots & \\vdots \\\\ a_{m1} & \\cdots & a_{mn} \\end{pmatrix}$',
        descriptionEn: 'Matrix with dots \\cdots, \\vdots, \\ddots',
        descriptionRu: 'Матрица с точками \\cdots, \\vdots, \\ddots',
      },
      {
        labelEn: 'Column vector 3×1',
        labelRu: 'Вектор-столбец 3×1',
        code: '$\\begin{pmatrix} x_1 \\\\ x_2 \\\\ x_3 \\end{pmatrix}$',
        descriptionEn: 'Column of coordinates',
        descriptionRu: 'Столбец координат',
      },
    ],
  },
  {
    titleEn: 'Linear Algebra Operators',
    titleRu: 'Операторы линейной алгебры (Linear Algebra Operators)',
    items: [
      {
        labelEn: 'Determinant det(A)',
        labelRu: 'Определитель det(A)',
        code: '$\\det(A)$',
        descriptionEn: 'Determinant of a square matrix',
        descriptionRu: 'Определитель квадратной матрицы',
      },
      {
        labelEn: 'Matrix rank rank(A)',
        labelRu: 'Ранг матрицы rank(A)',
        code: '$\\operatorname{rank}(A)$',
        descriptionEn: 'Rank of a matrix or of an operator',
        descriptionRu: 'Ранг матрицы или оператора',
      },
      {
        labelEn: 'Matrix trace tr(A)',
        labelRu: 'След матрицы tr(A)',
        code: '$\\operatorname{tr}(A)$',
        descriptionEn: 'Sum of the diagonal elements',
        descriptionRu: 'Сумма диагональных элементов',
      },
      {
        labelEn: 'Kernel and image of an operator',
        labelRu: 'Ядро и образ оператора',
        code: '$\\operatorname{ker}(T), \\operatorname{im}(T)$',
        descriptionEn: 'Kernel and Image',
        descriptionRu: 'Kernel (ядро) и Image (образ)',
      },
      {
        labelEn: 'Linear span',
        labelRu: 'Линейная оболочка span',
        code: '$\\operatorname{span}(\\mathbf{v}_1, \\mathbf{v}_2)$',
        descriptionEn: 'Set of all linear combinations',
        descriptionRu: 'Множество всех линейных комбинаций',
      },
      {
        labelEn: 'Dimension dim(V)',
        labelRu: 'Размерность dim(V)',
        code: '$\\dim(V) = n$',
        descriptionEn: 'Dimension of a vector space',
        descriptionRu: 'Размерность векторного пространства',
      },
    ],
  },
  {
    titleEn: 'Eigenvalues & Eigenvectors',
    titleRu: 'Собственные значения (Eigenvalues & Eigenvectors)',
    items: [
      {
        labelEn: 'Eigenvector equation',
        labelRu: 'Уравнение на собственные векторы',
        code: '$A\\mathbf{x} = \\lambda \\mathbf{x}$',
        descriptionEn: 'The main equation of spectral theory',
        descriptionRu: 'Основное уравнение спектральной теории',
      },
      {
        labelEn: 'Characteristic equation',
        labelRu: 'Характеристическое уравнение',
        code: '$\\det(A - \\lambda I) = 0$',
        descriptionEn: 'Used to find the spectrum of a matrix',
        descriptionRu: 'Для нахождения спектра матрицы',
      },
      {
        labelEn: 'Spectrum of a matrix',
        labelRu: 'Спектр матрицы',
        code: '$\\sigma(A) = \\{\\lambda_1, \\dots, \\lambda_n\\}$',
        descriptionEn: 'Set of eigenvalues',
        descriptionRu: 'Множество собственных значений',
      },
      {
        labelEn: 'Spectral decomposition',
        labelRu: 'Спектральное разложение',
        code: '$A = Q \\Lambda Q^T$',
        descriptionEn: 'Diagonalization of a symmetric matrix',
        descriptionRu: 'Диагонализация симметричной матрицы',
      },
    ],
  },
  {
    titleEn: 'Powers, Fractions, Norms & Scalar Products',
    titleRu: 'Степени, дроби, нормы и скалярные произведения',
    items: [
      {
        labelEn: 'Transposition and inverse',
        labelRu: 'Транспонирование и обратная',
        code: '$A^T, A^{-1}, A^*$',
        descriptionEn: 'Transposed, inverse and conjugate matrices',
        descriptionRu: 'Транспонированная, обратная и сопряженная матрицы',
      },
      {
        labelEn: 'Fraction',
        labelRu: 'Дробь',
        code: '$\\frac{1}{2}$',
        descriptionEn: 'Simple fraction: \\frac{numerator}{denominator}',
        descriptionRu: 'Простая дробь: \\frac{числитель}{знаменатель}',
      },
      {
        labelEn: 'Partial derivative',
        labelRu: 'Частная производная',
        code: '$\\frac{\\partial L}{\\partial w_i}$',
        descriptionEn: 'Partial derivative symbol \\partial',
        descriptionRu: 'Символ частной производной \\partial',
      },
      {
        labelEn: 'Vector norm (length)',
        labelRu: 'Норма вектора (длина)',
        code: '$\\|\\mathbf{x}\\| = \\sqrt{\\sum_{i=1}^n x_i^2}$',
        descriptionEn: 'Euclidean norm of a vector',
        descriptionRu: 'Евклидова норма вектора',
      },
      {
        labelEn: 'Scalar product',
        labelRu: 'Скалярное произведение',
        code: '$\\langle \\mathbf{u}, \\mathbf{v} \\rangle = \\mathbf{u}^T \\mathbf{v}$',
        descriptionEn: 'Angle brackets \\langle and \\rangle',
        descriptionRu: 'Угловые скобки \\langle и \\rangle',
      },
      {
        labelEn: 'Orthogonality',
        labelRu: 'Ортогональность',
        code: '$\\mathbf{u} \\perp \\mathbf{v} \\iff \\langle \\mathbf{u}, \\mathbf{v} \\rangle = 0$',
        descriptionEn: 'Orthogonality symbol \\perp',
        descriptionRu: 'Символ ортогональности \\perp',
      },
    ],
  },
  {
    titleEn: 'Greek Letters & Mathematical Symbols',
    titleRu: 'Греческие буквы и математические символы',
    items: [
      {
        labelEn: 'Greek letters (lowercase)',
        labelRu: 'Греческие буквы (строчные)',
        code: '$\\alpha, \\beta, \\gamma, \\delta, \\lambda, \\sigma, \\theta, \\mu, \\omega$',
        descriptionEn: 'Alpha, beta, gamma, delta, lambda, sigma, theta...',
        descriptionRu: 'Альфа, бета, гамма, дельта, лямбда, сигма, тета...',
      },
      {
        labelEn: 'Greek letters (uppercase)',
        labelRu: 'Греческие буквы (заглавные)',
        code: '$\\Delta, \\Sigma, \\Omega, \\Lambda, \\Phi$',
        descriptionEn: 'Uppercase letters for matrices and operators',
        descriptionRu: 'Заглавные буквы для матриц и операторов',
      },
      {
        labelEn: 'Arrows and logical connectives',
        labelRu: 'Стрелки и логические связки',
        code: '$\\to, \\Rightarrow, \\iff, \\forall, \\exists$',
        descriptionEn: 'Arrow, implication, equivalence, quantifiers',
        descriptionRu: 'Стрелка, следование, эквивалентность, кванторы',
      },
      {
        labelEn: 'Comparisons and inclusions',
        labelRu: 'Сравнения и включения',
        code: '$\\approx, \\neq, \\leq, \\geq, \\in, \\notin, \\subset, \\subseteq$',
        descriptionEn: 'Approximately, not equal, less-or-equal, belongs to...',
        descriptionRu: 'Приближенно, не равно, меньше-равно, принадлежит...',
      },
    ],
  },
];

export const LatexHelpModal: React.FC<LatexHelpModalProps> = ({
  onClose,
  onInsertSnippet,
  mode = 'student',
}) => {
  // Assistant view is fully English; all other views keep the original Russian reference.
  const isEnglish = mode === 'assistant';
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Categories localized for the active UI language (LaTeX code itself is language independent)
  const localizedCategories = useMemo(
    () =>
      LATEX_CATEGORIES.map(cat => ({
        title: isEnglish ? cat.titleEn : cat.titleRu,
        items: cat.items.map(item => ({
          label: isEnglish ? item.labelEn : item.labelRu,
          description: isEnglish ? item.descriptionEn : item.descriptionRu,
          code: item.code,
          searchHaystack: [
            isEnglish ? item.labelEn : item.labelRu,
            isEnglish ? item.descriptionEn : item.descriptionRu,
            item.code,
          ]
            .join(' ')
            .toLowerCase(),
        })),
      })),
    [isEnglish]
  );

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

  const filteredCategories = localizedCategories.map(cat => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return cat;
    const items = cat.items.filter(item => item.searchHaystack.includes(term));
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
                {isEnglish ? 'KaTeX / LaTeX Formula Input Reference' : 'Справка по вводу формул KaTeX / LaTeX'}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 border border-sky-700 text-sky-300 font-mono">
                  $math$
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {isEnglish
                  ? 'Click any formula card to automatically copy it and insert it into the input field'
                  : 'Кликните по любой карточке формулы, чтобы автоматически скопировать и вставить её в поле ввода'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KaTeX Rules Banner & Search */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 space-y-3">
          <div className="p-3 bg-sky-950/30 border border-sky-900/50 rounded-xl text-[11px] text-slate-300 leading-relaxed space-y-1">
            <div className="font-semibold text-sky-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              {isEnglish
                ? 'Basic rules of KaTeX syntax in the note cards:'
                : 'Основные правила синтаксиса KaTeX в табличках:'}
            </div>
            <ul className="list-disc list-inside text-slate-400 space-y-0.5">
              <li>
                {isEnglish ? 'A formula must be wrapped in dollar signs: ' : 'Формула обязательно обрамляется знаками доллара: '}
                <code className="text-sky-200 bg-slate-900 px-1 py-0.2 rounded font-mono">$...$</code>.
              </li>
              <li>
                {isEnglish ? 'Inside matrices, rows are separated by a double slash ' : 'Внутри матриц строки разделяются двойным слэшем '}
                <code className="text-sky-200 bg-slate-900 px-1 py-0.2 rounded font-mono">\\</code>
                {isEnglish ? ', and elements by the ' : ', а элементы — знаком '}
                <code className="text-sky-200 bg-slate-900 px-1 py-0.2 rounded font-mono">&</code>.
              </li>
              <li>
                {isEnglish ? 'For text inside a formula use ' : 'Для текста внутри формулы используйте '}
                <code className="text-sky-200 bg-slate-900 px-1 py-0.2 rounded font-mono">\text&#123;{isEnglish ? 'text' : 'текст'}&#125;</code>
                {isEnglish ? ' or ' : ' или '}
                <code className="text-sky-200 bg-slate-900 px-1 py-0.2 rounded font-mono">\operatorname&#123;rank&#125;</code>.
              </li>
              <li>
                {isEnglish ? 'Supported together with formulas: bold text ' : 'Вместе с формулами поддерживаются: жирный шрифт '}
                <code className="text-amber-200 bg-slate-900 px-1 py-0.2 rounded font-mono">**{isEnglish ? 'text' : 'текст'}**</code>
                {isEnglish ? ' and colored squares ' : ' и цветные квадратики '}
                <code className="text-amber-200 bg-slate-900 px-1 py-0.2 rounded font-mono">🟨 🟦 🟩</code>.
              </li>
            </ul>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={
                isEnglish
                  ? 'Search formulas (matrix, vector, eigenvalue, rank, det, R^n)...'
                  : 'Поиск по формулам (матрица, вектор, собственный, rank, det, R^n)...'
              }
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
                          title={isEnglish ? 'Copy / Insert' : 'Скопировать / Вставить'}
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span className="font-mono">
                            {isCopied ? (isEnglish ? 'Inserted' : 'Вставлено') : (isEnglish ? 'Insert' : 'Вставить')}
                          </span>
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
              {isEnglish
                ? `No formulas found for the query «${searchTerm}».`
                : `Формулы по запросу «${searchTerm}» не найдены.`}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow transition"
          >
            {isEnglish ? 'Close' : 'Закрыть'}
          </button>
        </div>
      </div>
    </div>
  );
};
