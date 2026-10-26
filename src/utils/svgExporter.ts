import type { GraphNode, GraphEdge, GraphSettings } from '../types/graph';
import { renderLatexToHtml } from './latexRenderer';
import defaultGraphConfig from '../data/graphConfig.json';
import rawKatexCss from 'katex/dist/katex.min.css?inline';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const processedKatexCss = rawKatexCss.replace(
  /url\(fonts\//g,
  'url(https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/fonts/'
);

/**
 * Parses markdown-like note card content and generates styled HTML with real KaTeX formulas.
 */
function renderCardBodyHtml(raw: string, bodyFontSize: number): string {
  if (!raw) return '';
  const rawLines = raw.split(/\r?\n/);
  const pattern = /(\$\$.*?\$\$|\$.*?\$|\*\*.*?\*\*|🟨|🟦|🟩|🟡|🔵|🟢|\[■:(?:yellow|blue|green|gold|cyan)\])/g;

  return rawLines
    .map(line => {
      if (!line.trim()) {
        return `<div style="height: ${Math.round(bodyFontSize * 0.75)}px;"></div>`;
      }
      const parts = line.split(pattern);
      let lineInner = '';

      parts.forEach(part => {
        if (!part) return;
        if (
          (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) ||
          (part.startsWith('$') && part.endsWith('$') && part.length >= 2)
        ) {
          const isDouble = part.startsWith('$$');
          const formula = isDouble ? part.slice(2, -2) : part.slice(1, -1);
          const rendered = renderLatexToHtml(formula, isDouble);
          lineInner += `<span class="svg-latex-span">${rendered}</span>`;
        } else if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          lineInner += `<strong style="font-weight: bold; color: #ffffff;">${escapeXml(part.slice(2, -2))}</strong>`;
        } else if (part === '🟨' || part === '🟡' || part === '[■:yellow]' || part === '[■:gold]') {
          lineInner += `<span class="svg-square-tag" style="width: ${Math.round(bodyFontSize * 0.95)}px; height: ${Math.round(bodyFontSize * 0.95)}px; background-color: #fbbf24;"></span>`;
        } else if (part === '🟦' || part === '🔵' || part === '[■:blue]' || part === '[■:cyan]') {
          lineInner += `<span class="svg-square-tag" style="width: ${Math.round(bodyFontSize * 0.95)}px; height: ${Math.round(bodyFontSize * 0.95)}px; background-color: #38bdf8;"></span>`;
        } else if (part === '🟩' || part === '🟢' || part === '[■:green]') {
          lineInner += `<span class="svg-square-tag" style="width: ${Math.round(bodyFontSize * 0.95)}px; height: ${Math.round(bodyFontSize * 0.95)}px; background-color: #22c55e;"></span>`;
        } else {
          lineInner += `<span style="color: #cbd5e1;">${escapeXml(part)}</span>`;
        }
      });

      return `<div style="margin: 3px 0; line-height: 1.5;">${lineInner}</div>`;
    })
    .join('');
}

/**
 * Calculates wrap-aware card dimensions to ensure complete visibility in SVG export without bottom clipping.
 */
