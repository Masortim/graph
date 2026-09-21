import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { GraphNode, GraphEdge, GraphSettings } from '../types/graph';
import { ForceAtlas2Simulation, type PhysicsParams } from '../utils/forceAtlas2';
import { formatBadgeContent } from '../utils/badgeFormatter';
import { latexToCanvasText } from '../utils/latexRenderer';

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
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - (x1 + t * (x2 - x1))) ** 2 + (py - (y1 + t * (y2 - y1))) ** 2);
}

function distanceToQuadraticBezier(px: number, py: number, x1: number, y1: number, cx: number, cy: number, x2: number, y2: number): number {
  let minDist = Infinity;
  const steps = 14;
  let prevX = x1;
  let prevY = y1;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const currX = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
    const currY = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;
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
  isFullscreen = false,
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  transformRef.current = transform;

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
  const lastMousePos = useRef({ x: 0, y: 0 });
  const hoveredNodeRef = useRef<GraphNode | null>(null);
  const hoveredEdgeRef = useRef<GraphEdge | null>(null);

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
    if (setCanvasResetFn) setCanvasResetFn(() => resetView);
    if (setCanvasFitFn) setCanvasFitFn(() => fitGraphToView);
    if (setCanvasFocusFn) setCanvasFocusFn(() => focusOnTarget);
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

      if (settings.physicsRunning && simRef.current) {
        simRef.current.step(1.0);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Dark background
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      // Subtle background grid
      const { x: panX, y: panY, k: scale } = transformRef.current;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
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
            highlightedEdgeSet.add(e.id);
          } else if (e.target === focusedNode.id) {
            neighborSet.add(e.source);
            highlightedEdgeSet.add(e.id);
          }
        });
      }

      const isStructureHighlighting = !!structureHighlightNodeIds;
      const isFullscreenSearching = !!fullscreenSearchHighlight;

      // 1. Draw Edges
      const nodeMap = new Map<string, GraphNode>();
      nodes.forEach(n => nodeMap.set(n.id, n));

      const defaultEdgeColor = settings.edgeColor || '#94a3b8';
      const defaultThickness = settings.edgeThickness || 1.2;
      const baseOpacity = settings.edgeOpacity || 0.35;

      edges.forEach(edge => {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) return;

        const isEdgeHovered = hoveredEdge?.id === edge.id;
        const isNeighborEdge = highlightedEdgeSet.has(edge.id);

        let isEdgeSolid = false;
        let isEdgeDimmed = false;

        if (isFullscreenSearching && fullscreenSearchHighlight) {
          const isInternal = fullscreenSearchHighlight.matchingNodeIds.has(edge.source) &&
                             fullscreenSearchHighlight.matchingNodeIds.has(edge.target);
          const isOutgoing = fullscreenSearchHighlight.outgoingEdgeIds.has(edge.id);
          if (isInternal || isOutgoing) {
            isEdgeSolid = true;
          } else {
            isEdgeDimmed = true;
          }
        } else if (isStructureHighlighting && structureHighlightNodeIds) {
          const bothInStructure = structureHighlightNodeIds.has(edge.source) && structureHighlightNodeIds.has(edge.target);
          if (bothInStructure) {
            isEdgeSolid = true;
          } else {
            isEdgeDimmed = true;
          }
        } else if (focusedNode) {
          if (isNeighborEdge) {
            isEdgeSolid = true;
          } else {
            isEdgeDimmed = true;
          }
        }

        ctx.save();
        
        // Edge styling: Thickness (1-9), Line style (dashed / solid), Color
        const edgeThick = edge.thickness || defaultThickness;
        const strokeColor = edge.color || defaultEdgeColor;
        const isDashed = edge.style === 'dashed' || edge.lineStyle === 'dashed';

        let strokeAlpha = baseOpacity;
        if (isEdgeHovered || isEdgeSolid) {
          strokeAlpha = 0.95;
        } else if (isEdgeDimmed) {
          strokeAlpha = baseOpacity * 0.12;
        }

        const lineWidth = (isEdgeHovered || isEdgeSolid ? edgeThick * 1.5 : edgeThick);

        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = isEdgeHovered || isEdgeSolid ? (edge.color || '#38bdf8') : strokeColor;
        ctx.globalAlpha = strokeAlpha;

        if (isDashed) {
          ctx.setLineDash([8, 6]);
        } else {
          ctx.setLineDash([]);
        }

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
        ctx.globalAlpha = isDimmed ? 0.12 : 1.0;

        const radius = node.radius || 16;

        // Smooth glow halo
        if (isSelected || isHovered || isPinned || isSolid || radius > 24) {
          const glowGrad = ctx.createRadialGradient(node.x, node.y, radius * 0.6, node.x, node.y, radius * 2.2);
          glowGrad.addColorStop(0, node.color + (isSelected || isHovered || isPinned || isSolid ? '99' : '44'));
          glowGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Solid smooth gradient circle (No black contour outline)
        const fillGrad = ctx.createRadialGradient(
          node.x - radius * 0.3,
          node.y - radius * 0.3,
          radius * 0.1,
          node.x,
          node.y,
          radius
        );
        fillGrad.addColorStop(0, '#ffffff');
        fillGrad.addColorStop(0.35, node.color);
        fillGrad.addColorStop(1, shadeColor(node.color, -30));

        ctx.fillStyle = fillGrad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Info Badge indicator icon [i] / [✓]
        if (node.infoBadge) {
          const badgeX = node.x + radius * 0.75;
          const badgeY = node.y - radius * 0.75;
          ctx.fillStyle = isPinned ? '#10b981' : '#3b82f6';
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, 5.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(isPinned ? '✓' : 'i', badgeX, badgeY);
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
          const boxHeight = fontSizeEn + (cnText ? fontSizeCn + 4 : 0) + 4;

          const boxX = node.x - boxWidth / 2;
          const boxY = node.y + r + 4;

          let priority = r * 10 + (node.weight || 0);
          if (isSelected) priority += 10000;
          if (isHovered) priority += 5000;
          if (isPinned) priority += 7000;
          if (!isDimmed) priority += 1000;
          if (node.type === 'chapter') priority += 800;

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

      // 4. Render Node Information Badge Callouts
      const nodeBadgeTargets = new Set<GraphNode>();
      pinnedBadgeNodeIds.forEach(id => {
        const n = nodeMap.get(id);
        if (n && n.infoBadge?.content !== undefined && n.infoBadge.content !== '') {
          nodeBadgeTargets.add(n);
        }
      });

      if (hoveredNode && hoveredNode.infoBadge?.content !== undefined && hoveredNode.infoBadge.content !== '') {
        nodeBadgeTargets.add(hoveredNode);
      }

      nodeBadgeTargets.forEach(targetNode => {
        const badgeRawContent = targetNode.infoBadge?.content;
        if (badgeRawContent === undefined || badgeRawContent === '') return;

        ctx.save();
        
        const scaleMul = targetNode.badgeScale || targetNode.infoBadge?.scale || 1.0;
        
        const bodyFontSize = 11 * scaleMul;
        const headerFontSize = bodyFontSize * 2; // 2x body text font size & bold
        const lineHeight = 16 * scaleMul;
        const sqSize = bodyFontSize * 1.25;
        const cardPadding = 14 * scaleMul;
        const nodeRadius = targetNode.radius || 16;

        const { lines: formattedLines, maxLineWidth } = formatBadgeContent(
          badgeRawContent,
          (txt, isBold, isLatex) => {
            if (isLatex) {
              ctx.font = `italic ${bodyFontSize}px "KaTeX_Math", "Times New Roman", serif`;
              return ctx.measureText(latexToCanvasText(txt)).width + 3 * scaleMul;
            }
            ctx.font = isBold
              ? `bold ${bodyFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif`
              : `${bodyFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif`;
            return ctx.measureText(txt).width;
          },
          bodyFontSize
        );

        const headerTitle = `${targetNode.labelEn}${targetNode.labelCn && targetNode.labelCn !== targetNode.labelEn ? ` | ${targetNode.labelCn}` : ''}`;
        ctx.font = `bold ${headerFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif`;
        const headerWidth = ctx.measureText(headerTitle).width;
        const headerHeight = headerFontSize + 6 * scaleMul;

        // Content width includes both the header and all body lines
        const contentWidth = Math.max(headerWidth, maxLineWidth);
        const cardWidth = Math.max(140 * scaleMul, contentWidth + cardPadding * 2);
        const cardHeight = cardPadding + headerHeight + formattedLines.length * lineHeight + cardPadding;

        const cardX = targetNode.x + nodeRadius + 16;
        const cardY = targetNode.y - 20;

        // Connector line
        ctx.strokeStyle = targetNode.color;
        ctx.lineWidth = 1.4 * scaleMul;
        ctx.setLineDash([3 * scaleMul, 2 * scaleMul]);
        ctx.beginPath();
        ctx.moveTo(targetNode.x + nodeRadius * 0.7, targetNode.y - nodeRadius * 0.7);
        ctx.lineTo(cardX, cardY + cardPadding + headerFontSize / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Card Background (rounded)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 8 * scaleMul);
        ctx.fill();

        // Card Border
        ctx.strokeStyle = targetNode.color;
        ctx.lineWidth = 1.8 * scaleMul;
        roundRect(ctx, cardX, cardY, cardWidth, cardHeight, 8 * scaleMul);
        ctx.stroke();

        // Header Title
        ctx.fillStyle = targetNode.color;
        ctx.font = `bold ${headerFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(headerTitle, cardX + cardPadding, cardY + cardPadding);

        // Separator line
        const sepY = cardY + cardPadding + headerFontSize + 4 * scaleMul;
        ctx.strokeStyle = targetNode.color + '44';
        ctx.lineWidth = 1 * scaleMul;
        ctx.beginPath();
        ctx.moveTo(cardX + cardPadding, sepY);
        ctx.lineTo(cardX + cardWidth - cardPadding, sepY);
        ctx.stroke();

        // Draw Formatted Lines with symmetric padding
        const linesStartY = sepY + 6 * scaleMul;
        formattedLines.forEach((line, lineIdx) => {
          let curX = cardX + cardPadding;
          const curY = linesStartY + lineIdx * lineHeight;

          line.segments.forEach(seg => {
            if (seg.type === 'square') {
              const sqY = curY + (lineHeight - sqSize) / 2 - 1;
              ctx.fillStyle = seg.squareColor || '#fbbf24';
              roundRect(ctx, curX, sqY, sqSize, sqSize, 2 * scaleMul);
              ctx.fill();
              curX += sqSize + 4 * scaleMul;
            } else if (seg.type === 'latex') {
              ctx.font = `italic ${bodyFontSize}px "KaTeX_Math", "Times New Roman", serif`;
              ctx.fillStyle = '#7dd3fc';
              ctx.textBaseline = 'top';
              const mathTxt = latexToCanvasText(seg.text || '');
              ctx.fillText(mathTxt, curX, curY);
              curX += ctx.measureText(mathTxt).width + 3 * scaleMul;
            } else if (seg.type === 'bold') {
              ctx.font = `bold ${bodyFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif`;
              ctx.fillStyle = '#ffffff';
              ctx.textBaseline = 'top';
              ctx.fillText(seg.text || '', curX, curY);
              curX += ctx.measureText(seg.text || '').width;
            } else {
              ctx.font = `${bodyFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif`;
              ctx.fillStyle = '#e2e8f0';
              ctx.textBaseline = 'top';
              ctx.fillText(seg.text || '', curX, curY);
              curX += ctx.measureText(seg.text || '').width;
            }
          });
        });

        ctx.restore();
      });

      // 5. Render Edge Information Badge Callouts
      const edgeBadgeTargets = new Set<GraphEdge>();
      pinnedBadgeEdgeIds.forEach(id => {
        const e = edges.find(edge => edge.id === id);
        if (e && e.infoBadge?.content) edgeBadgeTargets.add(e);
      });
      if (hoveredEdge && hoveredEdge.infoBadge?.content) {
        edgeBadgeTargets.add(hoveredEdge);
      }

      edgeBadgeTargets.forEach(targetEdge => {
        const src = nodeMap.get(targetEdge.source);
        const tgt = nodeMap.get(targetEdge.target);
        if (!src || !tgt) return;

        const badgeRawContent = targetEdge.infoBadge?.content;
        if (!badgeRawContent) return;

        ctx.save();
        const edgeColor = targetEdge.color || defaultEdgeColor;

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

        const scaleMul = targetEdge.badgeScale !== undefined
          ? targetEdge.badgeScale
          : (targetEdge.infoBadge?.scale !== undefined ? targetEdge.infoBadge.scale : 1.0);

        const bodyFontSize = 11 * scaleMul;
        const headerFontSize = bodyFontSize * 2; // EXACT SAME SIZE AS NODE CARD HEADER
        const lineHeight = 16 * scaleMul;
        const sqSize = bodyFontSize * 1.25;
        const cardPadding = 14 * scaleMul; // Symmetric padding

        // First node is the one with greater weight
        const firstNode = (src.weight || 0) >= (tgt.weight || 0) ? src : tgt;
        const secondNode = firstNode === src ? tgt : src;

        // Language toggle support ('cn' by default, or 'en')
        const edgeLang = targetEdge.badgeLanguage || 'cn';
        const label1 = edgeLang === 'en' ? firstNode.labelEn : (firstNode.labelCn || firstNode.labelEn);
        const label2 = edgeLang === 'en' ? secondNode.labelEn : (secondNode.labelCn || secondNode.labelEn);
        const headerTitle = `${label1} ↔ ${label2}`;

        ctx.font = `bold ${headerFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif`;
        const headerWidth = ctx.measureText(headerTitle).width;
        const headerHeight = headerFontSize + 6 * scaleMul;

        // Wrap body lines so they fit within the header line width
        const maxWrapWidth = Math.max(160 * scaleMul, headerWidth);

        const { lines: formattedLines, maxLineWidth } = formatBadgeContent(
          badgeRawContent,
          (txt, isBold, isLatex) => {
            if (isLatex) {
              ctx.font = `italic ${bodyFontSize}px "KaTeX_Math", "Times New Roman", serif`;
              return ctx.measureText(latexToCanvasText(txt)).width + 3 * scaleMul;
            }
            ctx.font = isBold
              ? `bold ${bodyFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif`
              : `${bodyFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif`;
            return ctx.measureText(txt).width;
          },
          bodyFontSize,
          maxWrapWidth
        );

        // Symmetric padding: right padding equals left padding
        const contentWidth = Math.max(headerWidth, maxLineWidth);
        const cardWidth = Math.max(140 * scaleMul, contentWidth + cardPadding * 2);
        const cardHeight = cardPadding + headerHeight + formattedLines.length * lineHeight + cardPadding;

        const cardX = midPt.x + 12 * scaleMul;
        const cardY = midPt.y - cardHeight / 2;

        // Connector line
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = 1.4 * scaleMul;
        ctx.setLineDash([2 * scaleMul, 2 * scaleMul]);
        ctx.beginPath();
        ctx.moveTo(midPt.x, midPt.y);
        ctx.lineTo(cardX, cardY + cardPadding + headerFontSize / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Rectangular background (rx = 0)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.fillRect(cardX, cardY, cardWidth, cardHeight);

        // Rectangular border matching edge line color (rx = 0)
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = 1.8 * scaleMul;
        ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

        // Header title in exact same style as node badge
        ctx.fillStyle = edgeColor;
        ctx.font = `bold ${headerFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(headerTitle, cardX + cardPadding, cardY + cardPadding);

        // Header separator line
        const sepY = cardY + cardPadding + headerFontSize + 4 * scaleMul;
        ctx.strokeStyle = edgeColor + '44';
        ctx.lineWidth = 1 * scaleMul;
        ctx.beginPath();
        ctx.moveTo(cardX + cardPadding, sepY);
        ctx.lineTo(cardX + cardWidth - cardPadding, sepY);
        ctx.stroke();

        // Formatted content lines with symmetric margin
        const linesStartY = sepY + 6 * scaleMul;
        formattedLines.forEach((line, lineIdx) => {
          let curX = cardX + cardPadding;
          const curY = linesStartY + lineIdx * lineHeight;

          line.segments.forEach(seg => {
            if (seg.type === 'square') {
              const sqY = curY + (lineHeight - sqSize) / 2 - 1;
              ctx.fillStyle = seg.squareColor || '#fbbf24';
              ctx.fillRect(curX, sqY, sqSize, sqSize);
              curX += sqSize + 4 * scaleMul;
            } else if (seg.type === 'latex') {
              ctx.font = `italic ${bodyFontSize}px "KaTeX_Math", "Times New Roman", serif`;
              ctx.fillStyle = '#7dd3fc';
              ctx.textBaseline = 'top';
              const mathTxt = latexToCanvasText(seg.text || '');
              ctx.fillText(mathTxt, curX, curY);
              curX += ctx.measureText(mathTxt).width + 3 * scaleMul;
            } else if (seg.type === 'bold') {
              ctx.font = `bold ${bodyFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
              ctx.fillStyle = '#ffffff';
              ctx.textBaseline = 'top';
              ctx.fillText(seg.text || '', curX, curY);
              curX += ctx.measureText(seg.text || '').width;
            } else {
              ctx.font = `${bodyFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
              ctx.fillStyle = '#e2e8f0';
              ctx.textBaseline = 'top';
              ctx.fillText(seg.text || '', curX, curY);
              curX += ctx.measureText(seg.text || '').width;
            }
          });
        });

        ctx.restore();
      });

      ctx.restore();
      ctx.restore();

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      active = false;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
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
      const dx = worldX - node.x;
      const dy = worldY - node.y;
      const radius = node.radius || 16;
      if (dx * dx + dy * dy <= (radius + 8) * (radius + 8)) {
        return node;
      }
    }
    return null;
  }, [nodes]);

  const getEdgeAtPosition = useCallback((worldX: number, worldY: number): GraphEdge | null => {
    const nodeMap = new Map<string, GraphNode>();
    nodes.forEach(n => nodeMap.set(n.id, n));

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
  }, [nodes, edges, settings.showCurvedEdges]);

  // Requirement 4: Mouse Down handling - RMB dragging ALWAYS pans without interfering with edges/nodes
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
      const hitNode = getNodeAtPosition(worldPos.x, worldPos.y);
      if (hitNode) {
        isDraggingNode.current = hitNode;
        hitNode.isFixed = true;
        onSelectNode(hitNode);
      } else {
        onSelectNode(null);
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
      const node = isDraggingNode.current;
      node.x = worldPos.x;
      node.y = worldPos.y;
      node.vx = 0;
      node.vy = 0;
      return;
    }

    const hoveredN = getNodeAtPosition(worldPos.x, worldPos.y);
    hoveredNodeRef.current = hoveredN;

    const hoveredE = hoveredN ? null : getEdgeAtPosition(worldPos.x, worldPos.y);
    hoveredEdgeRef.current = hoveredE;
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
            // Double RMB click detected on edge -> open Edge Settings Inspector
            lastRmbEdgeClickTime.current = null;
            onOpenEdgeSettings?.(rmbHitEdge.current);
          } else {
            // First RMB click on edge -> record timestamp
            lastRmbEdgeClickTime.current = { edgeId: rmbHitEdge.current.id, time: now };
          }
        }
      }

      rmbStartPos.current = null;
      rmbHitNode.current = null;
      rmbHitEdge.current = null;
    }

    if (isDraggingNode.current) {
      isDraggingNode.current.isFixed = false;
      isDraggingNode.current = null;
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

  return (
    <div ref={containerRef} className="relative w-full h-full select-none overflow-hidden bg-slate-950" onContextMenu={handleContextMenu}>
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
    </div>
  );
};

function shadeColor(color: string, percent: number): string {
  let num = parseInt(color.replace('#', ''), 16);
  if (isNaN(num)) return color;
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
