export type NodeType = 'chapter' | 'section' | 'subsection' | 'concept' | 'merged';

export interface InfoBadge {
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  scale?: number; // 1.0 (100%) to 3.0 (300%)
  language?: 'en' | 'cn';
}

export interface GraphNode {
  id: string;
  labelEn: string;
  labelCn: string;
  originalLabelEn?: string;
  originalLabelCn?: string;
  type: NodeType;
  level: number; // 1: chapter, 2: section, 3: subsection, 4+: concept/merged
  parentId?: string;
  chapterId?: string;
  sectionId?: string;
  filePath?: string;
  
  // Content
  rawText?: string;
  keyPhrases?: string[];
  
  // Graph Physics & Visual Properties
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  weight: number;
  color: string;
  clusterId: string;
  isFixed?: boolean;
  isCustomOrEdited?: boolean;
  isAssistantProposal?: boolean; // Highlight node proposed by assistant
  
  // Size & Frequency Metrics
  frequency?: number; // Total occurrences of key phrases across entire Obsidian vault
  sizeLevel?: number; // Size level from 1 to 9
  customSizeLevel?: number; // Manual override for size level (1 to 9)
  
  // Info attachment
  infoBadge?: InfoBadge;
  badgeScale?: number; // 1.0 to 3.0 (default: 1.0)
  
  // Deleted edge keys tracked for persistence: e.g. ["sourceId<->targetId"]
  deletedEdgeKeys?: string[];
  
  // Merge metadata & Snapshots for Unmerging
  mergedFrom?: {
    nodeAId: string;
    nodeBId: string;
    nodeALabel: string;
    nodeBLabel: string;
    nodeAOriginalEn?: string;
    nodeBOriginalEn?: string;
    nodeASnapshot?: GraphNode;
    nodeBSnapshot?: GraphNode;
    originalEdgesSnapshot?: GraphEdge[];
    date: string;
  };
  
  // Statistics
  phraseMatchCount?: number;
  connectedCount?: number;
}

export type EdgeType = 'hierarchy' | 'semantic' | 'merged' | 'manual';

export interface GraphEdge {
  id: string;
  source: string; // Node id
  target: string; // Node id
  type: EdgeType;
  weight: number;
  label?: string;
  curvature?: number;
  color?: string;
  isManual?: boolean;
  isAssistantProposal?: boolean; // Highlight edge proposed/edited by assistant
  
  // Edge Custom Styling
  lineStyle?: 'solid' | 'dashed';
  style?: 'solid' | 'dashed';
  thickness?: number; // 1 to 9
  infoBadge?: InfoBadge;
  badgeScale?: number; // 1.0 (100%) to 3.0 (300%), step 0.25 (25%), default 1.0 (100%)
  badgeLanguage?: 'en' | 'cn'; // Language for automatic edge header ('cn' by default)
  
  matchedPhrases?: {
    phrase: string;
    count: number;
  }[];
}

export interface ObsidianFileRaw {
  path: string;
  chapter: string;
  fileName: string;
  content: string;
}

export interface GraphSettings {
  // Edge settings
  showCurvedEdges: boolean;
  edgeColor: string;
  edgeThickness: number;
  edgeOpacity: number;
  edgeLength: number;
  
  // Node & Density settings
  nodeSpacing: number;
  nodeRepulsionMultiplier: number;
  
  // General settings
  showLabels: boolean;
  physicsRunning: boolean;
}

export interface ProjectState {
  version: string;
  name: string;
  vaultName?: string;
  vaultFolderPath?: string;
  createdAt: string;
  updatedAt: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  pinnedBadgeNodeIds?: string[];
  pinnedBadgeEdgeIds?: string[];
  deletedEdgeKeys?: string[];
  settings: GraphSettings;
  proposalLog?: ProposalChangeItem[];
}

export type AppMode = 'author' | 'student' | 'assistant';

export interface ProposalChangeItem {
  id: string;
  type: 'add_node' | 'edit_edge_badge' | 'edit_node_badge' | 'recommend_delete_edge' | 'recommend_merge_nodes';
  targetId: string;
  targetTitle: string;
  description: string;
  details?: string;
  isProcessed?: boolean;
  nodeData?: Partial<GraphNode>;
  edgeData?: Partial<GraphEdge>;
  timestamp: string;
}

export interface AssistantProposal {
  version: string;
  authorName: string;
  createdAt: string;
  notes?: string;
  changes: ProposalChangeItem[];
  snapshotNodes: GraphNode[];
  snapshotEdges: GraphEdge[];
}
