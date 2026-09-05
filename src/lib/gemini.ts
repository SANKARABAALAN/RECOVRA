export interface GeminiRequestConfig {
  responseMimeType?: string;
  responseSchema?: any;
}

export const geminiClient = {
  /**
   * Safe execution wrapper for Google Gemini API.
   * Reads GEMINI_API_KEY from process.env.GEMINI_API_KEY.
   * Tries gemini-3.6-flash first, falls back to gemini-2.5-flash, handles timeout, rate limits, and errors gracefully.
   */
  async generateContent(prompt: string, config?: GeminiRequestConfig): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing environment variable: GEMINI_API_KEY");
    }

    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp", "gemini-pro"];
    let lastError: any = null;

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      // First attempt with config (if any)
      const tryFetch = async (useConfig: boolean) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        try {
          const bodyPayload: any = {
            contents: [{ parts: [{ text: prompt }] }],
          };
          if (useConfig && config?.responseMimeType) {
            bodyPayload.generationConfig = {
              responseMimeType: config.responseMimeType,
              responseSchema: config.responseSchema,
            };
          }
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyPayload),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          return response;
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      };

      try {
        let response = await tryFetch(true);
        if (!response.ok && config?.responseMimeType) {
          // Retry without responseMimeType if strict MIME type failed
          response = await tryFetch(false);
        }

        if (response.ok) {
          const resData = await response.json();
          const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return text;
          }
        } else {
          const errText = await response.text();
          lastError = new Error(`Gemini API error ${response.status}: ${errText}`);
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          lastError = new Error("Gemini API request timed out (12s threshold reached)");
        } else {
          lastError = err;
        }
      }
    }

    throw lastError || new Error("Gemini API generation failed for all models.");
  },
};
