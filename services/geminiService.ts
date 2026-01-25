import { GoogleGenAI } from "@google/genai";
import { ImageSize } from "../types";

// Helper to convert File to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getAiClient = () => {
  // Always create a new instance to ensure fresh API key if updated via window.aistudio
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- Detection & Drawing Logic (Simulating "Python Execution") ---

export interface MarkerCoordinates {
  [key: string]: { x: number; y: number } | null;
}

export type LineStyle = 'blue-dotted' | 'red-solid';

export interface WiringStyles {
  segment1A: LineStyle;
  segmentA2: LineStyle;
}

export const detectMarkerCoordinates = async (base64Image: string, mimeType: string): Promise<MarkerCoordinates> => {
  const ai = getAiClient();
  
  const prompt = `
    Analyze the image and locate the exact center coordinates of the markers enclosed in yellow circles: ① (1), Ⓐ (A), and ② (2).
    
    Return a JSON object with keys "1", "A", "2".
    The values should be objects { "x": number, "y": number } representing the center of each marker.
    The coordinates must be normalized to a 0-1000 scale (where 0,0 is top-left and 1000,1000 is bottom-right).
    
    If a marker is not visible, set its value to null.
    
    Example Output:
    {
      "1": { "x": 100, "y": 200 },
      "A": { "x": 105, "y": 400 },
      "2": { "x": 300, "y": 400 }
    }
  `;

  // Using gemini-3-pro-preview for high-reasoning vision capabilities
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image
          }
        },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON", text);
    throw new Error("AI returned invalid JSON");
  }
};

export const drawWiringOnCanvas = async (
  originalBase64: string, 
  mimeType: string, 
  coords: MarkerCoordinates,
  styles: WiringStyles = { segment1A: 'red-solid', segmentA2: 'blue-dotted' }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // 1. Draw Original Image
      ctx.drawImage(img, 0, 0);

      // Helper to map normalized 0-1000 coords to pixel coords
      const getPt = (key: string) => {
        const c = coords[key];
        if (!c) return null;
        return {
          x: (c.x / 1000) * img.width,
          y: (c.y / 1000) * img.height
        };
      };

      const p1 = getPt("1");
      const pA = getPt("A");
      const p2 = getPt("2");

      // --- Draw Lines FIRST (so they appear behind markers) ---
      // Line width proportional to image width (approx 0.5%)
      const baseLineWidth = Math.max(1, img.width * 0.005);

      const setContextStyle = (style: LineStyle) => {
        if (style === 'red-solid') {
          ctx.strokeStyle = 'rgb(220, 38, 38)'; // Red-600
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = 'rgb(37, 99, 235)'; // Blue-600
          const dashSize = Math.max(2, img.width * 0.012);
          ctx.setLineDash([dashSize, dashSize]); 
        }
        ctx.lineWidth = baseLineWidth;
        ctx.lineCap = 'round';
      };

      // 2. Draw 1-A
      if (p1 && pA) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(pA.x, pA.y);
        setContextStyle(styles.segment1A);
        ctx.stroke();
      }

      // 3. Draw A-2
      if (pA && p2) {
        ctx.beginPath();
        ctx.moveTo(pA.x, pA.y);
        ctx.lineTo(p2.x, p2.y);
        setContextStyle(styles.segmentA2);
        ctx.stroke();
      }

      // --- Draw Markers LAST (so they appear on top of lines) ---
      
      const markerKeys = ["1", "A", "2"];
      // Responsive marker size to match UI "w-5" (20px) on ~640px container
      // 20px / 640px = ~3.1% diameter => ~1.55% radius
      // We use 0.015 (1.5%) to be safe.
      const radius = Math.max(2, img.width * 0.015); 
      const fontSize = radius * 1.1;

      markerKeys.forEach(key => {
        const pt = getPt(key);
        if (pt) {
          // 1. Draw Yellow Circle Background
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, radius, 0, 2 * Math.PI, false);
          ctx.fillStyle = '#FACC15'; // Yellow-400 (matches UI)
          ctx.fill();

          // 2. Draw Darker Border
          ctx.lineWidth = Math.max(0.5, radius * 0.2);
          ctx.strokeStyle = '#CA8A04'; // Yellow-600
          ctx.setLineDash([]); // Ensure border is solid
          ctx.stroke();

          // 3. Draw Number Text
          ctx.fillStyle = '#000000'; // Black text
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // Slight vertical offset for visual centering
          ctx.fillText(key, pt.x, pt.y + (fontSize * 0.08));
        }
      });

      resolve(canvas.toDataURL(mimeType));
    };
    img.onerror = reject;
    img.src = `data:${mimeType};base64,${originalBase64}`;
  });
};

// Single generation function for WiringDiagramTool
export const generateWiringDiagram = async (
  base64Image: string, 
  mimeType: string,
  styles: WiringStyles = { segment1A: 'red-solid', segmentA2: 'blue-dotted' }
): Promise<string> => {
  const coords = await detectMarkerCoordinates(base64Image, mimeType);
  return drawWiringOnCanvas(base64Image, mimeType, coords, styles);
};

// Generate using manual coordinates (Bypassing AI detection)
export const generateManualWiringDiagram = async (
  base64Image: string, 
  mimeType: string, 
  coords: MarkerCoordinates,
  styles: WiringStyles = { segment1A: 'red-solid', segmentA2: 'blue-dotted' }
): Promise<string> => {
  // Direct drawing with provided coordinates
  return drawWiringOnCanvas(base64Image, mimeType, coords, styles);
};

// Main function to generate diagrams (parallel executions of detection)
export const generateWiringDiagramsBatch = async (
  base64Image: string, 
  mimeType: string, 
  count: number = 3,
  styles: WiringStyles = { segment1A: 'red-solid', segmentA2: 'blue-dotted' }
): Promise<string[]> => {
  // We run the detection 'count' times to simulate generation variance (and robustness check)
  const promises = Array(count).fill(0).map(async () => {
     const coords = await detectMarkerCoordinates(base64Image, mimeType);
     return drawWiringOnCanvas(base64Image, mimeType, coords, styles);
  });
  
  return Promise.all(promises);
};

// Image editing function for ImageEditorTool
export const editImageWithPrompt = async (base64Image: string, mimeType: string, prompt: string): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image', // "Nano Banana" for image editing
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
        {
          text: prompt,
        },
      ],
    },
  });

  if (response.candidates && response.candidates.length > 0) {
    const content = response.candidates[0].content;
    if (content && content.parts) {
       for (const part of content.parts) {
          // Check for image part in response
          if (part.inlineData && part.inlineData.data) {
             const base64EncodeString = part.inlineData.data;
             return `data:image/png;base64,${base64EncodeString}`;
          }
       }
    }
  }
  
  throw new Error("Failed to generate edited image or no image returned.");
};

// Helper for checking Pro key requirement
export const checkAndRequestApiKey = async (): Promise<boolean> => {
  if (window.aistudio && window.aistudio.hasSelectedApiKey) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      return true;
    }
    return true;
  }
  return true;
};