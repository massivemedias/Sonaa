import { GoogleGenAI, Type } from "@google/genai";

// Only initialize if API key is available (optional feature)
const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Uses Gemini to attempt to find a valid RSS feed URL for a given website.
 * This is useful because users often paste "attackmagazine.com" instead of the full feed URL.
 */
export const discoverFeedUrl = async (websiteUrl: string): Promise<{ rssUrl: string; name: string } | null> => {
  // Return null if Gemini is not configured
  if (!ai) {
    console.log("Gemini API not configured, skipping feed discovery");
    return null;
  }

  try {
    const modelId = "gemini-2.5-flash";
    
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `I have a website URL: "${websiteUrl}". 
      Please predict or find the most likely RSS feed URL for this website. 
      Also provide a clean, short name for the site.
      Common patterns are /feed, /rss, /rss.xml, /atom.xml.
      If it is a WordPress site (like Gearnews or Attack Magazine), it is usually /feed/.
      
      Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rssUrl: {
              type: Type.STRING,
              description: "The likely full URL of the RSS feed",
            },
            name: {
              type: Type.STRING,
              description: "A short, clean name for the website",
            }
          },
          required: ["rssUrl", "name"],
        },
      },
    });

    if (response.text) {
        return JSON.parse(response.text);
    }
    return null;

  } catch (error) {
    console.error("Error discovering feed with Gemini:", error);
    return null;
  }
};
