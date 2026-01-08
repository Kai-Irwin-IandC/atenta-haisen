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

interface MarkerCoordinates {
  [key: string]: { x: number; y: number } | null;
}

export const detectMarkerCoordinates = async (base64Image: string, mimeType: string): Promise<MarkerCoordinates> => {
  const ai = getAiClient();
  
  const prompt = `
    Analyze the image and locate the exact center coordinates of the numeric markers enclosed in yellow circles: ① (1), ② (2), ③ (3), and ④ (4).
    
    Return a JSON object with keys "1", "2", "3", "4".
    The values should be objects { "x": number, "y": number } representing the center of each marker.
    The coordinates must be normalized to a 0-1000 scale (where 0,0 is top-left and 1000,1000 is bottom-right).
    
    If a marker is not visible, set its value to null.
    
    Example Output:
    {
      "1": { "x": 100, "y": 200 },
      "2": { "x": 105, "y": 400 },
      "3": null,
      "4": null
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

export const drawWiringOnCanvas = async (originalBase64: string, mimeType: string, coords: MarkerCoordinates): Promise<string> => {
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
      const p2 = getPt("2");
      const p3 = getPt("3");
      const p4 = getPt("4");

      // 2. Draw 1-2 Red Solid Line
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = 'rgb(255, 0, 0)'; // Red
        ctx.lineWidth = Math.max(3, img.width * 0.005); // Responsive thickness
        ctx.setLineDash([]); // Solid
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // 3. Draw 3-4 Blue Dotted Line
      if (p3 && p4) {
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.strokeStyle = 'rgb(0, 0, 255)'; // Blue
        ctx.lineWidth = Math.max(3, img.width * 0.005); // Responsive thickness
        // Create a dotted/dashed effect
        const dashSize = Math.max(5, img.width * 0.01);
        ctx.setLineDash([dashSize, dashSize]); 
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      resolve(canvas.toDataURL(mimeType));
    };
    img.onerror = reject;
    img.src = `data:${mimeType};base64,${originalBase64}`;
  });
};

// Single generation function for WiringDiagramTool
export const generateWiringDiagram = async (base64Image: string, mimeType: string): Promise<string> => {
  const coords = await detectMarkerCoordinates(base64Image, mimeType);
  return drawWiringOnCanvas(base64Image, mimeType, coords);
};

// Main function to generate 3 diagrams (parallel executions of detection)
export const generateWiringDiagramsBatch = async (base64Image: string, mimeType: string, count: number = 3): Promise<string[]> => {
  // We run the detection 'count' times to simulate generation variance (and robustness check)
  const promises = Array(count).fill(0).map(async () => {
     const coords = await detectMarkerCoordinates(base64Image, mimeType);
     return drawWiringOnCanvas(base64Image, mimeType, coords);
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
