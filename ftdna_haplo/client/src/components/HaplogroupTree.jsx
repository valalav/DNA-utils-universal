import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export const HaplogroupTree = ({ ftdnaData, yfullData }) => {
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [showYfull, setShowYfull] = useState(true);
    const [showFtdna, setShowFtdna] = useState(true);

    const calculateTotalKits = (node) => {
        if (!node) return 0;
        let total = node.kitsCount || 0;
        if (node.children) {
            total += node.children.reduce((sum, child) => sum + calculateTotalKits(child), 0);
        }
        return total;
    };

    const toggleNode = (id) => {
        const newExpandedNodes = new Set(expandedNodes);
        if (expandedNodes.has(id)) {
            newExpandedNodes.delete(id);
        } else {
            newExpandedNodes.add(id);
        }
        setExpandedNodes(newExpandedNodes);
    };

    const TreeNode = ({ node, level = 0, source }) => {
        if (!node) return null;
        const isExpanded = expandedNodes.has(node.id);
        const hasChildren = node.children && node.children.length > 0;
        const totalKits = calculateTotalKits(node);
        const indent = level * 24;

        return (
            <div className="mb-2">
                <div 
                    className="flex items-center hover:bg-gray-50 rounded p-1" 
                    style={{ marginLeft: `${indent}px` }}
                >
                    {hasChildren ? (
                        <button
                            onClick={() => toggleNode(node.id)}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 mr-2"
                        >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    ) : (
                        <div className="w-6 h-6 mr-2" />
                    )}

                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{node.name}</span>
                            {source === 'ftdna' && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                    FTDNA
                                </span>
                            )}
                            {source === 'yfull' && (
                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                                    YFull
                                </span>
                            )}
                        </div>
                        <div className="text-sm text-gray-500">
                            {node.kitsCount > 0 && (
                                <span className="mr-4">
                                    Образцов: {node.kitsCount.toLocaleString()}
                                </span>
                            )}
                            {totalKits !== node.kitsCount && totalKits > 0 && (
                                <span>Всего в ветви: {totalKits.toLocaleString()}</span>
                            )}
                            {node.tmrca && (
                                <span className="ml-4">
                                    TMRCA: {node.tmrca.toLocaleString()} лет назад
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {isExpanded && hasChildren && (
                    <div className="mt-1">
                        {node.children.map((child, index) => (
                            <TreeNode
                                key={child.id || index}
                                node={child}
                                level={level + 1}
                                source={source}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow p-4">
            <div className="mb-4 flex items-center gap-4">
                <h3 className="font-medium text-lg">Древо гаплогрупп</h3>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1">
                        <input
                            type="checkbox"
                            checked={showFtdna}
                            onChange={(e) => setShowFtdna(e.target.checked)}
                            className="rounded text-blue-600"
                        />
                        <span className="text-sm">FTDNA</span>
                    </label>
                    <label className="flex items-center gap-1">
                        <input
                            type="checkbox"
                            checked={showYfull}
                            onChange={(e) => setShowYfull(e.target.checked)}
                            className="rounded text-green-600"
                        />
                        <span className="text-sm">YFull</span>
                    </label>
                </div>
            </div>

            <div className="space-y-4">
                {showFtdna && ftdnaData && (
                    <TreeNode node={ftdnaData} source="ftdna" />
                )}
                {showYfull && yfullData && (
                    <TreeNode node={yfullData} source="yfull" />
                )}
            </div>
        </div>
    );
};

export default HaplogroupTree;
