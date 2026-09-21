import type { GraphNode } from '../types/graph';

export interface LabelExportItem {
  id: string;
  labelEn: string;
  labelCn: string;
  type: string;
  level: number;
}

// 1. Export as structured JSON (standard array)
export function exportLabelsToJson(nodes: GraphNode[]): string {
  const items: LabelExportItem[] = nodes.map(n => ({
    id: n.id,
    labelEn: n.labelEn,
    labelCn: n.labelCn || '',
    type: n.type,
    level: n.level,
  }));
  return JSON.stringify(items, null, 2);
}

// 2. Export as Key-Value Translation Dictionary (ideal for LLM prompt / fast editing)
export function exportLabelsToDictJson(nodes: GraphNode[]): string {
  const dict: Record<string, string> = {};
  nodes.forEach(n => {
    dict[n.labelEn] = n.labelCn || '';
  });
  return JSON.stringify(dict, null, 2);
}

// 3. Export as CSV / TSV
export function exportLabelsToCsv(nodes: GraphNode[], delimiter = '\t'): string {
  const header = ['id', 'labelEn', 'labelCn', 'type', 'level'].join(delimiter);
  const rows = nodes.map(n => {
    const en = (n.labelEn || '').replace(/"/g, '""');
    const cn = (n.labelCn || '').replace(/"/g, '""');
    return `"${n.id}"${delimiter}"${en}"${delimiter}"${cn}"${delimiter}"${n.type}"${delimiter}${n.level}`;
  });
  return [header, ...rows].join('\n');
}

// 4. Import & Apply labels from JSON or CSV text
export function applyLabelsToNodes(
  currentNodes: GraphNode[],
  rawContent: string
): { updatedNodes: GraphNode[]; updatedCount: number } {
  let updatedCount = 0;
  const nodeMapById = new Map<string, GraphNode>();
  const nodeMapByEn = new Map<string, GraphNode>();

  const newNodes = currentNodes.map(n => ({ ...n }));
  newNodes.forEach(n => {
    nodeMapById.set(n.id, n);
    nodeMapByEn.set(n.labelEn.trim().toLowerCase(), n);
  });

  const trimmed = rawContent.trim();

  // Try parsing as JSON first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);

      // Case A: Array of LabelExportItem
      if (Array.isArray(parsed)) {
        parsed.forEach((item: Partial<LabelExportItem>) => {
          let target: GraphNode | undefined = undefined;
          if (item.id && nodeMapById.has(item.id)) {
            target = nodeMapById.get(item.id);
          } else if (item.labelEn && nodeMapByEn.has(item.labelEn.trim().toLowerCase())) {
            target = nodeMapByEn.get(item.labelEn.trim().toLowerCase());
          }

          if (target && item.labelCn !== undefined) {
            target.labelCn = item.labelCn.trim();
            if (item.labelEn && item.labelEn.trim().length > 0) {
              target.labelEn = item.labelEn.trim();
            }
            updatedCount++;
          }
        });
        return { updatedNodes: newNodes, updatedCount };
      }

      // Case B: Key-Value Dictionary { "English Label": "中文翻译", ... }
      if (typeof parsed === 'object' && parsed !== null) {
        Object.entries(parsed).forEach(([enKey, cnVal]) => {
          const target = nodeMapByEn.get(enKey.trim().toLowerCase());
          if (target && typeof cnVal === 'string') {
            target.labelCn = cnVal.trim();
            updatedCount++;
          }
        });
        return { updatedNodes: newNodes, updatedCount };
      }
    } catch (e) {
      console.warn('JSON parse failed, attempting CSV/TSV parse', e);
    }
  }

  // Case C: CSV / TSV parser
  const lines = trimmed.split(/\r?\n/);
  if (lines.length > 0) {
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    
    lines.forEach((line, idx) => {
      if (idx === 0 && (line.toLowerCase().includes('labelen') || line.toLowerCase().includes('id'))) {
        return; // Skip header
      }
      
      // Simple parse respecting quotes
      const regex = new RegExp(`(?:^|${delimiter})(?:"([^"]*(?:""[^"]*)*)"|([^${delimiter}]*))`, 'g');
      const matches: string[] = [];
      let match;
      while ((match = regex.exec(line)) !== null) {
        let val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
        matches.push((val || '').trim());
      }

      if (matches.length >= 3) {
        const id = matches[0];
        const labelEn = matches[1];
        const labelCn = matches[2];

        let target: GraphNode | undefined = undefined;
        if (id && nodeMapById.has(id)) {
          target = nodeMapById.get(id);
        } else if (labelEn && nodeMapByEn.has(labelEn.toLowerCase())) {
          target = nodeMapByEn.get(labelEn.toLowerCase());
        }

        if (target && labelCn) {
          target.labelCn = labelCn;
          if (labelEn) target.labelEn = labelEn;
          updatedCount++;
        }
      }
    });
  }

  return { updatedNodes: newNodes, updatedCount };
}
