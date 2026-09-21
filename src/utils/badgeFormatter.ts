import { parseRichLine, type RichSegment, latexToCanvasGlyphs } from './latexRenderer';

export interface BadgeSegment {
  type: 'text' | 'bold' | 'square' | 'latex';
  text?: string;
  latex?: string;
  squareColor?: string;
  width?: number;
}

export interface BadgeLine {
  segments: BadgeSegment[];
  width: number;
}

export const BADGE_SQUARE_COLORS = {
  yellow: '#fbbf24',
  blue: '#38bdf8',
  green: '#22c55e',
};

export function tokenizeLine(line: string): BadgeSegment[] {
  const richSegments = parseRichLine(line);
  return richSegments.map((seg: RichSegment): BadgeSegment => {
    if (seg.type === 'latex') {
      return {
        type: 'latex',
        latex: seg.latex,
        text: latexToCanvasGlyphs(seg.latex || ''),
      };
    }
    return {
      type: seg.type,
      text: seg.text,
      squareColor: seg.squareColor,
    };
  });
}

/**
 * Wraps a list of BadgeSegments so that no line exceeds wrapWidth.
 */
function wrapSegmentsToLines(
  segments: BadgeSegment[],
  measureFn: (text: string, isBold: boolean, isLatex?: boolean) => number,
  wrapWidth: number,
  squareWidth: number
): BadgeLine[] {
  const resultLines: BadgeLine[] = [];
  let currentSegments: BadgeSegment[] = [];
  let currentWidth = 0;

  const pushCurrentLine = () => {
    if (currentSegments.length > 0) {
      resultLines.push({
        segments: currentSegments,
        width: currentWidth,
      });
      currentSegments = [];
      currentWidth = 0;
    }
  };

  segments.forEach(seg => {
    if (seg.type === 'square') {
      const w = squareWidth;
      if (currentWidth + w > wrapWidth && currentSegments.length > 0) {
        pushCurrentLine();
      }
      currentSegments.push({ ...seg, width: w });
      currentWidth += w;
    } else if (seg.type === 'latex') {
      const glyphs = seg.text || seg.latex || '';
      const w = measureFn(glyphs, false, true);
      if (currentWidth + w > wrapWidth && currentSegments.length > 0) {
        pushCurrentLine();
      }
      currentSegments.push({ ...seg, width: w });
      currentWidth += w;
    } else {
      // type === 'text' or 'bold'
      const rawText = seg.text || '';
      const isBold = seg.type === 'bold';
      
      // Split into words while preserving spaces
      const words = rawText.split(/(\s+)/);

      words.forEach(word => {
        if (!word) return;
        const wordW = measureFn(word, isBold, false);

        if (currentWidth + wordW > wrapWidth && currentSegments.length > 0 && word.trim().length > 0) {
          pushCurrentLine();
        }

        currentSegments.push({
          type: seg.type,
          text: word,
          width: wordW,
        });
        currentWidth += wordW;
      });
    }
  });

  pushCurrentLine();
  return resultLines;
}

/**
 * Parses raw info badge content into styled lines, preserving explicit \n line breaks,
 * LaTeX formulas, bold segments, colored squares, and wrapping lines when wrapWidth is specified.
 */
export function formatBadgeContent(
  rawContent: string,
  measureTextFn?: (text: string, isBold: boolean, isLatex?: boolean) => number,
  fontSize = 11,
  wrapWidth?: number
): { lines: BadgeLine[]; maxLineWidth: number } {
  if (rawContent === undefined || rawContent === null) {
    return { lines: [], maxLineWidth: 0 };
  }

  const rawLines = rawContent.split(/\r?\n/);
  const formattedLines: BadgeLine[] = [];
  let maxLineWidth = 0;

  const squareSize = fontSize * 1.25;
  const squareSpacing = 4;
  const squareWidth = squareSize + squareSpacing;

  const measure = (text: string, isBold: boolean, isLatex = false) => {
    if (measureTextFn) {
      return measureTextFn(text, isBold, isLatex);
    }
    return text.length * (fontSize * (isBold ? 0.62 : 0.58));
  };

  rawLines.forEach(rawLine => {
    if (!rawLine) {
      formattedLines.push({
        segments: [],
        width: 0,
      });
      return;
    }

    const segments = tokenizeLine(rawLine);

    if (wrapWidth && wrapWidth > 0) {
      const wrapped = wrapSegmentsToLines(segments, measure, wrapWidth, squareWidth);
      wrapped.forEach(l => {
        if (l.width > maxLineWidth) maxLineWidth = l.width;
        formattedLines.push(l);
      });
    } else {
      let lineWidth = 0;
      segments.forEach(seg => {
        if (seg.type === 'square') {
          seg.width = squareWidth;
        } else if (seg.type === 'latex') {
          const glyphs = seg.text || seg.latex || '';
          seg.width = measure(glyphs, false, true);
        } else {
          seg.width = measure(seg.text || '', seg.type === 'bold', false);
        }
        lineWidth += seg.width || 0;
      });

      if (lineWidth > maxLineWidth) {
        maxLineWidth = lineWidth;
      }

      formattedLines.push({
        segments,
        width: lineWidth,
      });
    }
  });

  return {
    lines: formattedLines,
    maxLineWidth,
  };
}
