const Canvas = ({
  canvasRef,
  containerRef,
  isSpacePressed,
  onDragOver,
  onDrop,
}: any) => {
  return (
    <div className="flex-1 flex flex-col relative bg-[#e5e7eb] overflow-hidden">
      <div
        className={`flex-1 relative overflow-hidden ${isSpacePressed ? 'cursor-grab active:cursor-grabbing' : ''}`}
        ref={containerRef}
        onDragOver={onDragOver}
        onDrop={onDrop}
        tabIndex={0}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-full cursor-crosshair"
        />
      </div>
    </div>
  );
};

export default Canvas;
