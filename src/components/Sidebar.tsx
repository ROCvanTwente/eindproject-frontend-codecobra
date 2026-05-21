import { Link } from 'react-router-dom';

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen px-4 py-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Dashboard</h3>
        <p className="text-sm text-gray-500">Welkom terug!</p>
      </div>

      <nav className="space-y-2">
        <Link to="/dashboard" className="block px-3 py-2 rounded text-gray-800 hover:bg-gray-100">Overzicht</Link>
        <Link to="#" className="block px-3 py-2 rounded text-gray-800 hover:bg-gray-100">Berichten</Link>
        <Link to="#" className="block px-3 py-2 rounded text-gray-800 hover:bg-gray-100">Instellingen</Link>
        <Link to="#" className="block px-3 py-2 rounded text-gray-800 hover:bg-gray-100">Profiel</Link>
      </nav>
    </aside>
  );
};

export default Sidebar;