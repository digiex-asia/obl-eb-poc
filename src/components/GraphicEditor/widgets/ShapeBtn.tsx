const ShapeBtn = ({ icon: Icon, type, onDragStart, onClick }: any) => (
  <div
    draggable
    onDragStart={e => onDragStart(e, type)}
    onClick={onClick}
    className="aspect-square bg-gray-200 rounded-md flex items-center justify-center text-gray-600 hover:bg-violet-100 hover:text-violet-600 transition-colors cursor-grab"
  >
    <Icon size={24} strokeWidth={1.5} />
  </div>
);

export default ShapeBtn;
