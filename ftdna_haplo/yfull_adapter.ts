interface YFullNode {
  id: string;
  name: string;
  parentId?: string;
  children?: YFullNode[];
  variants?: string[];
  age?: number;
  formed?: number;
  tmrca?: number;
  samples?: number;
}

export class YFullAdapter {
  private tree: YFullNode;

  constructor(data: YFullNode) {
    this.tree = data;
  }

  findHaplogroup(name: string): YFullNode | null {
    const findNode = (node: YFullNode): YFullNode | null => {
      if (node.name === name) return node;
      if (node.children) {
        for (const child of node.children) {
          const found = findNode(child);
          if (found) return found;
        }
      }
      return null;
    };

    return findNode(this.tree);
  }

  getAncestryChain(haplogroupId: string): YFullNode[] {
    const node = this.findHaplogroup(haplogroupId);
    if (!node) return [];

    const chain: YFullNode[] = [];
    let currentNode: YFullNode | null = node;
    
    while (currentNode) {
      chain.unshift(currentNode);
      currentNode = currentNode.parentId ? this.findHaplogroup(currentNode.parentId) : null;
    }
    
    return chain;
  }

  getHaplogroupDetails(haplogroupId: string) {
    const node = this.findHaplogroup(haplogroupId);
    if (!node) return null;

    const ancestryChain = this.getAncestryChain(haplogroupId);
    const path = ancestryChain.map(node => node.name).join(' → ');

    return {
      id: node.id,
      name: node.name,
      path,
      variants: node.variants || [],
      statistics: {
        age: node.age,
        formed: node.formed,
        tmrca: node.tmrca,
        samples: node.samples
      },
      children: node.children?.map(child => ({
        id: child.id,
        name: child.name
      })) || []
    };
  }

  getSubtree(haplogroupId: string, depth: number = 2): YFullNode | null {
    const node = this.findHaplogroup(haplogroupId);
    if (!node) return null;

    const cloneNode = (node: YFullNode, currentDepth: number): YFullNode => {
      const clone = { ...node };
      if (currentDepth > 0 && node.children) {
        clone.children = node.children.map(child => 
          cloneNode(child, currentDepth - 1)
        );
      } else {
        clone.children = [];
      }
      return clone;
    };

    return cloneNode(node, depth);
  }

  searchWithAutocomplete(term: string): Array<{ value: string; label: string }> {
    const results: Array<{ value: string; label: string }> = [];
    const searchInNode = (node: YFullNode) => {
      if (node.name.toLowerCase().includes(term.toLowerCase())) {
        results.push({
          value: node.name,
          label: node.name
        });
      }
      if (node.children) {
        node.children.forEach(searchInNode);
      }
    };

    searchInNode(this.tree);
    return results;
  }
} 