import React from 'react';
import { Navbar } from './components/Navbar';
import { WiringVisualizer } from './components/WiringVisualizer';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="bg-gray-900 rounded-2xl shadow-xl border border-gray-800 overflow-hidden min-h-[600px]">
          <WiringVisualizer />
        </div>
      </main>

      <footer className="text-center py-6 text-gray-500 text-sm">
        <p>Powered by Google Gemini 3 Pro</p>
      </footer>
    </div>
  );
};

export default App;