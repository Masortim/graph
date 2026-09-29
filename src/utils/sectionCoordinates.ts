import type { GraphNode } from '../types/graph';

export interface SectionCoord {
  labelEn: string;
  x: number;
  y: number;
}

export const DEFAULT_SECTION_COORDINATES_TEXT = `Linear Independence & Span:320:220
Basis and Dimension:520:220
Gaussian Elimination & Rank:320:440
Determinants & Inverses:520:440
Eigenvalues & Eigenvectors:760:220
Diagonalization & Jordan Normal Form:960:220
Gram-Schmidt Orthogonalization:320:640
Singular Value Decomposition (SVD):520:640
Sylvester Criterion & Positive Definiteness:760:640
Principal Axis Theorem:960:640`;

export function parseSectionCoordinates(text: string): Map<string, { x: number; y: number }> {
  const map = new Map<string, { x: number; y: number }>();
  if (!text) return map;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
    const parts = trimmed.split(':');
    if (parts.length >= 3) {
      const labelEn = parts[0].trim().toLowerCase();
      const x = parseFloat(parts[1].trim());
      const y = parseFloat(parts[2].trim());
      if (!isNaN(x) && !isNaN(y)) {
        map.set(labelEn, { x, y });
      }
    }
  }
  return map;
}

export function applySectionCoordinates(nodes: GraphNode[], coordinatesText: string): GraphNode[] {
  const coordMap = parseSectionCoordinates(coordinatesText);
  if (coordMap.size === 0) return nodes;

  return nodes.map(node => {
    if (node.type === 'section') {
      const coord = coordMap.get(node.labelEn.toLowerCase());
      if (coord) {
        return {
          ...node,
          x: coord.x,
          y: coord.y,
          vx: 0,
          vy: 0,
          isFixed: true,
        };
      }
    }
    return node;
  });
}

export function formatSectionCoordinates(nodes: GraphNode[]): string {
  const sectionNodes = nodes.filter(n => n.type === 'section');
  return sectionNodes.map(n => {
    return `${n.labelEn}:${Math.round(n.x)}:${Math.round(n.y)}`;
  }).join('\n');
}
