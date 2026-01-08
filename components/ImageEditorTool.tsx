import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Wand2, Upload, Download, RotateCcw } from 'lucide-react';
import { LoadingStatus } from '../types';
import { fileToBase64, editImageWithPrompt } from '../services/geminiService';

const ImageEditorTool: React.FC = () => {
  const [status, setStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setOriginalImage(`data:${file.type};base64,${base64}`);
      setGeneratedImage(null);
      setStatus(LoadingStatus.IDLE);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = async () => {
    if (!originalImage || !prompt.trim()) return;

    setStatus(LoadingStatus.LOADING);
    try {
      const base64Content = originalImage.split(',')[1];
      const mimeType = originalImage.split(';')[0].split(':')[1];
      const result = await editImageWithPrompt(base64Content, mimeType, prompt);
      setGeneratedImage(result);
      setStatus(LoadingStatus.SUCCESS);
    } catch (err) {
      console.error(err);
      setStatus(LoadingStatus.ERROR);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-3 flex items-center justify-center gap-2">
          <Wand2 className="w-8 h-8 text-purple-500" />
          AI画像編集 (Nano Banana)
        </h2>
        <p className="text-slate-600">テキスト指示で画像を編集します。「背景を消して」「レトロなフィルターをかけて」</p>
      </div>

      {!originalImage ? (
         <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-300 rounded-2xl bg-white hover:bg-slate-50 transition-colors cursor-pointer"
             onClick={() => fileInputRef.current?.click()}>
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-purple-500" />
          </div>
          <p className="text-lg font-medium text-slate-700">編集する画像を選択</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                   <h3 className="text-sm font-semibold text-slate-500 mb-2 uppercase">元画像</h3>
                   <img src={originalImage} alt="Original" className="w-full rounded-lg border border-slate-100" />
                </div>
                {generatedImage && (
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-purple-500 mb-2 uppercase">編集結果</h3>
                    <img src={generatedImage} alt="Edited" className="w-full rounded-lg border border-purple-100 shadow-md" />
                  </div>
                )}
             </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-lg sticky bottom-4">
             <label className="block text-sm font-medium text-slate-700 mb-2">編集指示 (プロンプト)</label>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 value={prompt}
                 onChange={(e) => setPrompt(e.target.value)}
                 placeholder="例：空を青くして、人物を削除して..."
                 className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                 disabled={status === LoadingStatus.LOADING}
               />
               <button 
                 onClick={handleEdit}
                 disabled={status === LoadingStatus.LOADING || !prompt.trim()}
                 className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
               >
                 {status === LoadingStatus.LOADING ? (
                   <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                 ) : <Wand2 className="w-5 h-5" />}
                 生成
               </button>
             </div>
             
             {generatedImage && (
                <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-slate-100">
                   <button onClick={() => { setOriginalImage(null); setGeneratedImage(null); setPrompt(''); }} className="text-slate-500 hover:text-slate-700 px-4 py-2 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" /> リセット
                   </button>
                   <a href={generatedImage} download="edited_image.png" className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 flex items-center gap-2 text-sm font-medium">
                      <Download className="w-4 h-4" /> ダウンロード
                   </a>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageEditorTool;
