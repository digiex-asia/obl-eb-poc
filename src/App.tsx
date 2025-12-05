import { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from 'react-router-dom';
import {
  PanelRightClose,
  PanelRightOpen,
  LayoutDashboard,
  Layers,
  Palette,
  PenTool,
  Type,
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
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const location = useLocation();

  return (
    <nav
      className={`h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
        isExpanded ? 'w-44' : 'w-14'
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center h-12 border-b border-gray-200 hover:bg-gray-100 transition-colors"
        title={isExpanded ? 'Collapse menu' : 'Expand menu'}
      >
        {isExpanded ? (
          <PanelRightClose size={20} />
        ) : (
          <PanelRightOpen size={20} />
        )}
      </button>

      {/* Navigation Items */}
      <div className="flex-1 py-2 flex flex-col gap-1 overflow-y-auto">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-colors ${
                isActive ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'
              } ${item.color || 'text-gray-700'}`}
              title={!isExpanded ? item.label : undefined}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {isExpanded && (
                <span className="text-sm truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

const App = () => {
  const [navExpanded, setNavExpanded] = useState(true);

  return (
    <Router>
      <div className="h-screen flex">
        <SidebarNavigation
          isExpanded={navExpanded}
          onToggle={() => setNavExpanded(!navExpanded)}
        />
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
