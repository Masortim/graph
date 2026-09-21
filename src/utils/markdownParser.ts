import type { GraphNode, GraphEdge, ObsidianFileRaw } from '../types/graph';
import { sizeLevelToRadius } from './nodeMetrics';

// Palette for chapters / clusters (Gephi-inspired vibrant neon & pastel palette)
export const CHAPTER_PALETTE = [
  '#38bdf8', // Cyan / Light Blue
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber / Gold
  '#10b981', // Emerald / Mint
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f43f5e', // Rose
  '#84cc16', // Lime
  '#06b6d4', // Sky
];

export function parseBilingualTitle(rawTitle: string): { en: string; cn: string } {
  const clean = rawTitle.replace(/\.md$/i, '').trim();
  
  // Pattern 1: English | 中文
  if (clean.includes('|')) {
    const parts = clean.split('|');
    return { en: parts[0].trim(), cn: parts[1]?.trim() || parts[0].trim() };
  }
  
  // Pattern 2: English (中文) or English（中文）
  const parenMatch = clean.match(/^(.+?)[（\(]([\u4e00-\u9fa5\s\w]+)[）\)]$/);
  if (parenMatch) {
    return { en: parenMatch[1].trim(), cn: parenMatch[2].trim() };
  }
  
  // Pattern 3: If already contains Chinese characters
  const hasChinese = /[\u4e00-\u9fa5]/.test(clean);
  if (hasChinese) {
    return { en: clean, cn: clean };
  }
  
  return { en: clean, cn: clean };
}

export interface ParsedVault {
  nodes: GraphNode[];
  edges: GraphEdge[];
  chaptersCount: number;
  sectionsCount: number;
  subsectionsCount: number;
}

