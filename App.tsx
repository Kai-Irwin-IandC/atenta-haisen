import React from 'react';
import ImageGeneratorTool from './components/ImageGeneratorTool';

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
               AI
             </div>
             <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700">
               AI 配線図生成アプリ
             </h1>
          </div>
          
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="py-6">
          <ImageGeneratorTool />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-slate-400 text-sm">
        <p>@2026 Irwin&co All Right Reserved</p>
      </footer>
    </div>
  );
}

export default App;