function calculateAccurateCardDimensions(
  rawContent: string,
  headerTitle: string,
  bodyFontSize: number,
  headerFontSize: number,
  cardPadding: number,
  scaleMul: number
): { cardWidth: number; cardHeight: number } {
  const headerWidth = headerTitle.length * (headerFontSize * 0.62) + 24;
  const rawLines = (rawContent || '').split(/\r?\n/);
  const pattern = /(\$\$.*?\$\$|\$.*?\$|\*\*.*?\*\*|🟨|🟦|🟩|🟡|🔵|🟢|\[■:(?:yellow|blue|green|gold|cyan)\])/g;

  // 1. Calculate natural unwrapped width of each line
  let maxLineWidth = headerWidth;
  const lineMetrics: Array<{
    type: 'empty' | 'content';
    height: number;
    width: number;
    isMultiLineMath: boolean;
    mathRowCount: number;
  }> = [];

  rawLines.forEach(line => {
    if (!line.trim()) {
      lineMetrics.push({
        type: 'empty',
        height: Math.round(bodyFontSize * 0.75),
        width: 0,
        isMultiLineMath: false,
        mathRowCount: 1,
      });
      return;
    }

    let lineWidth = 0;
    let isMultiLineMath = false;
    let mathRowCount = 1;

    const parts = line.split(pattern);
    parts.forEach(part => {
      if (!part) return;
      if (
        (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) ||
        (part.startsWith('$') && part.endsWith('$') && part.length >= 2)
      ) {
        const isDouble = part.startsWith('$$');
        const formula = isDouble ? part.slice(2, -2) : part.slice(1, -1);
        const rows = (formula.match(/\\\\/g) || []).length + 1;
        if (rows > 1) {
          isMultiLineMath = true;
          mathRowCount = Math.max(mathRowCount, rows);
          lineWidth += Math.max(90, (formula.length / rows) * (bodyFontSize * 0.85) + 40);
        } else {
          lineWidth += Math.max(45, formula.length * (bodyFontSize * 0.65) + 20);
        }
      } else if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        const text = part.slice(2, -2);
        const zh = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const nonZh = text.length - zh;
        lineWidth += nonZh * (bodyFontSize * 0.62) + zh * (bodyFontSize * 1.05);
      } else if (
        part === '🟨' ||
        part === '🟡' ||
        part === '🟦' ||
        part === '🔵' ||
        part === '🟩' ||
        part === '🟢' ||
        part.startsWith('[■:')
      ) {
        lineWidth += bodyFontSize * 1.3 + 6;
      } else {
        const zh = (part.match(/[\u4e00-\u9fa5]/g) || []).length;
        const nonZh = part.length - zh;
        lineWidth += nonZh * (bodyFontSize * 0.58) + zh * (bodyFontSize * 1.0);
      }
    });

    if (lineWidth > maxLineWidth) {
      maxLineWidth = lineWidth;
    }

    lineMetrics.push({
      type: 'content',
      height: 0,
      width: lineWidth,
      isMultiLineMath,
      mathRowCount,
    });
  });

  // 2. Determine optimal card width
  const maxAllowableWidth = 640 * scaleMul;
  const minAllowableWidth = 280 * scaleMul;
  const idealContentWidth = Math.max(minAllowableWidth, Math.min(maxLineWidth, maxAllowableWidth));
  const cardWidth = Math.ceil(idealContentWidth + cardPadding * 2 + 16);
  const innerUsableWidth = Math.max(200, cardWidth - cardPadding * 2 - 12);

  // 3. Compute total content height considering wrapped lines
  const singleLineHeight = Math.round(bodyFontSize * 1.55);
  let totalContentHeight = 0;

  lineMetrics.forEach(m => {
    if (m.type === 'empty') {
      totalContentHeight += m.height;
      return;
    }

    if (m.isMultiLineMath) {
      const mathH = m.mathRowCount * Math.round(bodyFontSize * 1.7) + 18;
      totalContentHeight += mathH + 8;
    } else {
      const visualLines = Math.max(1, Math.ceil(m.width / innerUsableWidth));
      totalContentHeight += visualLines * singleLineHeight + 4;
    }
  });

  const headerHeight = Math.round(headerFontSize + 14 * scaleMul);
  const cardHeight = Math.ceil(cardPadding + headerHeight + totalContentHeight + cardPadding + 28 * scaleMul);

  return { cardWidth, cardHeight };
}

