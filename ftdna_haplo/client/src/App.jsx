import React from 'react';
import HaploViewer from './components/HaploViewer';

function App() {
    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow">
                <div className="max-w-[1800px] mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-2xl font-bold text-gray-900">
                            FTDNA Haplogroup Explorer
                        </h1>
                        <div className="text-sm text-gray-500">
                            FTDNA & YFull Integration
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-[1800px] mx-auto px-6 py-8">
                <div className="space-y-8">
                    <HaploViewer />
                </div>
            </main>

            <footer className="bg-white border-t mt-auto">
                <div className="max-w-[1800px] mx-auto px-6 py-4">
                    <div className="text-sm text-gray-500 text-center">
                        Haplogroup Data Explorer
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;