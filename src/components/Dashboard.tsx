import Sidebar from './Sidebar';

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto flex">
        <Sidebar />

        <main className="flex-1 p-8">
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-200">
            <h1 className="text-2xl font-bold mb-4">Overzicht</h1>
            <p className="text-gray-600 mb-6">Dit is een simpele dashboardpagina met een sidebar.</p>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 border rounded">Kaart 1: Statistiek of widget</div>
              <div className="p-4 bg-gray-50 border rounded">Kaart 2: Notities of taken</div>
              <div className="p-4 bg-gray-50 border rounded">Kaart 3: Activiteiten</div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
