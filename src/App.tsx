import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import CanvasEditor from './components/CanvasEditor';
import KonvaEditor from './components/KonvaEditor';
import GeminiEditor from './components/GeminiEditor';
import SkiaEditor from './components/SkiaEditor';
import EditorComparison from './components/EditorComparison';
import GraphicEditor from './components/GraphicEditor';
import RichtextEditor from './components/Richtext/App';

const Navigation = ({ isVisible, onToggle }: { isVisible: boolean; onToggle: () => void }) => {
    return (
        <div className="relative">
            {/* Navigation Bar */}
            <nav
                className={`bg-white border-b border-gray-200 px-6 py-3 flex gap-4 items-center transition-all duration-300 overflow-hidden ${
                    isVisible ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0 py-0 border-b-0'
                }`}
            >
                <Link
                    to="/"
                    className="px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                    Canvas
                </Link>
                <Link
                    to="/konva"
                    className="px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                    Konva
                </Link>
                <Link
                    to="/gemini"
                    className="px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors text-purple-600"
                >
                    Gemini
                </Link>
                <Link
                    to="/comparison"
                    className="px-4 py-2 rounded-md text-sm hover:bg-gray-100 transition-colors text-blue-600 font-bold"
                >
                    Comparison
                </Link>
                <Link
                    to="/skia"
                    className="px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                    Skia
                </Link>
                <Link
                    to="/graphic"
                    className="px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-50 transition-colors text-emerald-600 border border-emerald-200"
                >
                    Graphic Editor
                </Link>
                <Link
                    to="/richtext"
                    className="px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors text-blue-600 border border-blue-200"
                >
                    Rich Text
                </Link>
            </nav>

            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className={`absolute left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-b-lg transition-all duration-300 shadow-md ${
                    isVisible
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 top-full'
                        : 'bg-white text-gray-600 hover:bg-gray-50 top-0 rounded-t-none border border-t-0 border-gray-200'
                }`}
                title={isVisible ? 'Hide navigation' : 'Show navigation'}
            >
                {isVisible ? (
                    <>
                        <ChevronUp size={14} />
                        <span>Hide</span>
                    </>
                ) : (
                    <>
                        <ChevronDown size={14} />
                        <span>Menu</span>
                    </>
                )}
            </button>
        </div>
    );
};

const App = () => {
    const [navVisible, setNavVisible] = useState(true);

    return (
        <Router>
            <div className="h-screen flex flex-col">
                <Navigation isVisible={navVisible} onToggle={() => setNavVisible(!navVisible)} />
                <div className="flex-1 overflow-hidden">
                    <Routes>
                        <Route path="/" element={<CanvasEditor />} />
                        <Route path="/konva" element={<KonvaEditor />} />
                        <Route path="/gemini" element={<GeminiEditor />} />
                        <Route path="/comparison" element={<EditorComparison />} />
                        <Route path="/skia" element={<SkiaEditor />} />
                        <Route path="/graphic" element={<GraphicEditor />} />
                        <Route path="/richtext" element={<RichtextEditor />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
};

export default App;
