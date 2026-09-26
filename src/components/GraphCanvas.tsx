import defaultGraphConfig from '../data/graphConfig.json';
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { GraphNode, GraphEdge, GraphSettings } from '../types/graph';
import { ForceAtlas2Simulation, type PhysicsParams } from '../utils/forceAtlas2';
import { tokenizeLine, BADGE_SQUARE_COLORS } from '../utils/badgeFormatter';
import { renderLatexToHtml } from '../utils/latexRenderer';
import { X } from 'lucide-react';

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  onSelectNode: (node: GraphNode | null) => void;
  onDeleteEdge?: (edgeId: string) => void;
  onOpenEdgeSettings?: (edge: GraphEdge) => void;
  onOpenLocalGraph?: (node: GraphNode) => void;
  onUpdateNodePosition?: (id: string, x: number, y: number) => void;
  settings: GraphSettings;
  zoomLevel: number;
  onZoomChange: (newZoom: number) => void;
  isFullscreen?: boolean;
  
  // Pinned Badges
  pinnedBadgeNodeIds: Set<string>;
  onTogglePinNodeBadge: (nodeId: string) => void;
  pinnedBadgeEdgeIds: Set<string>;
  onTogglePinEdgeBadge: (edgeId: string) => void;

  // Highlights
  structureHighlightNodeIds?: Set<string> | null;
  fullscreenSearchHighlight?: {
    matchingNodeIds: Set<string>;
    outgoingEdgeIds: Set<string>;
  } | null;

  // Viewport Actions
  setCanvasResetFn?: (fn: () => void) => void;
  setCanvasFitFn?: (fn: () => void) => void;
  setCanvasFocusFn?: (fn: (target: { nodeId?: string; edgeId?: string }) => void) => void;
  triggerZoomInRef?: React.MutableRefObject<(() => void) | null>;
  triggerZoomOutRef?: React.MutableRefObject<(() => void) | null>;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  nodeId: string;
}

function distanceToLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function distanceToQuadraticBezier(
  px: number, py: number,
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  let minDist = Infinity;
  const steps = 15;
  let prevX = x0;
  let prevY = y0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const currX = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * x1 + t * t * x2;
    const currY = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y1 + t * t * y2;
    const d = distanceToLineSegment(px, py, prevX, prevY, currX, currY);
    if (d < minDist) minDist = d;
    prevX = currX;
    prevY = currY;
  }
  return minDist;
}

