import React, { useEffect, useState } from 'react';
import { apiClient } from '@/utils/axios';

const HaplogroupInfoPopup = ({ haplogroup, onClose }) => {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHaplogroupPath = async () => {
            try {
                const response = await apiClient.get(`/haplogroup-path/${encodeURIComponent(haplogroup)}`);

                if (!response.data.ftdnaDetails && !response.data.yfullDetails) {
                    throw new Error('No haplogroup data found');
                }

                setResult(response.data);
            } catch (err) {
                console.error('Error fetching haplogroup path:', err);
                setError(err instanceof Error ? err.message : 'Failed to load haplogroup path');
            } finally {
                setLoading(false);
            }
        };

        fetchHaplogroupPath();
    }, [haplogroup]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Гаплогруппа: {haplogroup}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ✕
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-4">Загрузка...</div>
                ) : error ? (
                    <div className="text-red-500 py-4">{error}</div>
                ) : (
                    <div className="space-y-4">
                        {result?.ftdnaDetails && (
                            <div>
                                <h3 className="font-semibold text-blue-600 mb-2">Путь FTDNA</h3>
                                <p className="text-sm bg-gray-50 p-3 rounded">
                                    {result.ftdnaDetails.path.string}
                                </p>
                                <a
                                    href={result.ftdnaDetails.url || `https://discover.familytreedna.com/y-dna/${haplogroup}/tree`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-500 hover:underline mt-1 inline-block"
                                >
                                    Открыть в FTDNA →
                                </a>
                                {result.ftdnaDetails.matchInfo?.confidence < 1 && (
                                    <div className="mt-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                                        Match confidence: {Math.round(result.ftdnaDetails.matchInfo.confidence * 100)}%
                                    </div>
                                )}
                            </div>
                        )}

                        {result?.yfullDetails && (
                            <div>
                                <h3 className="font-semibold text-green-600 mb-2">Путь YFull</h3>
                                <p className="text-sm bg-gray-50 p-3 rounded">
                                    {result.yfullDetails.path.string}
                                </p>
                                <a
                                    href={result.yfullDetails.url || `https://www.yfull.com/tree/${haplogroup}/`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-green-500 hover:underline mt-1 inline-block"
                                >
                                    Открыть в YFull →
                                </a>
                                {result.yfullDetails.matchInfo?.confidence < 1 && (
                                    <div className="mt-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                                        Match confidence: {Math.round(result.yfullDetails.matchInfo.confidence * 100)}%
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Variants Section */}
                        {(result?.ftdnaDetails?.variants || result?.yfullDetails?.variants) && (
                            <div className="mt-4">
                                <h3 className="font-semibold mb-2">Variants</h3>
                                {result.ftdnaDetails?.variants && (
                                    <div className="mb-2">
                                        <h4 className="text-blue-600 text-sm mb-1">FTDNA Variants</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {result.ftdnaDetails.variants.map((v, i) => (
                                                <span key={i} className="px-2 py-1 bg-blue-50 text-sm rounded">
                                                    {v.variant || v.snp}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {result.yfullDetails?.variants && (
                                    <div>
                                        <h4 className="text-green-600 text-sm mb-1">YFull Variants</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {result.yfullDetails.variants.map((v, i) => (
                                                <span key={i} className="px-2 py-1 bg-green-50 text-sm rounded">
                                                    {v.variant || v.snp}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HaplogroupInfoPopup; 