export function generateGraphSvg(
  nodes: GraphNode[],
  edges: GraphEdge[],
  settings: GraphSettings,
  pinnedNodeIds: Set<string>,
  pinnedEdgeIds: Set<string> = new Set(),
  vaultName = 'Linear Algebra NSU',
  includeWatermark = true
): string {
  if (nodes.length === 0) return '';

  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const defaultEdgeColor = settings.edgeColor || '#94a3b8';
  const defaultThickness = settings.edgeThickness || 1.2;
  const baseOpacity = settings.edgeOpacity || 0.35;

  // Base card styling from config
  const baseCardHeaderSize = defaultGraphConfig?.cardStyles?.headerFontSize || 16.5;
  const baseCardBodySize = defaultGraphConfig?.cardStyles?.bodyFontSize || 16.5;
  const baseCardPadding = defaultGraphConfig?.cardStyles?.cardPadding || 16;

  // 1. Initial bounding box of all nodes
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  nodes.forEach(n => {
    const r = n.radius || 16;
    if (n.x - r < minX) minX = n.x - r;
    if (n.x + r > maxX) maxX = n.x + r;
    if (n.y - r < minY) minY = n.y - r;
    if (n.y + r > maxY) maxY = n.y + r;
  });

  // 2. Expand bounding box to include all pinned node badges
  pinnedNodeIds.forEach(nodeId => {
    const node = nodeMap.get(nodeId);
    if (!node || node.infoBadge?.content === undefined || node.infoBadge.content === '') return;

    const scaleMul = node.badgeScale || node.infoBadge?.scale || 1.0;
    const bodyFontSize = baseCardBodySize * scaleMul;
    const headerFontSize = baseCardHeaderSize * scaleMul;
    const cardPadding = baseCardPadding * scaleMul;
    const nodeRadius = node.radius || 16;

    const headerTitle = `${node.labelEn}${node.labelCn && node.labelCn !== node.labelEn ? ` | ${node.labelCn}` : ''}`;
    const { cardWidth, cardHeight } = calculateAccurateCardDimensions(
      node.infoBadge.content,
      headerTitle,
      bodyFontSize,
      headerFontSize,
      cardPadding,
      scaleMul
    );

    const cardX = node.x + nodeRadius + 16;
    const cardY = node.y - 20;
    const cardRight = cardX + cardWidth;
    const cardBottom = cardY + cardHeight;

    if (cardX < minX) minX = cardX;
    if (cardRight > maxX) maxX = cardRight;
    if (cardY < minY) minY = cardY;
    if (cardBottom > maxY) maxY = cardBottom;
  });

  // 3. Expand bounding box to include all pinned edge badges
  pinnedEdgeIds.forEach(edgeId => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge || !edge.infoBadge?.content) return;

    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) return;

    const midX = (src.x + tgt.x) / 2;
    const midY = (src.y + tgt.y) / 2;

    const scaleMul =
      edge.badgeScale !== undefined
        ? edge.badgeScale
        : edge.infoBadge?.scale !== undefined
          ? edge.infoBadge.scale
          : 1.0;

    const bodyFontSize = baseCardBodySize * scaleMul;
    const headerFontSize = baseCardHeaderSize * scaleMul;
    const cardPadding = baseCardPadding * scaleMul;

    const firstNode = (src.weight || 0) >= (tgt.weight || 0) ? src : tgt;
    const secondNode = firstNode === src ? tgt : src;
    const edgeLang = edge.badgeLanguage || 'cn';
    const label1 = edgeLang === 'en' ? firstNode.labelEn : firstNode.labelCn || firstNode.labelEn;
    const label2 = edgeLang === 'en' ? secondNode.labelEn : secondNode.labelCn || secondNode.labelEn;
    const headerTitle = `${label1} ↔ ${label2}`;

    const { cardWidth, cardHeight } = calculateAccurateCardDimensions(
      edge.infoBadge.content,
      headerTitle,
      bodyFontSize,
      headerFontSize,
      cardPadding,
      scaleMul
    );

    const cardX = midX + 12 * scaleMul;
    const cardY = midY - cardHeight / 2;
    const cardRight = cardX + cardWidth;
    const cardBottom = cardY + cardHeight;

    if (cardX < minX) minX = cardX;
    if (cardRight > maxX) maxX = cardRight;
    if (cardY < minY) minY = cardY;
    if (cardBottom > maxY) maxY = cardBottom;
  });

  const padding = 250;
  const viewX = Math.floor(minX - padding);
  const viewY = Math.floor(minY - padding);
  const viewWidth = Math.ceil(maxX - minX + padding * 2);
  const viewHeight = Math.ceil(maxY - minY + padding * 2);

  // Watermark parameters (180% font size, consistent line spacing)
  const wmMultiplier = defaultGraphConfig?.watermark?.fontSizeMultiplier || 1.8;
  const wmLine1Size = (20 * wmMultiplier).toFixed(1); // 36px
  const wmLine2Size = (15 * wmMultiplier).toFixed(1); // 27px
  const wmLine3Size = (14 * wmMultiplier).toFixed(1); // 25.2px
  const wmLine4Size = (13 * wmMultiplier).toFixed(1); // 23.4px

  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewX} ${viewY} ${viewWidth} ${viewHeight}" width="${viewWidth}" height="${viewHeight}" style="background-color: #0a0d14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', sans-serif;">
  <title>${escapeXml(vaultName)}</title>
  <defs>
    <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <style>
      <![CDATA[
      ${processedKatexCss}
      .svg-card-overlay {
        box-sizing: border-box;
        background-color: rgba(10, 15, 29, 0.95);
        color: #e2e8f0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', sans-serif;
        line-height: 1.5;
        user-select: none;
        word-break: break-word;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6);
        overflow: visible;
      }
      .svg-card-header {
        font-weight: bold;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .svg-latex-span {
        display: inline-block;
        padding: 1px 5px;
        margin: 1px 0;
        border-radius: 4px;
        background-color: rgba(15, 23, 42, 0.9);
        color: #7dd3fc;
        vertical-align: middle;
      }
      .svg-square-tag {
        display: inline-block;
        border-radius: 2px;
        vertical-align: middle;
        margin: 0 2px;
        flex-shrink: 0;
      }
      ]]>
    </style>

    <!-- Diagonal Repeating Watermark Pattern (180% Font Size, 110% © symbol height, -30deg angle) -->
    <pattern id="diagonalWatermark" width="520" height="320" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
      <text x="30" y="60" font-size="${wmLine1Size}px" font-weight="900" fill="#ffffff" fill-opacity="0.08" letter-spacing="2.5px" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">LINEAR ALGEBRA</text>
      <text x="30" y="92" font-size="${wmLine2Size}px" font-weight="700" fill="#ffffff" fill-opacity="0.08" letter-spacing="1.5px" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">NOVOSIBIRSK STATE UNIVERSITY</text>
      <text x="30" y="120" font-size="${wmLine3Size}px" font-weight="600" fill="#ffffff" fill-opacity="0.08" letter-spacing="1.2px" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"><tspan font-size="110%">©</tspan> KORIAKIN R.A. <tspan font-size="110%">©</tspan> ULYANOV A.P.</text>
      <text x="30" y="146" font-size="${wmLine4Size}px" font-weight="600" fill="#ffffff" fill-opacity="0.08" letter-spacing="1px" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"><tspan font-size="110%">©</tspan> ALL RIGHTS RESERVED</text>
    </pattern>
  </defs>

  <!-- Background Layer -->
  <rect x="${viewX}" y="${viewY}" width="${viewWidth}" height="${viewHeight}" fill="#0a0d14" />
