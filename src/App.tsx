import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CanvasEditor from './components/CanvasEditor';
import KonvaEditor from './components/KonvaEditor';
import SkiaEditor from './components/SkiaEditor';

const Navigation = () => {
    return (
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex gap-4">
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
                to="/skia"
                className="px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors"
            >
                Skia
            </Link>
        </nav>
    );
};

const App = () => {
    return (
        <Router>
            <div className="h-screen flex flex-col">
                <Navigation />
                <div className="flex-1 overflow-hidden">
                    <Routes>
                        <Route path="/" element={<CanvasEditor />} />
                        <Route path="/konva" element={<KonvaEditor />} />
                        <Route path="/skia" element={<SkiaEditor />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
};

export default App;
