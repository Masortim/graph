import type { GraphNode, GraphEdge } from '../types/graph';

export interface PhysicsParams {
  repulsion: number;
  attraction: number;
  clusterAttraction: number;
  gravity: number;
  damping: number;
  maxVelocity: number;
  barnesHutTheta: number;
  edgeLengthMultiplier: number;
  nodeSpacingBuffer: number;
  nodeRepulsionMultiplier: number;
}

export const DEFAULT_PHYSICS: PhysicsParams = {
  repulsion: 2200,
  attraction: 0.04,
  clusterAttraction: 0.012,
  gravity: 0.02,
  damping: 0.88,
  maxVelocity: 25,
  barnesHutTheta: 0.8,
  edgeLengthMultiplier: 1.5,
  nodeSpacingBuffer: 30,
  nodeRepulsionMultiplier: 1.2,
};

export class ForceAtlas2Simulation {
  nodes: GraphNode[] = [];
  edges: GraphEdge[] = [];
  params: PhysicsParams = { ...DEFAULT_PHYSICS };
  nodeMap: Map<string, GraphNode> = new Map();
  clusterCentroids: Map<string, { x: number; y: number; count: number }> = new Map();

  constructor(nodes: GraphNode[], edges: GraphEdge[], params?: Partial<PhysicsParams>) {
    this.setGraph(nodes, edges);
    if (params) {
      this.params = { ...this.params, ...params };
    }
  }

  setGraph(nodes: GraphNode[], edges: GraphEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.nodeMap.clear();
    nodes.forEach(n => this.nodeMap.set(n.id, n));
  }

  step(alpha = 1.0) {
    const { 
      repulsion, 
      attraction, 
      clusterAttraction, 
      gravity, 
      damping, 
      maxVelocity,
      edgeLengthMultiplier,
      nodeSpacingBuffer,
      nodeRepulsionMultiplier
    } = this.params;
    
    const n = this.nodes.length;
    if (n === 0) return;

    // 1. Calculate cluster centroids
    this.clusterCentroids.clear();
    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      const cId = node.clusterId || 'default';
      const c = this.clusterCentroids.get(cId);
      if (c) {
        c.x += node.x;
        c.y += node.y;
        c.count++;
      } else {
        this.clusterCentroids.set(cId, { x: node.x, y: node.y, count: 1 });
      }
    }
    this.clusterCentroids.forEach(c => {
      c.x /= c.count;
      c.y /= c.count;
    });

    const effectiveRepulsion = repulsion * nodeRepulsionMultiplier;

    // 2. Repulsion between all node pairs + Anti-Overlap Separation Force
    for (let i = 0; i < n; i++) {
      const n1 = this.nodes[i];
      if (n1.isFixed) continue;

      const deg1 = (n1.connectedCount || 1) + 1;

      for (let j = i + 1; j < n; j++) {
        const n2 = this.nodes[j];
        const deg2 = (n2.connectedCount || 1) + 1;

        let dx = n2.x - n1.x;
        let dy = n2.y - n1.y;
        
        // Prevent exact 0 distance singularity
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) {
          dx = (Math.random() - 0.5) * 2;
          dy = (Math.random() - 0.5) * 2;
        }

        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        // Required non-overlap clearance
        const minSeparation = (n1.radius || 16) + (n2.radius || 16) + nodeSpacingBuffer;
        
        // Standard FA2 anti-gravity repulsion
        let force = (effectiveRepulsion * (deg1 + 1) * (deg2 + 1)) / (Math.max(dist, 10) * Math.max(dist, 10));

        // Strict Anti-Overlap Spring Force: pushes overlapping or near nodes strongly apart
        if (dist < minSeparation) {
          const overlapFactor = (minSeparation - dist) / minSeparation;
          force += overlapFactor * 45;
        }

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (!n1.isFixed) {
          n1.vx -= fx / (n1.weight || 10);
          n1.vy -= fy / (n1.weight || 10);
        }
        if (!n2.isFixed) {
          n2.vx += fx / (n2.weight || 10);
          n2.vy += fy / (n2.weight || 10);
        }
      }
    }

    // 3. Attraction along edges with dynamic Edge Length Multiplier
    const m = this.edges.length;
    for (let i = 0; i < m; i++) {
      const edge = this.edges[i];
      const source = this.nodeMap.get(edge.source);
      const target = this.nodeMap.get(edge.target);

      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;

      // Ideal distance scales with edgeLengthMultiplier (удлинить дуги / раздвинуть вершины)
      const baseDistance = (source.radius + target.radius) * 3.2;
      const idealDist = baseDistance * edgeLengthMultiplier;
      const displacement = dist - idealDist;
      
      const edgeWeightFactor = Math.log(1 + (edge.weight || 1));
      const force = displacement * attraction * edgeWeightFactor;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (!source.isFixed) {
        source.vx += fx;
        source.vy += fy;
      }
      if (!target.isFixed) {
        target.vx -= fx;
        target.vy -= fy;
      }
    }

    // 4. Cluster Attraction & Central Gravity
    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      if (node.isFixed) continue;

      // Central gravity
      const distToCenter = Math.sqrt(node.x * node.x + node.y * node.y) + 0.1;
      const gForce = gravity * (node.weight || 10) * (distToCenter * 0.0018);
      node.vx -= (node.x / distToCenter) * gForce;
      node.vy -= (node.y / distToCenter) * gForce;

      // Intra-cluster pull
      const cId = node.clusterId || 'default';
      const centroid = this.clusterCentroids.get(cId);
      if (centroid && centroid.count > 1) {
        const cdx = centroid.x - node.x;
        const cdy = centroid.y - node.y;
        node.vx += cdx * clusterAttraction;
        node.vy += cdy * clusterAttraction;
      }

      // Apply damping & clamp maximum speed
      node.vx *= damping;
      node.vy *= damping;

      const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
      if (speed > maxVelocity) {
        node.vx = (node.vx / speed) * maxVelocity;
        node.vy = (node.vy / speed) * maxVelocity;
      }

      node.x += node.vx * alpha;
      node.y += node.vy * alpha;
    }
  }
}
