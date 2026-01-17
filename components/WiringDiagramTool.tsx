import React, { useState, useRef } from 'react';
import { Upload, ArrowRight, Download, RefreshCcw, Zap } from 'lucide-react';
import { LoadingStatus } from '../types';
import { fileToBase64, generateWiringDiagram } from '../services/geminiService';

const WiringDiagramTool: React.FC = () => {
  const [status, setStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await fileToBase64(file);
      setOriginalImage(`data:${file.type};base64,${base64}`);
      setGeneratedImage(null);
      setStatus(LoadingStatus.IDLE);
      setErrorMsg(null);
    } catch (err) {
      console.error(err);
      setErrorMsg("画像の読み込みに失敗しました。");
    }
  };

  const handleGenerate = async () => {
    if (!originalImage) return;

    setStatus(LoadingStatus.LOADING);
    setErrorMsg(null);

    try {
      const base64Content = originalImage.split(',')[1];
      const mimeType = originalImage.split(';')[0].split(':')[1];
      
      const result = await generateWiringDiagram(base64Content, mimeType);
      setGeneratedImage(result);
      setStatus(LoadingStatus.SUCCESS);
    } catch (err) {
      console.error(err);
      setStatus(LoadingStatus.ERROR);
      setErrorMsg("生成に失敗しました。もう一度お試しください。");
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setGeneratedImage(null);
    setStatus(LoadingStatus.IDLE);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-800 mb-3 flex items-center justify-center gap-3">
          <Zap className="w-8 h-8 text-yellow-500" />
          自動配線図生成
        </h2>
        <p className="text-slate-600">マーカー（①, ⓐ, ②）を認識し、自動で配線を描画します。</p>
      </div>

      {/* Initial Upload State */}
      {!originalImage && (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-300 rounded-2xl bg-white hover:bg-slate-50 transition-colors cursor-pointer"
             onClick={() => fileInputRef.current?.click()}>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <Upload className="w-10 h-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">画像をアップロード</h3>
          <p className="text-slate-500 text-sm">または、ドラッグ＆ドロップ</p>
          <p className="text-xs text-slate-400 mt-4">JPG, PNG 対応</p>
        </div>
      )}

      {/* Preview & Action State */}
      {originalImage && status === LoadingStatus.IDLE && (
        <div className="flex flex-col items-center animate-fade-in">
          <div className="relative max-w-xl w-full mb-8 rounded-xl overflow-hidden shadow-lg border border-slate-200">
             <img src={originalImage} alt="Preview" className="w-full h-auto" />
             <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                オリジナル
             </div>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={handleReset}
              className="px-6 py-3 rounded-lg border border-slate-300 text-slate-600 font-medium hover:bg-slate-100 transition-colors"
            >
              別の画像
            </button>
            <button
              onClick={handleGenerate}
              className="px-8 py-3 rounded-lg bg-blue-600 text-white font-bold shadow-md hover:bg-blue-700 hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Zap className="w-5 h-5" />
              配線図を生成
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {status === LoadingStatus.LOADING && (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">解析中...</h3>
          <p className="text-slate-500">マーカーを特定し、ロジックに基づいて描画しています。</p>
        </div>
      )}

      {/* Result State */}
      {status === LoadingStatus.SUCCESS && generatedImage && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <div className="font-semibold text-slate-600 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Before (元画像)
              </div>
              <div className="rounded-xl overflow-hidden shadow-md border border-slate-200 bg-white">
                <img src={originalImage!} alt="Original" className="w-full h-auto" />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="font-semibold text-blue-600 mb-2 flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                 After (生成画像)
              </div>
              <div className="rounded-xl overflow-hidden shadow-md border border-blue-200 bg-white relative">
                 <img src={generatedImage} alt="Generated" className="w-full h-auto" />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <a 
               href={generatedImage} 
               download="wiring_diagram.png"
               className="w-full sm:w-auto px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2 shadow-sm transition-colors"
             >
               <Download className="w-5 h-5" />
               画像をダウンロード
             </a>
             <button
               onClick={handleReset}
               className="w-full sm:w-auto px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2 font-medium transition-colors"
             >
               <RefreshCcw className="w-5 h-5" />
               新しい画像
             </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-center">
          {errorMsg}
        </div>
      )}
    </div>
  );
};

export default WiringDiagramTool;