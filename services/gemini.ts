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
    1. Connect ① and ② with a thick solid red line.
    2. Connect ③ and ④ with a thick dashed blue line.
    3. Remove the markers and keep everything else exactly the same.
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