function getBezierMidPoint(x1: number, y1: number, cx: number, cy: number, x2: number, y2: number) {
  const t = 0.5;
  const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
  const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;
  return { x, y };
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onOpenEdgeSettings,
  onOpenLocalGraph,
  settings,
  zoomLevel,
  onZoomChange,
  isFullscreen,
  pinnedBadgeNodeIds,
  onTogglePinNodeBadge,
  pinnedBadgeEdgeIds,
  onTogglePinEdgeBadge,
  structureHighlightNodeIds,
  fullscreenSearchHighlight,
  setCanvasResetFn,
  setCanvasFitFn,
  setCanvasFocusFn,
  triggerZoomInRef,
  triggerZoomOutRef,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const defaultEdgeColor = '#38bdf8';

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  useEffect(() => {
    if (Math.abs(zoomLevel - transform.k) > 0.01) {
      setTransform(prev => ({ ...prev, k: zoomLevel }));
    }
  }, [zoomLevel]);

  const simRef = useRef<ForceAtlas2Simulation | null>(null);
  const requestRef = useRef<number | null>(null);

  // Mouse interaction refs
  const isDraggingRMB = useRef(false);
  const hasRmbMoved = useRef(false);
  const rmbStartPos = useRef<{ x: number; y: number } | null>(null);
  const rmbHitNode = useRef<GraphNode | null>(null);
  const rmbHitEdge = useRef<GraphEdge | null>(null);
  const lastRmbEdgeClickTime = useRef<{ edgeId: string; time: number } | null>(null);

  const isDraggingNode = useRef<GraphNode | null>(null);
  const lmbStartPos = useRef<{ x: number; y: number } | null>(null);
  const lmbHitNode = useRef<GraphNode | null>(null);
  const hasLmbMoved = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const hoveredNodeRef = useRef<GraphNode | null>(null);
  const hoveredEdgeRef = useRef<GraphEdge | null>(null);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const currentPhysicsParams: Partial<PhysicsParams> = {
    edgeLengthMultiplier: settings.edgeLength,
    nodeSpacingBuffer: settings.nodeSpacing,
    nodeRepulsionMultiplier: settings.nodeRepulsionMultiplier,
  };

  useEffect(() => {
    if (!simRef.current) {
      simRef.current = new ForceAtlas2Simulation(nodes, edges, currentPhysicsParams);
    } else {
      simRef.current.setGraph(nodes, edges);
      simRef.current.params = { 
        ...simRef.current.params, 
        edgeLengthMultiplier: settings.edgeLength,
        nodeSpacingBuffer: settings.nodeSpacing,
        nodeRepulsionMultiplier: settings.nodeRepulsionMultiplier,
      };
    }
  }, [nodes, edges, settings.edgeLength, settings.nodeSpacing, settings.nodeRepulsionMultiplier]);

  const fitGraphToView = useCallback(() => {
    if (!canvasRef.current || nodes.length === 0) return;
    const canvas = canvasRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      const r = n.radius || 16;
      if (n.x - r < minX) minX = n.x - r;
      if (n.x + r > maxX) maxX = n.x + r;
      if (n.y - r < minY) minY = n.y - r;
      if (n.y + r > maxY) maxY = n.y + r;
    });

    const graphWidth = maxX - minX + 240;
    const graphHeight = maxY - minY + 240;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const scaleX = width / graphWidth;
    const scaleY = height / graphHeight;
    const newK = Math.max(0.18, Math.min(1.8, Math.min(scaleX, scaleY)));

    const newX = width / 2 - centerX * newK;
    const newY = height / 2 - centerY * newK;

    setTransform({ x: newX, y: newY, k: newK });
    onZoomChange(newK);
  }, [nodes, onZoomChange]);

  const resetView = useCallback(() => {
    if (!canvasRef.current) return;
    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;
    setTransform({ x: width / 2, y: height / 2, k: 1 });
    onZoomChange(1);
  }, [onZoomChange]);

  const zoomByFactor = useCallback((factor: number) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const cx = canvas.clientWidth / 2;
    const cy = canvas.clientHeight / 2;

    setTransform(prev => {
      const nextK = Math.max(0.1, Math.min(4.0, prev.k * factor));
      const nextX = cx - (cx - prev.x) * (nextK / prev.k);
      const nextY = cy - (cy - prev.y) * (nextK / prev.k);
      onZoomChange(nextK);
      return { x: nextX, y: nextY, k: nextK };
    });
  }, [onZoomChange]);

  const focusOnTarget = useCallback((target: { nodeId?: string; edgeId?: string }) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const currentK = transformRef.current.k;

    let targetX = 0;
    let targetY = 0;
    let found = false;

    if (target.nodeId) {
      const node = nodes.find(n => n.id === target.nodeId);
      if (node) {
        targetX = node.x;
        targetY = node.y;
        found = true;
        onSelectNode(node);
      }
    } else if (target.edgeId) {
      const edge = edges.find(e => e.id === target.edgeId);
      if (edge) {
        const src = nodes.find(n => n.id === edge.source);
        const tgt = nodes.find(n => n.id === edge.target);
        if (src && tgt) {
          targetX = (src.x + tgt.x) / 2;
          targetY = (src.y + tgt.y) / 2;
          found = true;
        }
      }
    }

    if (found) {
      const newK = Math.max(0.85, Math.min(2.0, currentK < 0.6 ? 1.0 : currentK));
      const newX = width / 2 - targetX * newK;
      const newY = height / 2 - targetY * newK;
      setTransform({ x: newX, y: newY, k: newK });
      onZoomChange(newK);
    }
  }, [nodes, edges, onSelectNode, onZoomChange]);

  useEffect(() => {
    if (setCanvasResetFn) setCanvasResetFn(resetView);
    if (setCanvasFitFn) setCanvasFitFn(fitGraphToView);
    if (setCanvasFocusFn) setCanvasFocusFn(focusOnTarget);
    if (triggerZoomInRef) triggerZoomInRef.current = () => zoomByFactor(1.25);
    if (triggerZoomOutRef) triggerZoomOutRef.current = () => zoomByFactor(0.8);
  }, [setCanvasResetFn, setCanvasFitFn, setCanvasFocusFn, triggerZoomInRef, triggerZoomOutRef, resetView, fitGraphToView, zoomByFactor, focusOnTarget]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fitGraphToView();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  function boxesOverlap(b1: BoundingBox, b2: BoundingBox): boolean {
    return !(
      b1.x + b1.width < b2.x ||
      b1.x > b2.x + b2.width ||
      b1.y + b1.height < b2.y ||
      b1.y > b2.y + b2.height
    );
  }

  // Animation and Render Loop
  useEffect(() => {
    let active = true;

    const render = () => {
      if (!active) return;
      const canvas = canvasRef.current;
      if (!canvas) {
        requestRef.current = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      // ForceAtlas2 Physics step
      if (settings.physicsRunning && simRef.current) {
        simRef.current.step(1);
      }

      const { x: panX, y: panY, k: scale } = transformRef.current;

      // Draw Background Grid
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridSize = 40 * scale;
      const startX = panX % gridSize;
      const startY = panY % gridSize;

      ctx.beginPath();
      for (let x = startX; x < displayWidth; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, displayHeight);
      }
      for (let y = startY; y < displayHeight; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(displayWidth, y);
      }
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(panX, panY);
      ctx.scale(scale, scale);

      const selectedNode = nodes.find(n => n.id === selectedNodeId);
      const hoveredNode = hoveredNodeRef.current;
      const hoveredEdge = hoveredEdgeRef.current;
      const focusedNode = selectedNode || hoveredNode;

      const neighborSet = new Set<string>();
      const highlightedEdgeSet = new Set<string>();

      if (focusedNode) {
        neighborSet.add(focusedNode.id);
        edges.forEach(e => {
          if (e.source === focusedNode.id) {
            neighborSet.add(e.target);
          } else if (e.target === focusedNode.id) {
            neighborSet.add(e.source);
          }
        });
        // Requirement 2: Highlight both incident edges and edges between neighbor nodes
        edges.forEach(e => {
          if (neighborSet.has(e.source) && neighborSet.has(e.target)) {
            highlightedEdgeSet.add(e.id);
          }
        });
      }

      const isStructureHighlighting = !!structureHighlightNodeIds;
      const isFullscreenSearching = !!fullscreenSearchHighlight;

      // 1. Draw Edges
      edges.forEach(edge => {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) return;

        const isHovered = hoveredEdge?.id === edge.id;
        const isIncident = focusedNode ? (edge.source === focusedNode.id || edge.target === focusedNode.id) : false;
        const isHighlighted = highlightedEdgeSet.has(edge.id);

        let isDimmed = false;
        if (isFullscreenSearching && fullscreenSearchHighlight) {
          const isOut = fullscreenSearchHighlight.outgoingEdgeIds.has(edge.id);
          if (!isOut) isDimmed = true;
        } else if (isStructureHighlighting && structureHighlightNodeIds) {
          const inStruct = structureHighlightNodeIds.has(edge.source) && structureHighlightNodeIds.has(edge.target);
          if (!inStruct) isDimmed = true;
        } else if (focusedNode) {
          if (!isHighlighted && !isIncident) isDimmed = true;
        }

        ctx.save();
        ctx.strokeStyle = edge.color || defaultEdgeColor;
        ctx.globalAlpha = isDimmed ? 0.12 : (isHighlighted || isHovered ? 1.0 : 0.65);
        ctx.lineWidth = (isHovered || isHighlighted ? 2.8 : 1.4);

        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let midPt = { x: (src.x + tgt.x) / 2, y: (src.y + tgt.y) / 2 };

        if (settings.showCurvedEdges && dist > 1) {
          const curvatureFactor = edge.curvature || 0.18;
          const mx = (src.x + tgt.x) / 2;
          const my = (src.y + tgt.y) / 2;
          const nx = -dy / dist;
          const ny = dx / dist;
          const offsetDist = dist * curvatureFactor;
          const cx = mx + nx * offsetDist;
          const cy = my + ny * offsetDist;

          ctx.beginPath();
          ctx.moveTo(src.x, src.y);
          ctx.quadraticCurveTo(cx, cy, tgt.x, tgt.y);
          ctx.stroke();

          midPt = getBezierMidPoint(src.x, src.y, cx, cy, tgt.x, tgt.y);
        } else {
          ctx.beginPath();
          ctx.moveTo(src.x, src.y);
          ctx.lineTo(tgt.x, tgt.y);
          ctx.stroke();
        }

        // Edge info badge indicator circle on line
        if (edge.infoBadge?.content) {
          ctx.setLineDash([]);
          const isPinnedEdge = pinnedBadgeEdgeIds.has(edge.id);
          ctx.fillStyle = isPinnedEdge ? '#10b981' : (edge.color || '#38bdf8');
          ctx.beginPath();
          ctx.arc(midPt.x, midPt.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // 2. Draw Nodes (NO OUTLINES / CONTOURS around circles)
      nodes.forEach(node => {
        const isSelected = selectedNodeId === node.id;
        const isHovered = hoveredNode === node;
        const isPinned = pinnedBadgeNodeIds.has(node.id);

        let isSolid = false;
        let isDimmed = false;

        if (isFullscreenSearching && fullscreenSearchHighlight) {
          const isMatch = fullscreenSearchHighlight.matchingNodeIds.has(node.id);
          if (isMatch) isSolid = true;
          else isDimmed = true;
        } else if (isStructureHighlighting && structureHighlightNodeIds) {
          const inStruct = structureHighlightNodeIds.has(node.id);
          if (inStruct) isSolid = true;
          else isDimmed = true;
        } else if (focusedNode) {
          const isNeighbor = neighborSet.has(node.id);
          if (isNeighbor) isSolid = true;
          else isDimmed = true;
        }

        ctx.save();
        const r = node.radius || 16;

        ctx.globalAlpha = isDimmed ? 0.18 : 1.0;

        // Selection / Hover / Pinned Glow Effect
        if (isSelected || isHovered || isPinned || isSolid) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + (isSelected ? 8 : 5), 0, Math.PI * 2);
          ctx.fillStyle = isSelected
            ? 'rgba(56, 189, 248, 0.35)'
            : (isPinned ? 'rgba(16, 185, 129, 0.3)' : `${node.color}33`);
          ctx.fill();
        }

        // Solid Node Circle (strictly clean, no stroke contour)
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = node.color || '#38bdf8';
        ctx.fill();

        // Assistant newly added node indicator
        if (node.isAssistantProposal) {
          ctx.beginPath();
          ctx.arc(node.x + r * 0.7, node.y - r * 0.7, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#fbbf24';
          ctx.fill();
        }

        ctx.restore();
      });

      // 3. Smart Bilingual Label Rendering
      if (settings.showLabels) {
        interface LabelCandidate {
          node: GraphNode;
          en: string;
          cn: string;
          fontSizeEn: number;
          fontSizeCn: number;
          width: number;
          height: number;
          priority: number;
          box: BoundingBox;
          isDimmed: boolean;
        }

        const candidates: LabelCandidate[] = [];

        nodes.forEach(node => {
          const isSelected = selectedNodeId === node.id;
          const isHovered = hoveredNode === node;
          const isPinned = pinnedBadgeNodeIds.has(node.id);

          let isDimmed = false;
          if (isFullscreenSearching && fullscreenSearchHighlight) {
            isDimmed = !fullscreenSearchHighlight.matchingNodeIds.has(node.id);
          } else if (isStructureHighlighting && structureHighlightNodeIds) {
            isDimmed = !structureHighlightNodeIds.has(node.id);
          } else if (focusedNode) {
            isDimmed = !neighborSet.has(node.id);
          }

          const r = node.radius || 16;
          const baseFont = Math.max(10, Math.min(22, r * 0.52));
          const fontSizeEn = baseFont;
          const fontSizeCn = Math.max(9, baseFont * 0.85);

          const enText = node.labelEn || 'Untitled';
          const cnText = node.labelCn || '';

          const textLengthMax = Math.max(enText.length * fontSizeEn * 0.58, cnText.length * fontSizeCn * 1.1);
          const boxWidth = textLengthMax + 8;
          const boxHeight = fontSizeEn + (cnText && cnText !== enText ? fontSizeCn + 4 : 0) + 4;
          const boxX = node.x - boxWidth / 2;
          const boxY = node.y + r + 3;

          let priority = node.sizeLevel || 3;
          if (isSelected) priority += 100;
          if (isHovered) priority += 80;
          if (isPinned) priority += 60;
          if (focusedNode && neighborSet.has(node.id)) priority += 40;

          candidates.push({
            node,
            en: enText,
            cn: cnText,
            fontSizeEn,
            fontSizeCn,
            width: boxWidth,
            height: boxHeight,
            priority,
            box: { x: boxX, y: boxY, width: boxWidth, height: boxHeight, nodeId: node.id },
            isDimmed,
          });
        });

        candidates.sort((a, b) => b.priority - a.priority);

        const acceptedBoxes: BoundingBox[] = [];
        const backgroundLabels: LabelCandidate[] = [];
        const foregroundLabels: LabelCandidate[] = [];

        candidates.forEach(cand => {
          let collides = false;
          for (const placed of acceptedBoxes) {
            if (boxesOverlap(cand.box, placed)) {
              collides = true;
              break;
            }
          }

          if (collides && !cand.isDimmed && cand.node.id !== selectedNodeId && cand.node.id !== hoveredNode?.id) {
            backgroundLabels.push(cand);
          } else {
            acceptedBoxes.push(cand.box);
            foregroundLabels.push(cand);
          }
        });

        // Layer 1: Collided Labels (Subtle Gray)
        backgroundLabels.forEach(cand => {
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
          ctx.font = `${cand.fontSizeEn * 0.9}px sans-serif`;
          ctx.fillText(cand.en, cand.node.x, cand.box.y);

          if (cand.cn && cand.cn !== cand.en) {
            ctx.font = `${cand.fontSizeCn * 0.85}px sans-serif`;
            ctx.fillText(cand.cn, cand.node.x, cand.box.y + cand.fontSizeEn * 0.9 + 2);
          }
          ctx.restore();
        });

        // Layer 2: Foreground Labels
        foregroundLabels.forEach(cand => {
          ctx.save();
          ctx.globalAlpha = cand.isDimmed ? 0.18 : 1.0;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 1;

          ctx.fillStyle = cand.node.id === selectedNodeId || cand.node.id === hoveredNode?.id ? '#38bdf8' : '#f8fafc';
          ctx.font = `600 ${cand.fontSizeEn}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillText(cand.en, cand.node.x, cand.box.y);

          if (cand.cn && cand.cn !== cand.en) {
            ctx.fillStyle = cand.node.id === selectedNodeId || cand.node.id === hoveredNode?.id ? '#93c5fd' : 'rgba(226, 232, 240, 0.85)';
            ctx.font = `400 ${cand.fontSizeCn}px "PingFang SC", "Microsoft YaHei", sans-serif`;
            ctx.fillText(cand.cn, cand.node.x, cand.box.y + cand.fontSizeEn + 2);
          }

          ctx.restore();
        });
      }

      // 4. Draw Dashed Connector Lines for Node Cards & Update Real-Time DOM Position
      const activeNodeIdsSet = new Set<string>();
      pinnedBadgeNodeIds.forEach(id => activeNodeIdsSet.add(id));
      if (hoveredNodeRef.current?.id) activeNodeIdsSet.add(hoveredNodeRef.current.id);

      activeNodeIdsSet.forEach(nodeId => {
        const targetNode = nodeMap.get(nodeId);
        if (!targetNode || !targetNode.infoBadge?.content) return;

        const scaleMul = targetNode.badgeScale || targetNode.infoBadge?.scale || 1.0;
        const baseHeaderSize = defaultGraphConfig?.cardStyles?.headerFontSize || 16.5;
        const basePad = defaultGraphConfig?.cardStyles?.cardPadding || 16;
        const headerFontSize = baseHeaderSize * scaleMul;
        const cardPadding = basePad * scaleMul;
        const nodeRadius = targetNode.radius || 16;

        const cardX = targetNode.x + nodeRadius + 16;
        const cardY = targetNode.y - 20;

        ctx.save();
        ctx.strokeStyle = targetNode.color;
        ctx.lineWidth = 1.4 * scaleMul;
        ctx.setLineDash([3 * scaleMul, 2 * scaleMul]);
        ctx.beginPath();
        ctx.moveTo(targetNode.x + nodeRadius * 0.7, targetNode.y - nodeRadius * 0.7);
        ctx.lineTo(cardX, cardY + cardPadding + headerFontSize / 2);
        ctx.stroke();
        ctx.restore();

        const cardEl = document.getElementById(`info-card-overlay-node-${targetNode.id}`);
        if (cardEl) {
          const screenX = cardX * scale + panX;
          const screenY = cardY * scale + panY;
          cardEl.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) scale(${scale})`;
        }
      });

      // 5. Draw Dashed Connector Lines for Edge Cards & Update Real-Time DOM Position
      const activeEdgeIdsSet = new Set<string>();
      pinnedBadgeEdgeIds.forEach(id => activeEdgeIdsSet.add(id));
      if (hoveredEdgeRef.current?.id) activeEdgeIdsSet.add(hoveredEdgeRef.current.id);

      activeEdgeIdsSet.forEach(edgeId => {
        const targetEdge = edges.find(e => e.id === edgeId);
        if (!targetEdge || !targetEdge.infoBadge?.content) return;

        const src = nodeMap.get(targetEdge.source);
        const tgt = nodeMap.get(targetEdge.target);
        if (!src || !tgt) return;

        const edgeColor = targetEdge.color || defaultEdgeColor;
        const scaleMul = targetEdge.badgeScale !== undefined
          ? targetEdge.badgeScale
          : (targetEdge.infoBadge?.scale !== undefined ? targetEdge.infoBadge.scale : 1.0);

        const baseHeaderSize = defaultGraphConfig?.cardStyles?.headerFontSize || 16.5;
        const basePad = defaultGraphConfig?.cardStyles?.cardPadding || 16;
        const headerFontSize = baseHeaderSize * scaleMul;
        const cardPadding = basePad * scaleMul;

        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let midPt = { x: (src.x + tgt.x) / 2, y: (src.y + tgt.y) / 2 };
        if (settings.showCurvedEdges && dist > 1) {
          const curvatureFactor = targetEdge.curvature || 0.18;
          const mx = (src.x + tgt.x) / 2;
          const my = (src.y + tgt.y) / 2;
          const nx = -dy / dist;
          const ny = dx / dist;
          const offsetDist = dist * curvatureFactor;
          const cx = mx + nx * offsetDist;
          const cy = my + ny * offsetDist;
          midPt = getBezierMidPoint(src.x, src.y, cx, cy, tgt.x, tgt.y);
        }

        const cardX = midPt.x + 12;
        const cardY = midPt.y - 12;

        ctx.save();
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = 1.2 * scaleMul;
        ctx.setLineDash([3 * scaleMul, 2 * scaleMul]);
        ctx.beginPath();
        ctx.moveTo(midPt.x, midPt.y);
        ctx.lineTo(cardX, cardY + cardPadding + headerFontSize / 2);
        ctx.stroke();
        ctx.restore();

        const cardEl = document.getElementById(`info-card-overlay-edge-${targetEdge.id}`);
        if (cardEl) {
          const screenX = cardX * scale + panX;
          const screenY = cardY * scale + panY;
          cardEl.style.transform = `translate3d(${screenX}px, ${screenY}px, 0) scale(${scale})`;
        }
      });

      ctx.restore();
      ctx.restore();

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => {
      active = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [
    nodes,
    edges,
    selectedNodeId,
    settings,
    isFullscreen,
    pinnedBadgeNodeIds,
    pinnedBadgeEdgeIds,
    structureHighlightNodeIds,
    fullscreenSearchHighlight,
    nodeMap,
    defaultEdgeColor,
  ]);

  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const { x, y, k } = transformRef.current;
    return {
      x: (screenX - x) / k,
      y: (screenY - y) / k,
    };
  }, []);

  const getNodeAtPosition = useCallback((worldX: number, worldY: number): GraphNode | null => {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      const r = (node.radius || 16) + 4;
      const dx = worldX - node.x;
      const dy = worldY - node.y;
      if (dx * dx + dy * dy <= r * r) {
        return node;
      }
    }
    return null;
  }, [nodes]);

  const getEdgeAtPosition = useCallback((worldX: number, worldY: number): GraphEdge | null => {
    for (let i = edges.length - 1; i >= 0; i--) {
      const edge = edges[i];
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;

      let dist = Infinity;
      if (settings.showCurvedEdges) {
        const curvatureFactor = edge.curvature || 0.18;
        const mx = (src.x + tgt.x) / 2;
        const my = (src.y + tgt.y) / 2;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / d;
        const ny = dx / d;
        const offsetDist = d * curvatureFactor;
        const cx = mx + nx * offsetDist;
        const cy = my + ny * offsetDist;
        dist = distanceToQuadraticBezier(worldX, worldY, src.x, src.y, cx, cy, tgt.x, tgt.y);
      } else {
        dist = distanceToLineSegment(worldX, worldY, src.x, src.y, tgt.x, tgt.y);
      }

      if (dist <= 7) {
        return edge;
      }
    }
    return null;
  }, [nodes, edges, nodeMap, settings.showCurvedEdges]);

  // Mouse Down handling - RMB dragging ALWAYS pans without interfering with edges/nodes
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const worldPos = screenToWorld(clientX, clientY);

    lastMousePos.current = { x: clientX, y: clientY };

    // Right Mouse Button (RMB)
    if (e.button === 2) {
      e.preventDefault();
      e.stopPropagation();

      rmbStartPos.current = { x: clientX, y: clientY };
      hasRmbMoved.current = false;
      isDraggingRMB.current = true;

      const hitNode = getNodeAtPosition(worldPos.x, worldPos.y);
      const hitEdge = hitNode ? null : getEdgeAtPosition(worldPos.x, worldPos.y);

      rmbHitNode.current = hitNode;
      rmbHitEdge.current = hitEdge;
      return;
    }

    // Left Mouse Button (LMB)
    if (e.button === 0) {
      lmbStartPos.current = { x: clientX, y: clientY };
      hasLmbMoved.current = false;
      const hitNode = getNodeAtPosition(worldPos.x, worldPos.y);
      lmbHitNode.current = hitNode;
      if (hitNode) {
        isDraggingNode.current = hitNode;
        hitNode.isFixed = true;
      }
    }
  };

  // Double Click Handler (LMB): Pins Node or Edge info badge on canvas
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const worldPos = screenToWorld(clientX, clientY);

    // Double click on node
    const hitNode = getNodeAtPosition(worldPos.x, worldPos.y);
    if (hitNode) {
      e.preventDefault();
      onTogglePinNodeBadge(hitNode.id);
      return;
    }

    // Double click on edge
    const hitEdge = getEdgeAtPosition(worldPos.x, worldPos.y);
    if (hitEdge) {
      e.preventDefault();
      onTogglePinEdgeBadge(hitEdge.id);
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const dx = clientX - lastMousePos.current.x;
    const dy = clientY - lastMousePos.current.y;
    lastMousePos.current = { x: clientX, y: clientY };

    const worldPos = screenToWorld(clientX, clientY);

    // RMB Dragging (always pans canvas smoothly, never blocked by edge or node)
    if (isDraggingRMB.current) {
      if (rmbStartPos.current) {
        const movedDist = Math.hypot(clientX - rmbStartPos.current.x, clientY - rmbStartPos.current.y);
        if (movedDist > 4) {
          hasRmbMoved.current = true;
        }
      }
      setTransform(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      return;
    }

    if (isDraggingNode.current) {
      if (lmbStartPos.current) {
        const movedDist = Math.hypot(clientX - lmbStartPos.current.x, clientY - lmbStartPos.current.y);
        if (movedDist > 4) {
          hasLmbMoved.current = true;
        }
      }
      const node = isDraggingNode.current;
      node.x = worldPos.x;
      node.y = worldPos.y;
      node.vx = 0;
      node.vy = 0;
      return;
    }

    const hoveredN = getNodeAtPosition(worldPos.x, worldPos.y);
    hoveredNodeRef.current = hoveredN;
    if (hoveredN?.id !== hoveredNodeId) {
      setHoveredNodeId(hoveredN ? hoveredN.id : null);
    }

    const hoveredE = hoveredN ? null : getEdgeAtPosition(worldPos.x, worldPos.y);
    hoveredEdgeRef.current = hoveredE;
    if (hoveredE?.id !== hoveredEdgeId) {
      setHoveredEdgeId(hoveredE ? hoveredE.id : null);
    }
  };

  const handleMouseLeave = () => {
    hoveredNodeRef.current = null;
    hoveredEdgeRef.current = null;
    setHoveredNodeId(null);
    setHoveredEdgeId(null);
  };

  // Mouse Up handling for RMB click vs double RMB click vs dragging
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 2) {
      isDraggingRMB.current = false;

      // If RMB was moved (dragged), user intended to pan -> do not trigger click actions!
      if (!hasRmbMoved.current) {
        // 1. Single RMB click on node -> Local Graph Confirmation
        if (rmbHitNode.current) {
          onOpenLocalGraph?.(rmbHitNode.current);
        }
        // 2. Double RMB click on edge (Only when NOT in Fullscreen mode)
        else if (rmbHitEdge.current && !isFullscreen) {
          const now = Date.now();
          const last = lastRmbEdgeClickTime.current;
          if (last && last.edgeId === rmbHitEdge.current.id && now - last.time < 380) {
            lastRmbEdgeClickTime.current = null;
            onOpenEdgeSettings?.(rmbHitEdge.current);
          } else {
            lastRmbEdgeClickTime.current = { edgeId: rmbHitEdge.current.id, time: now };
          }
        }
      }

      rmbStartPos.current = null;
      rmbHitNode.current = null;
      rmbHitEdge.current = null;
    }

    if (e.button === 0) {
      if (isDraggingNode.current) {
        isDraggingNode.current.isFixed = false;
        isDraggingNode.current = null;
      }
      if (!hasLmbMoved.current) {
        if (lmbHitNode.current) {
          onSelectNode(lmbHitNode.current);
        } else {
          onSelectNode(null);
        }
      }
      lmbStartPos.current = null;
      lmbHitNode.current = null;
      hasLmbMoved.current = false;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;

    setTransform(prev => {
      const newK = Math.max(0.1, Math.min(4.0, prev.k * zoomFactor));
      const newX = clientX - (clientX - prev.x) * (newK / prev.k);
      const newY = clientY - (clientY - prev.y) * (newK / prev.k);
      onZoomChange(newK);
      return { x: newX, y: newY, k: newK };
    });
  };

  // Helper to render Markdown + KaTeX formatted content
  const renderMarkdownFormatted = (raw: string) => {
    if (!raw) return null;
    const rawLines = raw.split(/\r?\n/);
    return rawLines.map((line, lineIdx) => {
      if (!line) {
        return <div key={lineIdx} className="h-2.5" />;
      }
      const segments = tokenizeLine(line);
      return (
        <div key={lineIdx} className="min-h-[1.25em] my-0.5 leading-relaxed flex items-center flex-wrap gap-x-1">
          {segments.map((seg, segIdx) => {
            if (seg.type === 'bold') {
              return (
                <strong key={segIdx} className="font-bold text-white">
                  {seg.text}
                </strong>
              );
            }
            if (seg.type === 'square') {
              return (
                <span
                  key={segIdx}
                  className="inline-block rounded-[3px] shadow-sm shrink-0 mx-0.5 align-middle"
                  style={{
                    backgroundColor: seg.squareColor || BADGE_SQUARE_COLORS.yellow,
                    width: '1.1em',
                    height: '1.1em',
                  }}
                />
              );
            }
            if (seg.type === 'latex') {
              const rawLatex = seg.latex || seg.text || '';
              return (
                <span
                  key={segIdx}
                  className="inline-block px-1 py-0.2 rounded bg-slate-900/90 text-sky-200 font-serif text-[11px] shadow-sm align-middle"
                  dangerouslySetInnerHTML={{ __html: renderLatexToHtml(rawLatex) }}
                />
              );
            }
            return (
              <span key={segIdx} className="text-slate-200">
                {seg.text}
              </span>
            );
          })}
        </div>
      );
    });
  };

  // Active Pinned / Hovered Node cards
  const activeNodeCards = useMemo(() => {
    const list: GraphNode[] = [];
    const seen = new Set<string>();
    pinnedBadgeNodeIds.forEach(id => {
      const n = nodes.find(node => node.id === id);
      if (n && n.infoBadge?.content) {
        list.push(n);
        seen.add(n.id);
      }
    });
    if (hoveredNodeId && !seen.has(hoveredNodeId)) {
      const hn = nodes.find(n => n.id === hoveredNodeId);
      if (hn && hn.infoBadge?.content) {
        list.push(hn);
      }
    }
    return list;
  }, [nodes, pinnedBadgeNodeIds, hoveredNodeId]);

  // Active Pinned / Hovered Edge cards
  const activeEdgeCards = useMemo(() => {
    const list: GraphEdge[] = [];
    const seen = new Set<string>();
    pinnedBadgeEdgeIds.forEach(id => {
      const e = edges.find(edge => edge.id === id);
      if (e && e.infoBadge?.content) {
        list.push(e);
        seen.add(e.id);
      }
    });
    if (hoveredEdgeId && !seen.has(hoveredEdgeId)) {
      const he = edges.find(e => e.id === hoveredEdgeId);
      if (he && he.infoBadge?.content) {
        list.push(he);
      }
    }
    return list;
  }, [edges, pinnedBadgeEdgeIds, hoveredEdgeId]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden bg-slate-950"
      onContextMenu={handleContextMenu}
      onMouseLeave={handleMouseLeave}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />

      {/* HTML / KaTeX DOM Overlay for Node and Edge Information Cards */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {activeNodeCards.map(targetNode => {
          const badgeRawContent = targetNode.infoBadge?.content;
          if (!badgeRawContent) return null;

          const scaleMul = targetNode.badgeScale || targetNode.infoBadge?.scale || 1.0;
          const baseHeaderSize = defaultGraphConfig?.cardStyles?.headerFontSize || 16.5;
          const baseBodySize = defaultGraphConfig?.cardStyles?.bodyFontSize || 16.5;
          const basePad = defaultGraphConfig?.cardStyles?.cardPadding || 16;

          const headerFontSize = baseHeaderSize * scaleMul;
          const bodyFontSize = baseBodySize * scaleMul;
          const cardPadding = basePad * scaleMul;
          const headerTitle = `${targetNode.labelEn}${targetNode.labelCn && targetNode.labelCn !== targetNode.labelEn ? ` | ${targetNode.labelCn}` : ''}`;
          const isPinned = pinnedBadgeNodeIds.has(targetNode.id);

          const nodeRadius = targetNode.radius || 16;
          const cardX = targetNode.x + nodeRadius + 16;
          const cardY = targetNode.y - 20;
          const screenX = cardX * transform.k + transform.x;
          const screenY = cardY * transform.k + transform.y;

          return (
            <div
              key={targetNode.id}
              id={`info-card-overlay-node-${targetNode.id}`}
              className="pointer-events-auto absolute top-0 left-0 rounded-lg shadow-2xl transition-shadow select-text"
              style={{
                transform: `translate3d(${screenX}px, ${screenY}px, 0) scale(${transform.k})`,
                transformOrigin: 'top left',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: `${1.8 * scaleMul}px solid ${targetNode.color}`,
                padding: `${cardPadding}px`,
                maxWidth: `${Math.max(280, 380 * scaleMul)}px`,
                minWidth: `${Math.max(160, 200 * scaleMul)}px`,
                zIndex: isPinned ? 20 : 30,
              }}
            >
              {/* Header Title */}
              <div
                className="font-bold border-b pb-1.5 mb-2 flex items-center justify-between gap-2"
                style={{
                  color: targetNode.color,
                  fontSize: `${headerFontSize}px`,
                  borderColor: `${targetNode.color}44`,
                }}
              >
                <span className="truncate">{headerTitle}</span>
                {isPinned && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onTogglePinNodeBadge(targetNode.id);
                    }}
                    title="Close / Unpin"
                    className="opacity-70 hover:opacity-100 text-slate-300 hover:text-white transition p-0.5 rounded hover:bg-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Body KaTeX Div Block */}
              <div
                className="text-slate-200 leading-relaxed font-sans"
                style={{ fontSize: `${bodyFontSize}px` }}
              >
                {renderMarkdownFormatted(badgeRawContent)}
              </div>
            </div>
          );
        })}

        {activeEdgeCards.map(targetEdge => {
          const badgeRawContent = targetEdge.infoBadge?.content;
          if (!badgeRawContent) return null;

          const src = nodeMap.get(targetEdge.source);
          const tgt = nodeMap.get(targetEdge.target);
          if (!src || !tgt) return null;

          const scaleMul = targetEdge.badgeScale !== undefined
            ? targetEdge.badgeScale
            : (targetEdge.infoBadge?.scale !== undefined ? targetEdge.infoBadge.scale : 1.0);

          const baseHeaderSize = defaultGraphConfig?.cardStyles?.headerFontSize || 16.5;
          const baseBodySize = defaultGraphConfig?.cardStyles?.bodyFontSize || 16.5;
          const basePad = defaultGraphConfig?.cardStyles?.cardPadding || 16;

          const headerFontSize = baseHeaderSize * scaleMul;
          const bodyFontSize = baseBodySize * scaleMul;
          const cardPadding = basePad * scaleMul;

          const edgeColor = targetEdge.color || defaultEdgeColor;
          const firstNode = (src.weight || 0) >= (tgt.weight || 0) ? src : tgt;
          const secondNode = firstNode === src ? tgt : src;
          const edgeLang = targetEdge.badgeLanguage || 'cn';
          const label1 = edgeLang === 'en' ? firstNode.labelEn : (firstNode.labelCn || firstNode.labelEn);
          const label2 = edgeLang === 'en' ? secondNode.labelEn : (secondNode.labelCn || secondNode.labelEn);
          const headerTitle = `${label1} ↔ ${label2}`;
          const isPinned = pinnedBadgeEdgeIds.has(targetEdge.id);

          let midPt = { x: (src.x + tgt.x) / 2, y: (src.y + tgt.y) / 2 };
          const dx = tgt.x - src.x;
          const dy = tgt.y - src.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (settings.showCurvedEdges && dist > 1) {
            const curvatureFactor = targetEdge.curvature || 0.18;
            const mx = (src.x + tgt.x) / 2;
            const my = (src.y + tgt.y) / 2;
            const nx = -dy / dist;
            const ny = dx / dist;
            const offsetDist = dist * curvatureFactor;
            const cx = mx + nx * offsetDist;
            const cy = my + ny * offsetDist;
            midPt = getBezierMidPoint(src.x, src.y, cx, cy, tgt.x, tgt.y);
          }

          const cardX = midPt.x + 12;
          const cardY = midPt.y - 12;
          const screenX = cardX * transform.k + transform.x;
          const screenY = cardY * transform.k + transform.y;

          return (
            <div
              key={targetEdge.id}
              id={`info-card-overlay-edge-${targetEdge.id}`}
              className="pointer-events-auto absolute top-0 left-0 rounded-lg shadow-2xl transition-shadow select-text"
              style={{
                transform: `translate3d(${screenX}px, ${screenY}px, 0) scale(${transform.k})`,
                transformOrigin: 'top left',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: `${1.8 * scaleMul}px solid ${edgeColor}`,
                padding: `${cardPadding}px`,
                maxWidth: `${Math.max(280, 380 * scaleMul)}px`,
                minWidth: `${Math.max(160, 200 * scaleMul)}px`,
                zIndex: isPinned ? 20 : 30,
              }}
            >
              {/* Header Title */}
              <div
                className="font-bold border-b pb-1.5 mb-2 flex items-center justify-between gap-2"
                style={{
                  color: edgeColor,
                  fontSize: `${headerFontSize}px`,
                  borderColor: `${edgeColor}44`,
                }}
              >
                <span className="truncate">{headerTitle}</span>
                {isPinned && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onTogglePinEdgeBadge(targetEdge.id);
                    }}
                    title="Close / Unpin"
                    className="opacity-70 hover:opacity-100 text-slate-300 hover:text-white transition p-0.5 rounded hover:bg-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Body KaTeX Div Block */}
              <div
                className="text-slate-200 leading-relaxed font-sans"
                style={{ fontSize: `${bodyFontSize}px` }}
              >
                {renderMarkdownFormatted(badgeRawContent)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
