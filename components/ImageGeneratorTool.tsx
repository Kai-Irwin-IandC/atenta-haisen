import React, { useState, useRef, MouseEvent, DragEvent } from 'react';
import { ImagePlus, Sparkles, Download, AlertCircle, Upload, X, ArrowDown, RefreshCcw, MousePointerClick, CheckCircle2 } from 'lucide-react';
import { LoadingStatus } from '../types';
import { generateWiringDiagramsBatch, generateManualWiringDiagram, checkAndRequestApiKey, fileToBase64, MarkerCoordinates } from '../services/geminiService';

const ImageGeneratorTool: React.FC = () => {
  const [status, setStatus] = useState<LoadingStatus>(LoadingStatus.IDLE);
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  
  // Manual Marker State
  // Changed keys to 1, A, 2
  const [markerCoords, setMarkerCoords] = useState<MarkerCoordinates>({ "1": null, "A": null, "2": null });
  const [activeMarkerId, setActiveMarkerId] = useState<string>('1');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
        setError("画像ファイルのみアップロード可能です。");
        return;
    }

    try {
      const base64 = await fileToBase64(file);
      setOriginalImage(`data:${file.type};base64,${base64}`);
      setResultImages([]);
      setError(null);
      // Reset markers
      setMarkerCoords({ "1": null, "A": null, "2": null });
      setActiveMarkerId('1');
    } catch (err) {
      console.error(err);
      setError("画像の読み込みに失敗しました。");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const handleRemoveImage = () => {
    setOriginalImage(null);
    setResultImages([]);
    setStatus(LoadingStatus.IDLE);
    setMarkerCoords({ "1": null, "A": null, "2": null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setResultImages([]);
    setStatus(LoadingStatus.IDLE);
    setError(null);
    setMarkerCoords({ "1": null, "A": null, "2": null });
    setActiveMarkerId('1');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !activeMarkerId) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Raw normalized coordinates (0-1000)
    let normalizedX = (x / rect.width) * 1000;
    let normalizedY = (y / rect.height) * 1000;

    // Requirement 2: Axis alignment logic (Only when SHIFT is pressed)
    if (e.shiftKey) {
      // Determine the previous point based on the current active marker
      let prevPointKey: string | null = null;
      if (activeMarkerId === 'A') prevPointKey = '1';
      else if (activeMarkerId === '2') prevPointKey = 'A';

      if (prevPointKey) {
        const prevPoint = markerCoords[prevPointKey];
        if (prevPoint) {
          // Calculate deltas to see if we should snap to X or Y axis
          const dx = Math.abs(normalizedX - prevPoint.x);
          const dy = Math.abs(normalizedY - prevPoint.y);

          if (dx < dy) {
             // Closer to vertical line -> Snap X to previous point's X
             normalizedX = prevPoint.x;
          } else {
             // Closer to horizontal line -> Snap Y to previous point's Y
             normalizedY = prevPoint.y;
          }
        }
      }
    }

    setMarkerCoords(prev => ({
      ...prev,
      [activeMarkerId]: { x: normalizedX, y: normalizedY }
    }));

    // Auto-advance logic
    let nextId = '';
    if (activeMarkerId === '1') nextId = 'A';
    else if (activeMarkerId === 'A') nextId = '2';
    // If 2, stop or stay at 2 (no next step defined)

    if (nextId) {
        setActiveMarkerId(nextId);
    }
  };

  const setManualMarker = (id: string) => {
    setActiveMarkerId(id);
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

      // Check if markers are manually placed. If so, use manual generation.
      const hasManualMarkers = Object.values(markerCoords).some(v => v !== null);

      let results: string[] = [];

      if (hasManualMarkers) {
        // Use Manual Coordinates - generate 1 deterministic result
        const result = await generateManualWiringDiagram(base64, mimeType, markerCoords);
        results = [result];
      } else {
         // Fallback to AI Detection
         results = await generateWiringDiagramsBatch(base64, mimeType, 3);
      }
      
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
        <p className="text-slate-500 mb-8">指定されたマーカー位置に基づいて、正確なラインを描画しています</p>
        <div className="flex gap-2 text-sm text-slate-400 bg-slate-50 px-4 py-2 rounded-full">
           <Sparkles className="w-4 h-4" />
           <span>Processing with 3DPers Module</span>
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
              <span className="text-center text-lg font-bold text-indigo-600 uppercase tracking-wider mb-6 block">
                 生成結果 {resultImages.length > 1 && "(3パターン)"}
              </span>
              
              <div className={`grid grid-cols-1 ${resultImages.length > 1 ? 'md:grid-cols-3' : 'md:grid-cols-1 md:max-w-2xl md:mx-auto'} gap-6`}>
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
        <p className="text-slate-600">入力画像を指定し、①〜②の数字位置を設定してください。<br/>設定された位置に基づいて配線（①-ⓐ赤線、ⓐ-②青点線）を自動生成します。</p>
      </div>

      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg max-w-2xl mx-auto">
         {/* Upload Area */}
         {!originalImage ? (
           <div className="mb-8">
             <label className="block text-sm font-bold text-slate-700 mb-2 text-center">入力画像をアップロード</label>
             <div 
               onClick={() => fileInputRef.current?.click()}
               onDragOver={onDragOver}
               onDragLeave={onDragLeave}
               onDrop={onDrop}
               className={`border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer transition-all group ${
                 isDragging 
                   ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' 
                   : 'border-slate-300 hover:bg-slate-50 hover:border-indigo-400'
               }`}
             >
               <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
                 isDragging ? 'bg-indigo-100' : 'bg-slate-100 group-hover:bg-indigo-50'
               }`}>
                 <Upload className={`w-8 h-8 transition-colors ${
                   isDragging ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'
                 }`} />
               </div>
               <span className={`text-lg font-medium transition-colors ${
                 isDragging ? 'text-indigo-700' : 'text-slate-600 group-hover:text-indigo-600'
               }`}>
                 {isDragging ? 'ドロップしてアップロード' : 'クリックして選択'}
               </span>
               <p className="text-sm text-slate-400 mt-1">または画像をドロップ</p>
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 className="hidden" 
                 accept="image/*"
                 onChange={handleFileUpload}
               />
             </div>
           </div>
         ) : (
           <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <MousePointerClick className="w-5 h-5 text-indigo-600" />
                    マーカー位置指定
                 </h3>
                 <button onClick={handleRemoveImage} className="text-sm text-red-500 hover:text-red-600 font-medium">画像を変更</button>
              </div>
              
              {/* Marker Toolbar */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 flex gap-2 justify-center">
                 {["1", "A", "2"].map((id) => {
                    const isSet = markerCoords[id] !== null;
                    const isActive = activeMarkerId === id;
                    return (
                       <button 
                          key={id}
                          onClick={() => setManualMarker(id)}
                          className={`
                             relative w-12 h-12 rounded-full font-bold text-lg flex items-center justify-center border-2 transition-all
                             ${isActive 
                               ? 'bg-yellow-400 text-black border-yellow-500 ring-2 ring-yellow-200 scale-110 z-10' 
                               : isSet 
                                  ? 'bg-yellow-100 text-slate-600 border-yellow-200 hover:bg-yellow-200' 
                                  : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'}
                          `}
                       >
                          {isSet && <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-[10px] text-white"><CheckCircle2 className="w-3 h-3"/></div>}
                          {id}
                       </button>
                    )
                 })}
              </div>
              <p className="text-xs text-center text-slate-500 mb-4">
                クリックした位置に番号（強調表示）が配置されます。<br/>
                <span className="text-indigo-600 font-medium">※Shiftキーを押しながらクリックすると、直前の点から垂直・水平位置にスナップします</span>
              </p>

              {/* Interactive Image Area */}
              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 cursor-crosshair group select-none">
                 <div className="relative" onClick={handleImageClick}>
                    <img 
                       ref={imageRef}
                       src={originalImage} 
                       alt="Workspace" 
                       className="w-full h-auto object-contain block" 
                    />
                    
                    {/* Render Markers */}
                    {Object.entries(markerCoords).map(([key, value]) => {
                       const coord = value as { x: number, y: number } | null;
                       if (!coord) return null;
                       return (
                          <div
                             key={key}
                             className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-yellow-400 border border-yellow-600 text-black font-bold flex items-center justify-center shadow-md text-[10px] pointer-events-none z-10"
                             style={{
                                left: `${coord.x / 10}%`,
                                top: `${coord.y / 10}%`
                             }}
                          >
                             {key}
                          </div>
                       );
                    })}
                 </div>
              </div>
           </div>
         )}

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