import type { GraphNode, GraphEdge, GraphSettings } from '../types/graph';
import { formatBadgeContent } from './badgeFormatter';
import { latexToCanvasText } from './latexRenderer';
import defaultGraphConfig from '../data/graphConfig.json';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

  // Base card styling from config (Header -25%, Body +50%)
  const baseCardHeaderSize = defaultGraphConfig?.cardStyles?.headerFontSize || 16.5;
  const baseCardBodySize = defaultGraphConfig?.cardStyles?.bodyFontSize || 16.5;
  const baseLineHeight = defaultGraphConfig?.cardStyles?.lineHeight || 24;
  const baseCardPadding = defaultGraphConfig?.cardStyles?.cardPadding || 16;

  // 1. Initial bounding box of all nodes
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    const r = n.radius || 16;
    if (n.x - r < minX) minX = n.x - r;
    if (n.x + r > maxX) maxX = n.x + r;
    if (n.y - r < minY) minY = n.y - r;
    if (n.y + r > maxY) maxY = n.y + r;
  });

  // 2. Expand bounding box to include all pinned node badges (Fixes SVG right/bottom edge clipping bug)
  pinnedNodeIds.forEach(nodeId => {
    const node = nodeMap.get(nodeId);
    if (!node || node.infoBadge?.content === undefined || node.infoBadge.content === '') return;

    const scaleMul = node.badgeScale || node.infoBadge?.scale || 1.0;
    const bodyFontSize = baseCardBodySize * scaleMul;
    const headerFontSize = baseCardHeaderSize * scaleMul;
    const lineHeight = baseLineHeight * scaleMul;
    const cardPadding = baseCardPadding * scaleMul;
    const nodeRadius = node.radius || 16;

    const { lines: formattedLines, maxLineWidth } = formatBadgeContent(node.infoBadge.content, undefined, bodyFontSize);
    const headerTitle = `${node.labelEn}${node.labelCn && node.labelCn !== node.labelEn ? ` | ${node.labelCn}` : ''}`;
    const headerWidth = headerTitle.length * (headerFontSize * 0.58);
    const headerHeight = headerFontSize + 6 * scaleMul;

    const contentWidth = Math.max(headerWidth, maxLineWidth);
    const cardWidth = Math.max(160 * scaleMul, contentWidth + cardPadding * 2);
    const cardHeight = cardPadding + headerHeight + formattedLines.length * lineHeight + cardPadding;

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

    const scaleMul = edge.badgeScale !== undefined 
      ? edge.badgeScale 
      : (edge.infoBadge?.scale !== undefined ? edge.infoBadge.scale : 1.0);

    const bodyFontSize = baseCardBodySize * scaleMul;
    const headerFontSize = baseCardHeaderSize * scaleMul;
    const lineHeight = baseLineHeight * scaleMul;
    const cardPadding = baseCardPadding * scaleMul;

    const firstNode = (src.weight || 0) >= (tgt.weight || 0) ? src : tgt;
    const secondNode = firstNode === src ? tgt : src;
    const edgeLang = edge.badgeLanguage || 'cn';
    const label1 = edgeLang === 'en' ? firstNode.labelEn : (firstNode.labelCn || firstNode.labelEn);
    const label2 = edgeLang === 'en' ? secondNode.labelEn : (secondNode.labelCn || secondNode.labelEn);
    const headerTitle = `${label1} ↔ ${label2}`;

    const headerWidth = headerTitle.length * (headerFontSize * 0.58);
    const headerHeight = headerFontSize + 6 * scaleMul;
    const maxWrapWidth = Math.max(180 * scaleMul, headerWidth);

    const { lines: formattedLines, maxLineWidth } = formatBadgeContent(edge.infoBadge.content, undefined, bodyFontSize, maxWrapWidth);
    const contentWidth = Math.max(headerWidth, maxLineWidth);
    const cardWidth = Math.max(160 * scaleMul, contentWidth + cardPadding * 2);
    const cardHeight = cardPadding + headerHeight + formattedLines.length * lineHeight + cardPadding;

    const cardX = midX + 12 * scaleMul;
    const cardY = midY - cardHeight / 2;
    const cardRight = cardX + cardWidth;
    const cardBottom = cardY + cardHeight;

    if (cardX < minX) minX = cardX;
    if (cardRight > maxX) maxX = cardRight;
    if (cardY < minY) minY = cardY;
    if (cardBottom > maxY) maxY = cardBottom;
  });

  const padding = 200;
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

    svgContent += `    <circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${r}" fill="${color}" />\n`;
  });

  svgContent += `  </g>\n\n  <!-- Graph Labels Layer -->\n  <g id="labels">\n`;

  // Draw Bilingual Labels
  if (settings.showLabels) {
    nodes.forEach(node => {
      const r = node.radius || 16;
      const fontSizeEn = Math.max(10, Math.min(22, r * 0.52));
      const fontSizeCn = Math.max(9, fontSizeEn * 0.85);
      const labelY = node.y + r + 4;

      const enText = escapeXml(node.labelEn || 'Untitled');
      const cnText = escapeXml(node.labelCn || '');

      svgContent += `    <text x="${node.x.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="${fontSizeEn}px" font-weight="600" fill="#f8fafc" style="paint-order: stroke; stroke: #0a0d14; stroke-width: 3px; stroke-linejoin: round;">${enText}</text>\n`;

      if (cnText && cnText !== enText) {
        svgContent += `    <text x="${node.x.toFixed(1)}" y="${(labelY + fontSizeEn + 2).toFixed(1)}" text-anchor="middle" font-size="${fontSizeCn}px" font-weight="400" fill="#93c5fd" style="paint-order: stroke; stroke: #0a0d14; stroke-width: 3px; stroke-linejoin: round;">${cnText}</text>\n`;
      }
    });
  }

  svgContent += `  </g>\n\n  <!-- Pinned Node Information Badges Layer -->\n  <g id="pinned-node-badges">\n`;

  // Draw Pinned Node Information Badges
  pinnedNodeIds.forEach(nodeId => {
    const node = nodeMap.get(nodeId);
    if (!node || node.infoBadge?.content === undefined || node.infoBadge.content === '') return;

    const badgeRawContent = node.infoBadge.content;
    const nodeRadius = node.radius || 16;
    
    const scaleMul = node.badgeScale || node.infoBadge?.scale || 1.0;
    const bodyFontSize = baseCardBodySize * scaleMul;
    const headerFontSize = baseCardHeaderSize * scaleMul;
    const lineHeight = baseLineHeight * scaleMul;
    const sqSize = bodyFontSize * 1.25;
    const cardPadding = baseCardPadding * scaleMul;

    const { lines: formattedLines, maxLineWidth } = formatBadgeContent(badgeRawContent, undefined, bodyFontSize);

    const headerTitle = `${node.labelEn}${node.labelCn && node.labelCn !== node.labelEn ? ` | ${node.labelCn}` : ''}`;
    const headerWidth = headerTitle.length * (headerFontSize * 0.58);
    const headerHeight = headerFontSize + 6 * scaleMul;

    const contentWidth = Math.max(headerWidth, maxLineWidth);
    const cardWidth = Math.max(160 * scaleMul, contentWidth + cardPadding * 2);
    const cardHeight = cardPadding + headerHeight + formattedLines.length * lineHeight + cardPadding;

    const cardX = node.x + nodeRadius + 16;
    const cardY = node.y - 20;

    // Connector dashed line
    svgContent += `    <line x1="${(node.x + nodeRadius * 0.7).toFixed(1)}" y1="${(node.y - nodeRadius * 0.7).toFixed(1)}" x2="${cardX.toFixed(1)}" y2="${(cardY + cardPadding + headerFontSize / 2).toFixed(1)}" stroke="${node.color}" stroke-width="${(1.4 * scaleMul).toFixed(1)}" stroke-dasharray="3,2" />\n`;

    // Card background
    svgContent += `    <rect x="${cardX.toFixed(1)}" y="${cardY.toFixed(1)}" width="${cardWidth.toFixed(1)}" height="${cardHeight.toFixed(1)}" rx="${(8 * scaleMul).toFixed(1)}" ry="${(8 * scaleMul).toFixed(1)}" fill="#0f172a" fill-opacity="0.95" stroke="${node.color}" stroke-width="${(1.8 * scaleMul).toFixed(1)}" />\n`;

    // Header title
    svgContent += `    <text x="${(cardX + cardPadding).toFixed(1)}" y="${(cardY + cardPadding + headerFontSize * 0.85).toFixed(1)}" font-size="${headerFontSize.toFixed(1)}px" font-weight="bold" fill="${node.color}">${escapeXml(headerTitle)}</text>\n`;

    // Header Separator Line
    const sepY = cardY + cardPadding + headerFontSize + 4 * scaleMul;
    svgContent += `    <line x1="${(cardX + cardPadding).toFixed(1)}" y1="${sepY.toFixed(1)}" x2="${(cardX + cardWidth - cardPadding).toFixed(1)}" y2="${sepY.toFixed(1)}" stroke="${node.color}" stroke-opacity="0.3" stroke-width="${(1 * scaleMul).toFixed(1)}" />\n`;

    // Formatted content lines
    const linesStartY = sepY + 6 * scaleMul;
    formattedLines.forEach((line, lineIdx) => {
      let curX = cardX + cardPadding;
      const lineY = linesStartY + lineIdx * lineHeight;

      line.segments.forEach(seg => {
        if (seg.type === 'square') {
          const sqY = lineY - (sqSize - bodyFontSize) / 2 - 1;
          svgContent += `    <rect x="${curX.toFixed(1)}" y="${sqY.toFixed(1)}" width="${sqSize.toFixed(1)}" height="${sqSize.toFixed(1)}" rx="${(2 * scaleMul).toFixed(1)}" ry="${(2 * scaleMul).toFixed(1)}" fill="${seg.squareColor || '#fbbf24'}" />\n`;
          curX += sqSize + 4 * scaleMul;
        } else if (seg.type === 'latex') {
          const mathTxt = latexToCanvasText(seg.text || '');
          svgContent += `    <text x="${curX.toFixed(1)}" y="${(lineY + bodyFontSize * 0.85).toFixed(1)}" font-size="${bodyFontSize.toFixed(1)}px" font-style="italic" fill="#7dd3fc">${escapeXml(mathTxt)}</text>\n`;
          curX += mathTxt.length * (bodyFontSize * 0.62) + 3;
        } else if (seg.type === 'bold') {
          svgContent += `    <text x="${curX.toFixed(1)}" y="${(lineY + bodyFontSize * 0.85).toFixed(1)}" font-size="${bodyFontSize.toFixed(1)}px" font-weight="bold" fill="#ffffff">${escapeXml(seg.text || '')}</text>\n`;
          curX += (seg.width || (seg.text?.length || 0) * (bodyFontSize * 0.62));
        } else {
          svgContent += `    <text x="${curX.toFixed(1)}" y="${(lineY + bodyFontSize * 0.85).toFixed(1)}" font-size="${bodyFontSize.toFixed(1)}px" font-weight="normal" fill="#e2e8f0">${escapeXml(seg.text || '')}</text>\n`;
          curX += (seg.width || (seg.text?.length || 0) * (bodyFontSize * 0.58));
        }
      });
    });
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

    const scaleMul = edge.badgeScale !== undefined 
      ? edge.badgeScale 
      : (edge.infoBadge?.scale !== undefined ? edge.infoBadge.scale : 1.0);

    const bodyFontSize = baseCardBodySize * scaleMul;
    const headerFontSize = baseCardHeaderSize * scaleMul;
    const lineHeight = baseLineHeight * scaleMul;
    const sqSize = bodyFontSize * 1.25;
    const cardPadding = baseCardPadding * scaleMul;

    const firstNode = (src.weight || 0) >= (tgt.weight || 0) ? src : tgt;
    const secondNode = firstNode === src ? tgt : src;

    const edgeLang = edge.badgeLanguage || 'cn';
    const label1 = edgeLang === 'en' ? firstNode.labelEn : (firstNode.labelCn || firstNode.labelEn);
    const label2 = edgeLang === 'en' ? secondNode.labelEn : (secondNode.labelCn || secondNode.labelEn);
    const headerTitle = `${label1} ↔ ${label2}`;

    const headerWidth = headerTitle.length * (headerFontSize * 0.58);
    const headerHeight = headerFontSize + 6 * scaleMul;
    const maxWrapWidth = Math.max(180 * scaleMul, headerWidth);

    const { lines: formattedLines, maxLineWidth } = formatBadgeContent(edge.infoBadge.content, undefined, bodyFontSize, maxWrapWidth);

    const contentWidth = Math.max(headerWidth, maxLineWidth);
    const cardWidth = Math.max(160 * scaleMul, contentWidth + cardPadding * 2);
    const cardHeight = cardPadding + headerHeight + formattedLines.length * lineHeight + cardPadding;

    const cardX = midX + 12 * scaleMul;
    const cardY = midY - cardHeight / 2;

    // Connector dashed line
    svgContent += `    <line x1="${midX.toFixed(1)}" y1="${midY.toFixed(1)}" x2="${cardX.toFixed(1)}" y2="${(cardY + cardPadding + headerFontSize / 2).toFixed(1)}" stroke="${strokeColor}" stroke-width="${(1.4 * scaleMul).toFixed(1)}" stroke-dasharray="2,2" />\n`;

    // Rectangular card background (rx="0")
    svgContent += `    <rect x="${cardX.toFixed(1)}" y="${cardY.toFixed(1)}" width="${cardWidth.toFixed(1)}" height="${cardHeight.toFixed(1)}" rx="0" ry="0" fill="#0f172a" fill-opacity="0.95" stroke="${strokeColor}" stroke-width="${(1.8 * scaleMul).toFixed(1)}" />\n`;

    // Header title
    svgContent += `    <text x="${(cardX + cardPadding).toFixed(1)}" y="${(cardY + cardPadding + headerFontSize * 0.85).toFixed(1)}" font-size="${headerFontSize.toFixed(1)}px" font-weight="bold" fill="${strokeColor}">${escapeXml(headerTitle)}</text>\n`;

    // Header Separator Line
    const sepY = cardY + cardPadding + headerFontSize + 4 * scaleMul;
    svgContent += `    <line x1="${(cardX + cardPadding).toFixed(1)}" y1="${sepY.toFixed(1)}" x2="${(cardX + cardWidth - cardPadding).toFixed(1)}" y2="${sepY.toFixed(1)}" stroke="${strokeColor}" stroke-opacity="0.3" stroke-width="${(1 * scaleMul).toFixed(1)}" />\n`;

    // Formatted content lines
    const linesStartY = sepY + 6 * scaleMul;
    formattedLines.forEach((line, lineIdx) => {
      let curX = cardX + cardPadding;
      const lineY = linesStartY + lineIdx * lineHeight;

      line.segments.forEach(seg => {
        if (seg.type === 'square') {
          const sqY = lineY - (sqSize - bodyFontSize) / 2 - 1;
          svgContent += `    <rect x="${curX.toFixed(1)}" y="${sqY.toFixed(1)}" width="${sqSize.toFixed(1)}" height="${sqSize.toFixed(1)}" fill="${seg.squareColor || '#fbbf24'}" />\n`;
          curX += sqSize + 4 * scaleMul;
        } else if (seg.type === 'latex') {
          const mathTxt = latexToCanvasText(seg.text || '');
          svgContent += `    <text x="${curX.toFixed(1)}" y="${(lineY + bodyFontSize * 0.85).toFixed(1)}" font-size="${bodyFontSize.toFixed(1)}px" font-style="italic" fill="#7dd3fc">${escapeXml(mathTxt)}</text>\n`;
          curX += mathTxt.length * (bodyFontSize * 0.62) + 3 * scaleMul;
        } else if (seg.type === 'bold') {
          svgContent += `    <text x="${curX.toFixed(1)}" y="${(lineY + bodyFontSize * 0.85).toFixed(1)}" font-size="${bodyFontSize.toFixed(1)}px" font-weight="bold" fill="#ffffff">${escapeXml(seg.text || '')}</text>\n`;
          curX += (seg.width || (seg.text?.length || 0) * (bodyFontSize * 0.62));
        } else {
          svgContent += `    <text x="${curX.toFixed(1)}" y="${(lineY + bodyFontSize * 0.85).toFixed(1)}" font-size="${bodyFontSize.toFixed(1)}px" font-weight="normal" fill="#e2e8f0">${escapeXml(seg.text || '')}</text>\n`;
          curX += (seg.width || (seg.text?.length || 0) * (bodyFontSize * 0.58));
        }
      });
    });
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
