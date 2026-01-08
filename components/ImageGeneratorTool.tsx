import React, { useState, useRef } from 'react';
import { ImagePlus, Sparkles, Download, AlertCircle, Upload, X, ArrowDown, RefreshCcw } from 'lucide-react';
import { LoadingStatus } from '../types';
import { generateWiringDiagramsBatch, checkAndRequestApiKey, fileToBase64 } from '../services/geminiService';

const ImageGeneratorTool: React.FC = () => {
  const [status, setStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setOriginalImage(`data:${file.type};base64,${base64}`);
      setResultImages([]);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("画像の読み込みに失敗しました。");
    }
  };

  const handleRemoveImage = () => {
    setOriginalImage(null);
    setResultImages([]);
    setStatus(LoadingStatus.IDLE);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setResultImages([]);
    setStatus(LoadingStatus.IDLE);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!originalImage) return;
    
    setError(null);
    setStatus(LoadingStatus.LOADING);
    setResultImages([]);

    try {
      try {
        await checkAndRequestApiKey();
      } catch (keyErr) {
        console.warn("API Key check failed or cancelled", keyErr);
        throw new Error("APIキーの選択が必要です。");
      }

      const base64 = originalImage.split(',')[1];
      const mimeType = originalImage.split(';')[0].split(':')[1];

      // Generate 3 images using the precise detection + drawing logic
      const results = await generateWiringDiagramsBatch(base64, mimeType, 3);
      
      setResultImages(results);
      setStatus(LoadingStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setStatus(LoadingStatus.ERROR);
      if (err.message && err.message.includes("Entity was not found")) {
         setError("APIキーが無効または見つかりません。もう一度お試しください。");
      } else {
         setError(err.message || "画像の生成に失敗しました。");
      }
    }
  };

  // --- VIEW 2: LOADING ---
  if (status === LoadingStatus.LOADING) {
    return (
      <div className="max-w-4xl mx-auto p-8 min-h-[60vh] flex flex-col items-center justify-center animate-fade-in">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">配線図を生成中...</h2>
        <p className="text-slate-500 mb-8">数字マーカーを解析し、正確なラインを描画しています</p>
        <div className="flex gap-2 text-sm text-slate-400 bg-slate-50 px-4 py-2 rounded-full">
           <Sparkles className="w-4 h-4" />
           <span>Processing with Gemini 3.0 Vision</span>
        </div>
      </div>
    );
  }

  // --- VIEW 3: RESULT (Only After Images) ---
  if (status === LoadingStatus.SUCCESS && resultImages.length > 0) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            生成完了
          </h2>
          <button 
            onClick={handleReset}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            最初に戻る
          </button>
        </div>

        <div className="w-full">
           <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
              <span className="text-center text-lg font-bold text-indigo-600 uppercase tracking-wider mb-6 block">生成結果 (3パターン)</span>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {resultImages.map((img, idx) => (
                  <div key={idx} className="flex flex-col bg-white p-3 rounded-xl shadow-sm border border-indigo-100 transition-transform hover:-translate-y-1 duration-200">
                    <div className="aspect-square rounded-lg overflow-hidden bg-slate-50 mb-3 border border-slate-100 relative group">
                      <img src={img} alt={`Generated ${idx}`} className="w-full h-full object-contain" />
                    </div>
                    <a 
                      href={img} 
                      download={`wiring_result_${idx + 1}.png`}
                      className="mt-auto w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      保存
                    </a>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    );
  }

  // --- VIEW 1: INITIAL (Upload) ---
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800 mb-3 flex items-center justify-center gap-2">
          <ImagePlus className="w-8 h-8 text-indigo-600" />
          AI 配線図生成アプリ
        </h2>
        <p className="text-slate-600">入力画像を解析し、特定のルール（①-②赤線、③-④青点線）に基づいて配線図を自動生成します。</p>
      </div>

      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg max-w-2xl mx-auto">
         {/* Upload Area */}
         <div className="mb-8">
           <label className="block text-sm font-bold text-slate-700 mb-2 text-center">入力画像をアップロード</label>
           {!originalImage ? (
             <div 
               onClick={() => fileInputRef.current?.click()}
               className="border-2 border-dashed border-slate-300 rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-indigo-400 transition-all group"
             >
               <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-indigo-50 transition-colors">
                 <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors" />
               </div>
               <span className="text-lg font-medium text-slate-600 group-hover:text-indigo-600">クリックして選択</span>
               <p className="text-sm text-slate-400 mt-1">または画像をドロップ</p>
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 className="hidden" 
                 accept="image/*"
                 onChange={handleFileUpload}
               />
             </div>
           ) : (
             <div className="relative rounded-xl overflow-hidden border-2 border-indigo-100 bg-slate-50 group">
               <img src={originalImage} alt="Preview" className="w-full h-64 object-contain" />
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button 
                    onClick={handleRemoveImage}
                    className="p-3 bg-white text-slate-800 rounded-full font-medium hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2"
                  >
                    <X className="w-5 h-5" /> キャンセル
                  </button>
               </div>
             </div>
           )}
         </div>

         {/* Generate Button */}
         <div className="space-y-4">
           <button
             onClick={handleGenerate}
             disabled={!originalImage}
             className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
           >
             <Sparkles className="w-6 h-6" />
             配線図を生成
           </button>
           
           <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>Proモデルの使用には、ご自身の有料APIキーの選択が必要です。</span>
           </div>
         </div>
      </div>

      {error && (
        <div className="max-w-2xl mx-auto mt-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-center">
          {error}
        </div>
      )}
    </div>
  );
};

export default ImageGeneratorTool;
