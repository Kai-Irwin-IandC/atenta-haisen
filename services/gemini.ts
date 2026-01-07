import { GoogleGenAI } from "@google/genai";

// Helper to get AI instance with latest key
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateWiringVisualization = async (
  imageBase64: string,
  mimeType: string
): Promise<string> => {
  const ai = getAIClient();

  // Refined prompt to strictly enforce line styles and marker removal
  const prompt = `
    You are an expert image editor. Your task is to visualize electrical wiring on the provided construction photo.

    The image contains yellow numbered markers (①, ②, ③, ④).
    
    EXECUTE THE FOLLOWING STEPS:
    1.  **SOLID RED LINE (① to ②):** Draw a thick, **SOLID RED** line connecting the position of marker ① to marker ②.
        *   Crucial: The line must be SOLID (not dashed).
        *   The line should follow the wall surface perspective.
    
    2.  **DASHED BLUE LINE (③ to ④):** Draw a thick, **DASHED BLUE** line connecting the position of marker ③ to marker ④.
        *   Crucial: The line must be DASHED (broken line).
        *   The line should follow the ceiling/wall surface perspective.

    3.  **REMOVE MARKERS:** ERASE the yellow markers ①, ②, ③, and ④ completely. 
        *   Inpaint the area behind them to match the existing wall/ceiling texture seamlessly.
        *   Do not leave any trace of the yellow numbers.

    4.  **PRESERVE DETAILS:** Do NOT alter the "ATENTA" poster, the glass doors, the flooring, or the lighting shadows. The rest of the image must remain exactly the same.
  `;
  
  // Using gemini-3-pro-image-preview for generation
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType
          }
        },
        { text: prompt }
      ]
    }
  });

  // Extract image from response
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("画像が生成されませんでした。");
  }

  const parts = candidates[0].content.parts;
  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  // Check for text refusal/explanation
  for (const part of parts) {
    if (part.text) {
      console.warn("Model returned text instead of image:", part.text);
    }
  }

  throw new Error("レスポンスに画像データが含まれていません。");
};