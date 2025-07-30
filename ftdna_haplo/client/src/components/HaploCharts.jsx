import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const GeographicDistribution = ({ countries }) => {
    const data = [...countries]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return (
        <div className="w-full h-64">
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const HaplogroupDistribution = ({ distribution }) => {
    const data = Object.entries(distribution).map(([name, value]) => ({
        name,
        value
    }));

    return (
        <div className="w-full h-64">
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

const TreeNode = ({ node, level = 0, expandedNodes, setExpandedNodes }) => {
    if (!node) return null;
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    const toggleNode = () => {
        const newExpandedNodes = new Set(expandedNodes);
        if (isExpanded) {
            newExpandedNodes.delete(node.id);
        } else {
            newExpandedNodes.add(node.id);
        }
        setExpandedNodes(newExpandedNodes);
    };

    return (
        <div className="mb-2">
            <div className="flex items-center hover:bg-gray-50 rounded p-1">
                {hasChildren && (
                    <button
                        onClick={toggleNode}
                        className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 mr-2"
                    >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                )}
                <div className="flex-1">
                    <div className="font-medium">{node.name}</div>
                    <div className="text-sm text-gray-500">
                        {node.kitsCount > 0 && (
                            <span className="mr-4">Образцов: {node.kitsCount.toLocaleString()}</span>
                        )}
                        {node.tmrca && (
                            <span>TMRCA: {node.tmrca.toLocaleString()} лет назад</span>
                        )}
                    </div>
                </div>
            </div>
            {isExpanded && hasChildren && (
                <div className="ml-6 border-l-2 pl-4 mt-2">
                    {node.children.map((child, index) => (
                        <TreeNode
                            key={child.id || index}
                            node={child}
                            level={level + 1}
                            expandedNodes={expandedNodes}
                            setExpandedNodes={setExpandedNodes}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const HaploTree = ({ data }) => {
    const [expandedNodes, setExpandedNodes] = useState(new Set());

    const toggleAllNodes = (expand) => {
        if (expand) {
            const allNodes = new Set();
            const collectNodeIds = (node) => {
                if (!node) return;
                if (node.id) allNodes.add(node.id);
                if (node.children) {
                    node.children.forEach(collectNodeIds);
                }
            };
            collectNodeIds(data);
            setExpandedNodes(allNodes);
        } else {
            setExpandedNodes(new Set());
        }
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <button
                    onClick={() => toggleAllNodes(expandedNodes.size === 0)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                    {expandedNodes.size === 0 ? 'Развернуть все' : 'Свернуть все'}
                </button>
            </div>
            <div className="border-l-2 pl-4">
                <TreeNode
                    node={data}
                    expandedNodes={expandedNodes}
                    setExpandedNodes={setExpandedNodes}
                />
            </div>
        </div>
    );
};

export default {
    GeographicDistribution,
    HaplogroupDistribution,
    HaploTree
};