export function parseObsidianVault(files: ObsidianFileRaw[]): ParsedVault {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  
  const chapterMap = new Map<string, GraphNode>();
  let chapterColorIndex = 0;

  files.forEach((file) => {
    // 1. Process Chapter (Level 1, default size 8)
    const chapterName = file.chapter || 'Main Notes';
    let chapterNode = chapterMap.get(chapterName);
    
    if (!chapterNode) {
      const { en, cn } = parseBilingualTitle(chapterName);
      const chapterId = `chap_${nodes.length + 1}_${chapterName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const color = CHAPTER_PALETTE[chapterColorIndex % CHAPTER_PALETTE.length];
      chapterColorIndex++;
      
      const chapterRadius = sizeLevelToRadius(8);
      chapterNode = {
        id: chapterId,
        labelEn: en,
        labelCn: cn,
        type: 'chapter',
        level: 1,
        clusterId: chapterId,
        x: (Math.random() - 0.5) * 600,
        y: (Math.random() - 0.5) * 600,
        vx: 0,
        vy: 0,
        sizeLevel: 8,
        radius: chapterRadius,
        baseRadius: chapterRadius,
        weight: 15,
        color: color,
        rawText: `Chapter: ${chapterName}`,
        connectedCount: 0,
        frequency: 0,
      };
      
      chapterMap.set(chapterName, chapterNode);
      nodes.push(chapterNode);
    }
    
    // 2. Process Section (Level 2 - Note, Requirement 3c: default size 7)
    const sectionTitle = file.fileName.replace(/\.md$/i, '');
    const { en: secEn, cn: secCn } = parseBilingualTitle(sectionTitle);
    const sectionId = `sec_${nodes.length + 1}_${sectionTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    
    // Parse markdown content for #### subheadings and initial text
    const lines = file.content.split(/\r?\n/);
    const sectionIntroLines: string[] = [];
    const subsections: { title: string; textLines: string[] }[] = [];
    
    let currentSubSec: { title: string; textLines: string[] } | null = null;
    
    for (const line of lines) {
      const headingMatch = line.match(/^#{4}\s+(.+)$/);
      
      if (headingMatch) {
        if (currentSubSec) {
          subsections.push(currentSubSec);
        }
        currentSubSec = {
          title: headingMatch[1].trim(),
          textLines: [],
        };
      } else if (currentSubSec) {
        currentSubSec.textLines.push(line);
      } else {
        sectionIntroLines.push(line);
      }
    }
    
    if (currentSubSec) {
      subsections.push(currentSubSec);
    }
    
    const sectionText = sectionIntroLines.join('\n').trim();
    const sectionRadius = sizeLevelToRadius(7);
    
    const sectionNode: GraphNode = {
      id: sectionId,
      labelEn: secEn,
      labelCn: secCn,
      type: 'section',
      level: 2,
      parentId: chapterNode.id,
      chapterId: chapterNode.id,
      filePath: file.path,
      clusterId: chapterNode.clusterId,
      x: chapterNode.x + (Math.random() - 0.5) * 120,
      y: chapterNode.y + (Math.random() - 0.5) * 120,
      vx: 0,
      vy: 0,
      sizeLevel: 7,
      radius: sectionRadius,
      baseRadius: sectionRadius,
      weight: 10,
      color: chapterNode.color,
      rawText: sectionText || `Section: ${sectionTitle}`,
      connectedCount: 0,
      frequency: 0,
    };
    
    nodes.push(sectionNode);
    
    // Hierarchical Edge: Chapter -> Section
    edges.push({
      id: `edge_${chapterNode.id}_${sectionNode.id}`,
      source: chapterNode.id,
      target: sectionNode.id,
      type: 'hierarchy',
      weight: 4,
      curvature: 0.15,
      color: '#94a3b8',
    });
    
    // 3. Process Subsections (Level 3 - #### Headings, Requirement 3c: default size 3)
    const subsecRadius = sizeLevelToRadius(3);
    subsections.forEach((sub, subIdx) => {
      const { en: subEn, cn: subCn } = parseBilingualTitle(sub.title);
      const subId = `subsec_${nodes.length + 1}_${subIdx + 1}_${sub.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const subText = sub.textLines.join('\n').trim();
      
      const subNode: GraphNode = {
        id: subId,
        labelEn: subEn,
        labelCn: subCn,
        type: 'subsection',
        level: 3,
        parentId: sectionNode.id,
        chapterId: chapterNode.id,
        sectionId: sectionNode.id,
        filePath: file.path,
        clusterId: chapterNode.clusterId,
        x: sectionNode.x + (Math.random() - 0.5) * 80,
        y: sectionNode.y + (Math.random() - 0.5) * 80,
        vx: 0,
        vy: 0,
        sizeLevel: 3,
        radius: subsecRadius,
        baseRadius: subsecRadius,
        weight: 6,
        color: chapterNode.color,
        rawText: subText || `Subsection: ${sub.title}`,
        connectedCount: 0,
        frequency: 0,
      };
      
      nodes.push(subNode);
      
      // Hierarchical Edge: Section -> Subsection
      edges.push({
        id: `edge_${sectionNode.id}_${subNode.id}`,
        source: sectionNode.id,
        target: subNode.id,
        type: 'hierarchy',
        weight: 2,
        curvature: 0.1,
        color: '#94a3b8',
      });
    });
  });

  // Calculate initial degree / connections
  nodes.forEach(node => {
    node.connectedCount = edges.filter(e => e.source === node.id || e.target === node.id).length;
  });

  return {
    nodes,
    edges,
    chaptersCount: chapterMap.size,
    sectionsCount: nodes.filter(n => n.type === 'section').length,
    subsectionsCount: nodes.filter(n => n.type === 'subsection').length,
  };
}

// Reloads a vault while preserving all custom concept nodes, merged nodes, custom labels, manual edges, sizes, and info badges
export function reloadVaultPreservingState(
  newFiles: ObsidianFileRaw[],
  existingNodes: GraphNode[],
  existingEdges: GraphEdge[] = []
): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  chaptersCount: number;
  sectionsCount: number;
  subsectionsCount: number;
  preservedConceptsCount: number;
} {
  const { nodes: newHierarchyNodes, edges: newHierarchyEdges, chaptersCount, sectionsCount, subsectionsCount } = parseObsidianVault(newFiles);

  const customNodes = existingNodes.filter(n => n.type === 'concept' || n.type === 'merged' || n.isCustomOrEdited);

  // Set of deleted edge keys across the graph
  const deletedKeysSet = new Set<string>();
  existingNodes.forEach(n => {
    if (n.deletedEdgeKeys) {
      n.deletedEdgeKeys.forEach(k => deletedKeysSet.add(k));
    }
  });

  // Preserve custom labels, colors, sizes, and info badges matching existing nodes
  const existingMap = new Map<string, GraphNode>();
  existingNodes.forEach(n => {
    existingMap.set(n.labelEn.trim().toLowerCase(), n);
    if (n.filePath) existingMap.set(n.filePath.toLowerCase(), n);
    if (n.id) existingMap.set(n.id, n);
  });

  newHierarchyNodes.forEach(newNode => {
    const matched = (newNode.filePath && existingMap.get(newNode.filePath.toLowerCase())) ||
                    existingMap.get(newNode.labelEn.trim().toLowerCase());
    if (matched) {
      if (matched.labelCn && matched.labelCn !== matched.labelEn) {
        newNode.labelCn = matched.labelCn;
      }
      if (matched.infoBadge) {
        newNode.infoBadge = matched.infoBadge;
      }
      if (matched.color) {
        newNode.color = matched.color;
      }
      if (matched.customSizeLevel !== undefined) {
        newNode.customSizeLevel = matched.customSizeLevel;
        newNode.radius = sizeLevelToRadius(matched.customSizeLevel);
      }
      if (matched.originalLabelEn) {
        newNode.originalLabelEn = matched.originalLabelEn;
      }
      if (matched.originalLabelCn) {
        newNode.originalLabelCn = matched.originalLabelCn;
      }
      if (matched.deletedEdgeKeys) {
        newNode.deletedEdgeKeys = matched.deletedEdgeKeys;
      }
      if (matched.keyPhrases) {
        newNode.keyPhrases = matched.keyPhrases;
      }
      if (matched.frequency !== undefined) {
        newNode.frequency = matched.frequency;
      }
    }
  });

  // Filter out hierarchy edges that user explicitly deleted
  const filteredHierarchyEdges = newHierarchyEdges.filter(edge => {
    const key = [edge.source, edge.target].sort().join('<->');
    return !deletedKeysSet.has(key);
  });

  const finalNodes = [...newHierarchyNodes];
  const finalEdges = [...filteredHierarchyEdges];
  const finalNodeIds = new Set(finalNodes.map(n => n.id));

  // Re-connect custom nodes
  customNodes.forEach(customNode => {
    if (!finalNodeIds.has(customNode.id)) {
      finalNodes.push(customNode);
      finalNodeIds.add(customNode.id);
    }
  });

  // Preserve manual edges
  existingEdges.forEach(edge => {
    if (edge.isManual) {
      if (finalNodeIds.has(edge.source) && finalNodeIds.has(edge.target)) {
        const key = [edge.source, edge.target].sort().join('<->');
        if (!deletedKeysSet.has(key)) {
          const alreadyExists = finalEdges.some(e => 
            (e.source === edge.source && e.target === edge.target) ||
            (e.source === edge.target && e.target === edge.source)
          );
          if (!alreadyExists) {
            finalEdges.push(edge);
          }
        }
      }
    }
  });

  finalNodes.forEach(n => {
    n.connectedCount = finalEdges.filter(e => e.source === n.id || e.target === n.id).length;
  });

  return {
    nodes: finalNodes,
    edges: finalEdges,
    chaptersCount,
    sectionsCount,
    subsectionsCount,
    preservedConceptsCount: customNodes.length,
  };
}
