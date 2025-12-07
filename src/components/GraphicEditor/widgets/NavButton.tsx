const NavButton = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full aspect-square flex flex-col items-center justify-center gap-1.5 transition-all relative ${active ? 'text-violet-600 bg-violet-50' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
  >
    <Icon size={20} strokeWidth={2} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default NavButton;
