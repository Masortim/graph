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
    title: 'Векторы и пространства (Vectors & Spaces)',
    items: [
      {
        label: 'Пространство ℝⁿ',
        code: '$\\mathbb{R}^n$',
        description: 'n-мерное евклидово пространство',
      },
      {
        label: 'Комплексное пространство ℂⁿ',
        code: '$\\mathbb{C}^n$',
        description: 'n-мерное унитарное пространство',
      },
      {
        label: 'Матричное пространство',
        code: '$\\mathbb{R}^{m \\times n}$',
        description: 'Пространство матриц размера m на n',
      },
      {
        label: 'Вектор-столбец',
        code: '$\\mathbf{x} = (x_1, x_2, \\dots, x_n)^T$',
        description: 'Жирный вектор с транспонированием',
      },
      {
        label: 'Стрелочный вектор',
        code: '$\\vec{v} \\in V$',
        description: 'Вектор со стрелкой над символом',
      },
      {
        label: 'Нулевой вектор',
        code: '$\\mathbf{0}$',
        description: 'Жирный ноль (нулевой вектор)',
      },
    ],
  },
  {
    title: 'Матрицы и определители (Matrices & Determinants)',
    items: [
      {
        label: 'Матрица 2×2 (круглые скобки)',
        code: '$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$',
        description: 'pmatrix: элементы разделяются &, строки — \\\\',
      },
      {
        label: 'Матрица 2×2 (квадратные скобки)',
        code: '$\\begin{bmatrix} 1 & 0 \\\\ 0 & 1 \\end{bmatrix}$',
        description: 'bmatrix: единичная или блочная матрица',
      },
      {
        label: 'Определитель матрицы (det)',
        code: '$\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}$',
        description: 'vmatrix: вертикальные прямые линии определителя',
      },
      {
        label: 'Матрица произвольного размера',
        code: '$\\begin{pmatrix} a_{11} & \\cdots & a_{1n} \\\\ \\vdots & \\ddots & \\vdots \\\\ a_{m1} & \\cdots & a_{mn} \\end{pmatrix}$',
        description: 'Матрица с точками \\cdots, \\vdots, \\ddots',
      },
      {
        label: 'Вектор-столбец 3×1',
        code: '$\\begin{pmatrix} x_1 \\\\ x_2 \\\\ x_3 \\end{pmatrix}$',
        description: 'Столбец координат',
      },
    ],
  },
  {
    title: 'Операторы линейной алгебры (Linear Algebra Operators)',
    items: [
      {
        label: 'Определитель det(A)',
        code: '$\\det(A)$',
        description: 'Определитель квадратной матрицы',
      },
      {
        label: 'Ранг матрицы rank(A)',
        code: '$\\operatorname{rank}(A)$',
        description: 'Ранг матрицы или оператора',
      },
      {
        label: 'След матрицы tr(A)',
        code: '$\\operatorname{tr}(A)$',
        description: 'Сумма диагональных элементов',
      },
      {
        label: 'Ядро и образ оператора',
        code: '$\\operatorname{ker}(T), \\operatorname{im}(T)$',
        description: 'Kernel (ядро) и Image (образ)',
      },
      {
        label: 'Линейная оболочка span',
        code: '$\\operatorname{span}(\\mathbf{v}_1, \\mathbf{v}_2)$',
        description: 'Множество всех линейных комбинаций',
      },
      {
        label: 'Размерность dim(V)',
        code: '$\\dim(V) = n$',
        description: 'Размерность векторного пространства',
      },
    ],
  },
  {
    title: 'Собственные значения (Eigenvalues & Eigenvectors)',
    items: [
      {
        label: 'Уравнение на собственные векторы',
        code: '$A\\mathbf{x} = \\lambda \\mathbf{x}$',
        description: 'Основное уравнение спектральной теории',
      },
      {
        label: 'Характеристическое уравнение',
        code: '$\\det(A - \\lambda I) = 0$',
        description: 'Для нахождения спектра матрицы',
      },
      {
        label: 'Спектр матрицы',
        code: '$\\sigma(A) = \\{\\lambda_1, \\dots, \\lambda_n\\}$',
        description: 'Множество собственных значений',
      },
      {
        label: 'Спектральное разложение',
        code: '$A = Q \\Lambda Q^T$',
        description: 'Диагонализация симметричной матрицы',
      },
    ],
  },
  {
    title: 'Степени, дроби, нормы и скалярные произведения',
    items: [
      {
        label: 'Транспонирование и обратная',
        code: '$A^T, A^{-1}, A^*$',
        description: 'Транспонированная, обратная и сопряженная матрицы',
      },
      {
        label: 'Дробь',
        code: '$\\frac{1}{2}$',
        description: 'Простая дробь: \\frac{числитель}{знаменатель}',
      },
      {
        label: 'Частная производная',
        code: '$\\frac{\\partial L}{\\partial w_i}$',
        description: 'Символ частной производной \\partial',
      },
      {
        label: 'Норма вектора (длина)',
        code: '$\\|\\mathbf{x}\\| = \\sqrt{\\sum_{i=1}^n x_i^2}$',
        description: 'Евклидова норма вектора',
      },
      {
        label: 'Скалярное произведение',
        code: '$\\langle \\mathbf{u}, \\mathbf{v} \\rangle = \\mathbf{u}^T \\mathbf{v}$',
        description: 'Угловые скобки \\langle и \\rangle',
      },
      {
        label: 'Ортогональность',
        code: '$\\mathbf{u} \\perp \\mathbf{v} \\iff \\langle \\mathbf{u}, \\mathbf{v} \\rangle = 0$',
        description: 'Символ ортогональности \\perp',
      },
    ],
  },
  {
    title: 'Греческие буквы и математические символы',
    items: [
      {
        label: 'Греческие буквы (строчные)',
        code: '$\\alpha, \\beta, \\gamma, \\delta, \\lambda, \\sigma, \\theta, \\mu, \\omega$',
        description: 'Альфа, бета, гамма, дельта, лямбда, сигма, тета...',
      },
      {
        label: 'Греческие буквы (заглавные)',
        code: '$\\Delta, \\Sigma, \\Omega, \\Lambda, \\Phi$',
        description: 'Заглавные буквы для матриц и операторов',
      },
      {
        label: 'Стрелки и логические связки',
        code: '$\\to, \\Rightarrow, \\iff, \\forall, \\exists$',
        description: 'Стрелка, следование, эквивалентность, кванторы',
      },
      {
        label: 'Сравнения и включения',
        code: '$\\approx, \\neq, \\leq, \\geq, \\in, \\notin, \\subset, \\subseteq$',
        description: 'Приближенно, не равно, меньше-равно, принадлежит...',
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
                Справка по вводу формул KaTeX / LaTeX
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950 border border-sky-700 text-sky-300 font-mono">
                  $math$
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Кликните по любой карточке формулы, чтобы автоматически скопировать и вставить её в поле ввода
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
              <Sparkles className="w-3.5 h-3.5 text-sky-400" /> Основные правила синтаксиса KaTeX в табличках:
            </div>
            <ul className="list-disc list-inside text-slate-400 space-y-0.5">
              <li>Формула обязательно обрамляется знаками доллара: <code className="text-sky-200 bg-slate-900 px-1 py-0.2 rounded font-mono">$...$</code>.</li>
              <li>Внутри матриц строки разделяются двойным слэшем <code className="text-sky-200 bg-slate-900 px-1 py-0.2 rounded font-mono">\\\\</code>, а элементы — знаком <code className="text-sky-200 bg-slate-900 px-1 py-0.2 rounded font-mono">&</code>.</li>
              <li>Для текста внутри формулы используйте <code className="text-sky-200 bg-slate-900 px-1 py-0.2 rounded font-mono">\text&#123;текст&#125;</code> или <code className="text-sky-200 bg-slate-900 px-1 py-0.2 rounded font-mono">\operatorname&#123;rank&#125;</code>.</li>
              <li>Вместе с формулами поддерживаются: жирный шрифт <code className="text-amber-200 bg-slate-900 px-1 py-0.2 rounded font-mono">**текст**</code> и цветные квадратики <code className="text-amber-200 bg-slate-900 px-1 py-0.2 rounded font-mono">🟨 🟦 🟩</code>.</li>
            </ul>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Поиск по формулам (матрица, вектор, собственный, rank, det, R^n)..."
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
                          title="Скопировать / Вставить"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span className="font-mono">{isCopied ? 'Вставлено' : 'Вставить'}</span>
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
              Формулы по запросу «{searchTerm}» не найдены.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold shadow transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
