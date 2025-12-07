import type { DesignElement } from '../../../shared/model/types';

const PropertiesPanel = ({
  element,
  onCheckpoint,
}: {
  element: DesignElement;
  onCheckpoint: () => void;
}) => {
  return (
    <div className="flex flex-col h-full bg-white animate-in slide-in-from-left duration-200">
      <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4 font-bold text-xs uppercase tracking-wider text-gray-600 bg-gray-50">
        <span>Edit {element.type}</span>
        <span className="text-violet-600">#{element.id.substr(0, 4)}</span>
      </div>

      <div id="properties-portal-target" className="flex-1 overflow-y-auto" />
    </div>
  );
};

export default PropertiesPanel;