`;

  if (includeWatermark) {
    svgContent += `
  <!-- Diagonal Watermark Base Layer -->
  <rect x="${viewX}" y="${viewY}" width="${viewWidth}" height="${viewHeight}" fill="url(#diagonalWatermark)" pointer-events="none" />
`;
  }

  svgContent += `
  <!-- Graph Edges Layer -->
  <g id="edges">
`;

  // Draw Edges
  edges.forEach(edge => {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) return;

    const strokeColor = edge.color || defaultEdgeColor;
    const thickness = edge.thickness || defaultThickness;
    const isDashed = edge.style === 'dashed' || edge.lineStyle === 'dashed';
    const dashAttr = isDashed ? ' stroke-dasharray="8,6"' : '';

    const dx = tgt.x - src.x;
    const dy = tgt.y - src.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (settings.showCurvedEdges && dist > 1) {
      const curvatureFactor = edge.curvature || 0.18;
      const mx = (src.x + tgt.x) / 2;
      const my = (src.y + tgt.y) / 2;
      const nx = -dy / dist;
      const ny = dx / dist;
      const offsetDist = dist * curvatureFactor;
      const cx = mx + nx * offsetDist;
      const cy = my + ny * offsetDist;

      svgContent += `    <path d="M ${src.x.toFixed(1)} ${src.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${tgt.x.toFixed(1)} ${tgt.y.toFixed(1)}" fill="none" stroke="${strokeColor}" stroke-width="${thickness}" stroke-opacity="${baseOpacity}" stroke-linecap="round"${dashAttr} />\n`;
    } else {
      svgContent += `    <line x1="${src.x.toFixed(1)}" y1="${src.y.toFixed(1)}" x2="${tgt.x.toFixed(1)}" y2="${tgt.y.toFixed(1)}" stroke="${strokeColor}" stroke-width="${thickness}" stroke-opacity="${baseOpacity}" stroke-linecap="round"${dashAttr} />\n`;
    }
  });

  svgContent += `  </g>\n\n  <!-- Graph Nodes Layer -->\n  <g id="nodes">\n`;

  // Draw Nodes
  nodes.forEach(node => {
    const r = node.radius || 16;
    const color = node.color || '#38bdf8';

    svgContent += `    <!-- Node ${escapeXml(node.id)} -->\n`;
    svgContent += `    <circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" fill-opacity="0.25" filter="url(#nodeGlow)" />\n`;
    svgContent += `    <circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" />\n`;

    // 3D Sphere Highlight Reflection
    svgContent += `    <circle cx="${(node.x - r * 0.35).toFixed(1)}" cy="${(node.y - r * 0.35).toFixed(1)}" r="${(r * 0.4).toFixed(1)}" fill="#ffffff" fill-opacity="0.45" />\n`;

    // Information badge indicator badge (small amber dot if has note card)
    if (node.infoBadge?.content) {
      const dotRadius = Math.max(3.5, r * 0.22);
      const dotX = node.x + r * 0.72;
      const dotY = node.y - r * 0.72;
      svgContent += `    <circle cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="${dotRadius.toFixed(1)}" fill="#fbbf24" stroke="#0a0d14" stroke-width="1.5" />\n`;
    }

    // Node Labels
    const labelFontSize = Math.max(12, r * 0.85);
    const labelY = node.y + r + labelFontSize + 2;

    if (node.labelCn && node.labelCn !== node.labelEn) {
      svgContent += `    <text x="${node.x.toFixed(1)}" y="${labelY.toFixed(1)}" font-size="${labelFontSize.toFixed(1)}px" font-weight="bold" fill="#f8fafc" text-anchor="middle" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.8))">${escapeXml(node.labelEn)}</text>\n`;
      svgContent += `    <text x="${node.x.toFixed(1)}" y="${(labelY + labelFontSize * 0.95 + 1).toFixed(1)}" font-size="${(labelFontSize * 0.82).toFixed(1)}px" font-weight="normal" fill="#94a3b8" text-anchor="middle" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.8))">${escapeXml(node.labelCn)}</text>\n`;
    } else {
      svgContent += `    <text x="${node.x.toFixed(1)}" y="${labelY.toFixed(1)}" font-size="${labelFontSize.toFixed(1)}px" font-weight="bold" fill="#f8fafc" text-anchor="middle" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.8))">${escapeXml(node.labelEn)}</text>\n`;
    }
  });

  svgContent += `  </g>\n\n  <!-- Pinned Node Information Badges Layer (Rendered with HTML / KaTeX) -->\n  <g id="pinned-node-badges">\n`;

  // Draw Pinned Node Information Badges using foreignObject for full KaTeX math support
  pinnedNodeIds.forEach(nodeId => {
    const node = nodeMap.get(nodeId);
    if (!node || node.infoBadge?.content === undefined || node.infoBadge.content === '') return;

    const badgeRawContent = node.infoBadge.content;
    const nodeColor = node.color || '#38bdf8';
    const scaleMul = node.badgeScale || node.infoBadge?.scale || 1.0;
    const nodeRadius = node.radius || 16;

    const bodyFontSize = baseCardBodySize * scaleMul;
    const headerFontSize = baseCardHeaderSize * scaleMul;
    const cardPadding = baseCardPadding * scaleMul;

    const headerTitle = `${node.labelEn}${node.labelCn && node.labelCn !== node.labelEn ? ` | ${node.labelCn}` : ''}`;
    const { cardWidth, cardHeight } = calculateAccurateCardDimensions(
      badgeRawContent,
      headerTitle,
      bodyFontSize,
      headerFontSize,
      cardPadding,
      scaleMul
    );

    const cardX = node.x + nodeRadius + 16;
    const cardY = node.y - 20;

    // Connector dashed line
    svgContent += `    <line x1="${(node.x + nodeRadius * 0.7).toFixed(1)}" y1="${(node.y - nodeRadius * 0.7).toFixed(1)}" x2="${cardX.toFixed(1)}" y2="${(cardY + cardPadding + headerFontSize / 2).toFixed(1)}" stroke="${nodeColor}" stroke-width="${(1.4 * scaleMul).toFixed(1)}" stroke-dasharray="3,2" />\n`;

    const cardBodyHtml = renderCardBodyHtml(badgeRawContent, bodyFontSize);

    // Card foreignObject with full height and KaTeX support
    svgContent += `    <foreignObject x="${cardX.toFixed(1)}" y="${cardY.toFixed(1)}" width="${cardWidth.toFixed(1)}" height="${cardHeight.toFixed(1)}" style="overflow: visible;">
      <div xmlns="http://www.w3.org/1999/xhtml" class="svg-card-overlay" style="width: 100%; min-height: 100%; border: 1.5px solid ${nodeColor}; border-radius: ${(8 * scaleMul).toFixed(1)}px; padding: ${cardPadding.toFixed(1)}px; box-sizing: border-box; overflow: visible;">
        <div class="svg-card-header" style="font-size: ${headerFontSize.toFixed(1)}px; color: ${nodeColor}; padding-bottom: ${(4 * scaleMul).toFixed(1)}px; margin-bottom: ${(6 * scaleMul).toFixed(1)}px;">
          ${escapeXml(headerTitle)}
        </div>
        <div style="font-size: ${bodyFontSize.toFixed(1)}px; overflow: visible;">
          ${cardBodyHtml}
        </div>
      </div>
    </foreignObject>\n`;
  });

  svgContent += `  </g>\n\n  <!-- Pinned Edge Information Badges Layer (Rectangular rx=0) -->\n  <g id="pinned-edge-badges">\n`;

  // Draw Pinned Edge Information Badges
  pinnedEdgeIds.forEach(edgeId => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge || !edge.infoBadge?.content) return;

    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) return;

    const strokeColor = edge.color || defaultEdgeColor;
    const midX = (src.x + tgt.x) / 2;
    const midY = (src.y + tgt.y) / 2;

    const scaleMul =
      edge.badgeScale !== undefined
        ? edge.badgeScale
        : edge.infoBadge?.scale !== undefined
          ? edge.infoBadge.scale
          : 1.0;

    const bodyFontSize = baseCardBodySize * scaleMul;
    const headerFontSize = baseCardHeaderSize * scaleMul;
    const cardPadding = baseCardPadding * scaleMul;

    const firstNode = (src.weight || 0) >= (tgt.weight || 0) ? src : tgt;
    const secondNode = firstNode === src ? tgt : src;
    const edgeLang = edge.badgeLanguage || 'cn';
    const label1 = edgeLang === 'en' ? firstNode.labelEn : firstNode.labelCn || firstNode.labelEn;
    const label2 = edgeLang === 'en' ? secondNode.labelEn : secondNode.labelCn || secondNode.labelEn;
    const headerTitle = `${label1} ↔ ${label2}`;

    const { cardWidth, cardHeight } = calculateAccurateCardDimensions(
      edge.infoBadge.content,
      headerTitle,
      bodyFontSize,
      headerFontSize,
      cardPadding,
      scaleMul
    );

    const cardX = midX + 12 * scaleMul;
    const cardY = midY - cardHeight / 2;

    // Connector dashed line
    svgContent += `    <line x1="${midX.toFixed(1)}" y1="${midY.toFixed(1)}" x2="${cardX.toFixed(1)}" y2="${(cardY + cardPadding + headerFontSize / 2).toFixed(1)}" stroke="${strokeColor}" stroke-width="${(1.4 * scaleMul).toFixed(1)}" stroke-dasharray="2,2" />\n`;

    const cardBodyHtml = renderCardBodyHtml(edge.infoBadge.content, bodyFontSize);

    // Rectangular card foreignObject (rx="0")
    svgContent += `    <foreignObject x="${cardX.toFixed(1)}" y="${cardY.toFixed(1)}" width="${cardWidth.toFixed(1)}" height="${cardHeight.toFixed(1)}" style="overflow: visible;">
      <div xmlns="http://www.w3.org/1999/xhtml" class="svg-card-overlay" style="width: 100%; min-height: 100%; border: 1.5px solid ${strokeColor}; border-radius: 0px; padding: ${cardPadding.toFixed(1)}px; box-sizing: border-box; overflow: visible;">
        <div class="svg-card-header" style="font-size: ${headerFontSize.toFixed(1)}px; color: ${strokeColor}; padding-bottom: ${(4 * scaleMul).toFixed(1)}px; margin-bottom: ${(6 * scaleMul).toFixed(1)}px;">
          ${escapeXml(headerTitle)}
        </div>
        <div style="font-size: ${bodyFontSize.toFixed(1)}px; overflow: visible;">
          ${cardBodyHtml}
        </div>
      </div>
    </foreignObject>\n`;
  });

  if (includeWatermark) {
    svgContent += `  </g>\n\n  <!-- Diagonal Watermark Foreground Transparent Layer -->\n  <rect x="${viewX}" y="${viewY}" width="${viewWidth}" height="${viewHeight}" fill="url(#diagonalWatermark)" pointer-events="none" />\n</svg>`;
  } else {
    svgContent += `  </g>\n</svg>`;
  }

  return svgContent;
}

export function downloadGraphAsSvg(
  nodes: GraphNode[],
  edges: GraphEdge[],
  settings: GraphSettings,
  pinnedNodeIds: Set<string>,
  pinnedEdgeIds: Set<string> = new Set(),
  vaultName = 'Linear Algebra NSU',
  includeWatermark = true
) {
  const svgText = generateGraphSvg(nodes, edges, settings, pinnedNodeIds, pinnedEdgeIds, vaultName, includeWatermark);
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `graph-${vaultName.toLowerCase().replace(/[^a-z0-9]/g, '_')}-${new Date().toISOString().slice(0, 10)}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}
