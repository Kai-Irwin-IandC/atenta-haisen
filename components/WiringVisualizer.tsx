import React, { useState, useRef, useCallback } from 'react';
import { generateWiringVisualization } from '../services/gemini';

export const WiringVisualizer: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("ファイルサイズは5MB以下にしてください。");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setGeneratedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
       const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setGeneratedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleGenerate = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setError(null);

    try {
      // Extract base64 data and mime type
      const [mimeTypePrefix, base64Data] = selectedImage.split(';base64,');
      const mimeType = mimeTypePrefix.split(':')[1];

      const result = await generateWiringVisualization(base64Data, mimeType);
      setGeneratedImage(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "画像の生成に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setSelectedImage(null);
    setGeneratedImage(null);
    setError(null);
  };

  // --------------------------------------------------------------------------
  // VIEW: LOADING STATE
  // --------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[600px] p-8 animate-fade-in">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
          <div className="relative w-32 h-32 rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-2xl">
            {selectedImage && (
              <img src={selectedImage} alt="Processing" className="w-full h-full object-cover opacity-60" />
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">配線図を生成中...</h3>
        <p className="text-gray-400 text-center max-w-md">
          Gemini 3.0が現場写真を解析し、最適な配線ルートを計算・描画しています。<br/>
          この処理には数秒〜数十秒かかる場合があります。
        </p>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW: RESULT STATE (Before / After)
  // --------------------------------------------------------------------------
  if (generatedImage) {
    return (
      <div className="flex flex-col h-full min-h-[600px] p-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            生成完了
          </h2>
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={reset}
              className="flex-1 md:flex-none px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors"
            >
              新しく作成する
            </button>
            <a 
              href={generatedImage} 
              download="wiring-visualized.png"
              className="flex-1 md:flex-none px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              画像をダウンロード
            </a>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
          {/* Before */}
          <div className="flex flex-col gap-2 h-full">
            <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-500"></span> Before (元画像)
            </span>
            <div className="flex-1 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden relative group">
               {selectedImage && (
                 <img src={selectedImage} alt="Original" className="w-full h-full object-contain bg-gray-900/50" />
               )}
            </div>
          </div>

          {/* After */}
          <div className="flex flex-col gap-2 h-full">
            <span className="text-sm font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> After (配線図)
            </span>
            <div className="flex-1 bg-gray-800 rounded-xl border border-indigo-500/30 shadow-2xl shadow-indigo-900/20 overflow-hidden relative">
               <img src={generatedImage} alt="Generated" className="w-full h-full object-contain bg-gray-900/50" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // VIEW: INITIAL INPUT STATE
  // --------------------------------------------------------------------------
  return (
    <div className="p-6 md:p-8 flex flex-col h-full gap-8">
      <div className="flex flex-col gap-2 text-center md:text-left">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
          <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          配線イメージ生成システム
        </h2>
        <p className="text-gray-400">
          現場写真をアップロードし、ボタンを押すだけでAIが配線ルートを可視化します。
        </p>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 max-w-2xl mx-auto w-full gap-8">
          
          {/* Upload Area */}
          <div 
            className={`w-full aspect-video border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 transition-all relative overflow-hidden group cursor-pointer ${selectedImage ? 'border-indigo-500 bg-gray-800' : 'border-gray-600 bg-gray-800/30 hover:bg-gray-800 hover:border-indigo-400'}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => !selectedImage && fileInputRef.current?.click()}
          >
            {selectedImage ? (
              <div className="relative w-full h-full flex items-center justify-center group-hover:opacity-90 transition-opacity">
                <img src={selectedImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
                <button 
                  onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-red-600 text-white rounded-full transition-colors backdrop-blur-sm"
                  title="画像を削除"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <div className="text-center">
                <svg className="mx-auto h-16 w-16 text-gray-500 group-hover:text-indigo-400 transition-colors mb-4 transform group-hover:scale-110 duration-200" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="text-lg text-gray-300 font-medium">現場写真をアップロード</p>
                <p className="text-sm text-gray-500 mt-2">クリック または ドラッグ＆ドロップ</p>
                <p className="text-xs text-gray-600 mt-4 px-4 py-1 bg-gray-800 rounded-full inline-block">対応形式: JPG, PNG</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*"
            />
          </div>

          {/* Action Area */}
          <div className="w-full flex flex-col gap-4">
            <button
              onClick={handleGenerate}
              disabled={!selectedImage}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl ${
                !selectedImage
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.02] shadow-indigo-600/20 ring-1 ring-indigo-500'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              配線図を生成
            </button>
            
            {error && (
              <div className="p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-200 text-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}
          </div>
          
          {/* Legend Help */}
          <div className="w-full bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 text-sm text-gray-400">
             <p className="mb-2 font-semibold text-gray-300">認識マーカーのルール:</p>
             <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
               <li className="flex items-center gap-2">
                 <span className="w-6 h-6 bg-yellow-400 text-black rounded-full flex items-center justify-center font-bold text-[10px]">①</span>
                 <span>...</span>
                 <span className="w-6 h-6 bg-yellow-400 text-black rounded-full flex items-center justify-center font-bold text-[10px]">②</span>
                 <span className="text-gray-500">→</span>
                 <span className="text-red-400 font-bold">赤色・実線</span>
               </li>
               <li className="flex items-center gap-2">
                 <span className="w-6 h-6 bg-yellow-400 text-black rounded-full flex items-center justify-center font-bold text-[10px]">③</span>
                 <span>...</span>
                 <span className="w-6 h-6 bg-yellow-400 text-black rounded-full flex items-center justify-center font-bold text-[10px]">④</span>
                 <span className="text-gray-500">→</span>
                 <span className="text-blue-400 font-bold">青色・点線</span>
               </li>
             </ul>
          </div>

      </div>
    </div>
  );
};