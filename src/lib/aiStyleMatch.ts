import * as opentype from 'opentype.js';
import { FontStyle } from './svgDiacritics';
import { GoogleGenAI } from '@google/genai';

export async function captureFontSample(font: opentype.Font): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 200;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("No canvas context");
  
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const text = "A B C a b c R S T r s t";
  const path = font.getPath(text, 50, 120, 72);
  path.fill = 'black';
  path.draw(ctx);
  
  return canvas.toDataURL('image/png');
}

export async function analyzeFontStyle(imageBase64: string): Promise<FontStyle> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [
          { text: "Analyze this image of a font. Classify its style into exactly one of these categories: 'Sans', 'Serif', 'Monospace', 'Pixel', 'Display'. Return ONLY a JSON object like this: {\"style\": \"Sans\"}" },
          { inlineData: { mimeType: "image/png", data: imageBase64.split(',')[1] } }
        ]
      }
    ]
  });
  
  const text = response.text;
  const match = text.match(/\{.*\}/s);
  if (match) {
     const data = JSON.parse(match[0]);
     return data.style as FontStyle;
  } else {
     return "Sans";
  }
}
