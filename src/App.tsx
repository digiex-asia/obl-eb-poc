import { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from 'react-router-dom';
import {
  PanelRightOpen,
  LayoutDashboard,
  Layers,
  Palette,
  PenTool,
  Type,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import CanvasEditor from './components/CanvasEditor';
import KonvaEditor from './components/KonvaEditor';
import SkiaEditor from './components/SkiaEditor';
import GraphicEditor from './components/GraphicEditor';
import RichtextEditor from './components/Richtext/App';
import TextEditor from './components/TextEditor';

/**
 * Navigation item configuration
 */
interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  color?: string;
}

/**
 * Sidebar expansion level: 0 = hidden, 1 = icons only, 2 = full (icons + text)
 */
type ExpansionLevel = 0 | 1 | 2;

const navItems: NavItem[] = [
  { path: '/', label: 'Canvas', icon: <LayoutDashboard size={20} /> },
  { path: '/konva', label: 'Konva', icon: <Layers size={20} /> },
  { path: '/skia', label: 'Skia', icon: <Palette size={20} /> },
  {
    path: '/graphic',
    label: 'Graphic',
    icon: <PenTool size={20} />,
    color: 'text-emerald-600',
  },
  {
    path: '/richtext',
    label: 'Rich Text',
    icon: <Type size={20} />,
    color: 'text-blue-600',
  },
  {
    path: '/text-editor',
    label: 'Text Editor',
    icon: <Type size={20} />,
    color: 'text-blue-600',
  },
];

/**
 * Vertical sidebar navigation component
 */
const SidebarNavigation = ({
  level,
  onToggle,
}: {
  level: ExpansionLevel;
  onToggle: () => void;
}) => {
  const location = useLocation();

  // Width based on level: 0 = hidden, 1 = icon only (56px), 2 = full (176px)
  const widthClass =
    level === 0 ? 'w-0 border-r-0' : level === 1 ? 'w-14' : 'w-44';
  const innerWidth = level === 1 ? 'w-14' : 'w-44';

  return (
    <>
      {/* Sidebar with slide animation - flex-shrink-0 prevents shrinking */}
      <nav
        className={`h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden transition-all duration-300 ease-in-out flex-shrink-0 ${widthClass}`}
      >
        <div
          className={`${innerWidth} flex-1 py-2 flex flex-col gap-1 overflow-y-auto`}
        >
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 py-2.5 mx-2 rounded-lg transition-colors ${
                  level === 1 ? 'justify-center px-0' : 'px-3'
                } ${isActive ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'} ${item.color || 'text-gray-700'}`}
                title={level === 1 ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {level === 2 && (
                  <span className="text-sm truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Floating Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed bottom-4 left-4 z-50 flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md hover:bg-gray-100 transition-colors"
        title={
          level === 0
            ? 'Show icons'
            : level === 1
              ? 'Show full menu'
              : 'Collapse menu'
        }
      >
        {level === 0 ? (
          <PanelRightOpen size={18} />
        ) : level === 1 ? (
          <ChevronsRight size={18} />
        ) : (
          <ChevronsLeft size={18} />
        )}
      </button>
    </>
  );
};

const App = () => {
  const [navLevel, setNavLevel] = useState<ExpansionLevel>(0);

  const handleToggle = () => {
    // Cycle through levels: 2 -> 1 -> 0 -> 2
    setNavLevel(prev => (prev === 0 ? 2 : prev - 1) as ExpansionLevel);
  };

  return (
    <Router>
      <div className="h-screen flex">
        <SidebarNavigation level={navLevel} onToggle={handleToggle} />
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<CanvasEditor />} />
            <Route path="/konva" element={<KonvaEditor />} />
            <Route path="/skia" element={<SkiaEditor />} />
            <Route path="/graphic" element={<GraphicEditor />} />
            <Route path="/richtext" element={<RichtextEditor />} />
            <Route path="/text-editor" element={<TextEditor />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
