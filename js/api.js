(() => {
  "use strict";

  const config = window.BeleConfig;
  if (!config) {
    throw new Error("BeleConfig is missing. Load js/config.js before js/api.js.");
  }

  class ApiError extends Error {
    constructor(message, status = 0, details = null) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.details = details;
    }
  }

  class ApiClient {
    constructor({ baseUrl, requestTimeoutMs }) {
      this.baseUrl = String(baseUrl).replace(/\/$/, "");
      this.requestTimeoutMs = requestTimeoutMs;
    }

    async request(path, options = {}) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), this.requestTimeoutMs);

      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          ...options,
          headers: {
            Accept: "application/json",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {}),
          },
          signal: controller.signal,
        });

        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/json")
          ? await response.json()
          : await response.text();

        if (!response.ok) {
          const detail = typeof payload === "object" ? payload?.detail : payload;
          throw new ApiError(detail || `API request failed (${response.status})`, response.status, payload);
        }

        return payload;
      } catch (error) {
        if (error.name === "AbortError") {
          throw new ApiError("The quiz server took too long to respond. Please try again.");
        }
        if (error instanceof ApiError) throw error;
        throw new ApiError("Could not connect to the quiz server. Check your internet connection and try again.", 0, error);
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    async checkHealth() {
      try {
        return await this.request("/api/health");
      } catch {
        return this.request("/");
      }
    }

    async loadQuiz(difficulty, count = 6) {
      const safeDifficulty = ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "easy";
      const safeCount = Math.min(Math.max(Number(count) || 6, 1), 15);

      try {
        const payload = await this.request(`/api/quiz?difficulty=${encodeURIComponent(safeDifficulty)}&count=${safeCount}`);
        const items = Array.isArray(payload) ? payload : payload?.items;
        return this.normalizeQuestionList(items);
      } catch (primaryError) {
        if (![404, 405].includes(primaryError.status)) throw primaryError;
        const payload = await this.request(`/quiz/random/${safeCount}?difficulty=${encodeURIComponent(safeDifficulty)}`);
        return this.normalizeQuestionList(payload);
      }
    }

    async submitAnswer(question, guess) {
      try {
        const payload = await this.request("/api/answer", {
          method: "POST",
          body: JSON.stringify({ item_id: question.id, guess }),
        });
        return this.normalizeAnswer(payload, question, guess);
      } catch (primaryError) {
        if (![404, 405, 422].includes(primaryError.status)) throw primaryError;
        const payload = await this.request(`/quiz/answer?id=${encodeURIComponent(question.id)}&guess=${encodeURIComponent(guess)}`);
        return this.normalizeAnswer(payload, question, guess);
      }
    }

    async revealAnswer(question) {
      let firstError;

      try {
        const result = await this.submitAnswer(question, "Timed out");
        return { ...result, guess: "No answer", correct: false, timedOut: true };
      } catch (error) {
        firstError = error;
      }

      try {
        const result = await this.submitAnswer(question, "Human");
        return { ...result, guess: "No answer", correct: false, timedOut: true };
      } catch {
        throw firstError;
      }
    }

    normalizeQuestionList(items) {
      if (!Array.isArray(items) || items.length === 0) {
        throw new ApiError("The API returned no quiz items.");
      }
      return items.map((item) => this.normalizeQuestion(item));
    }

    normalizeQuestion(item) {
      const contentType = this.normalizeContentType(
        item.content_type || item.contentType || item.type || item.media_type
      );

      const rawContent = this.firstUsefulValue(
        item.content,
        item.value,
        item.link,
        item.url,
        item.media_url,
        item.mediaUrl,
        item.asset_url,
        item.assetUrl,
        item.file_url,
        item.fileUrl,
        item.path
      );

      return {
        id: String(item.id),
        topic: item.topic || item.title || "Media content",
        content: contentType === "text" ? rawContent : this.resolveMediaUrl(rawContent),
        contentType,
        difficulty: String(item.difficulty || "").toLowerCase(),
      };
    }

    normalizeAnswer(payload, question, guess) {
      const rawAnswer = payload.answer ?? payload.actual_source ?? payload.source ?? "";
      const answer = this.inferAnswerLabel(rawAnswer);
      const keyPoints = Array.isArray(payload.key_points)
        ? payload.key_points
        : Array.isArray(payload.keyPoints)
          ? payload.keyPoints
          : [];

      return {
        id: payload.id || question.id,
        guess,
        correct: typeof payload.correct === "boolean" ? payload.correct : answer === guess,
        answer: answer || "Unknown",
        source: payload.source || payload.actual_source || "",
        explanation: payload.explanation || payload.reason || "No explanation was provided for this item.",
        keyPoints,
      };
    }

    firstUsefulValue(...values) {
      for (const value of values) {
        if (typeof value === "string" && value.trim()) return value.trim();
        if (value && typeof value === "object") {
          const nested = value.url || value.src || value.path || value.link || value.href;
          if (typeof nested === "string" && nested.trim()) return nested.trim();
        }
      }
      return "";
    }

    resolveMediaUrl(value) {
      const raw = String(value || "").trim();
      if (!raw) return "";
      if (/^(data:|blob:)/i.test(raw)) return raw;
      if (raw.startsWith("//")) return `https:${raw}`;

      try {
        return new URL(raw, `${this.baseUrl}/`).href;
      } catch {
        return raw;
      }
    }

    normalizeContentType(value) {
      const raw = String(value || "text").toLowerCase();
      if (raw.includes("video")) return "video";
      if (raw.includes("image") || raw.includes("photo") || raw.includes("picture")) return "image";
      return "text";
    }

    inferAnswerLabel(value) {
      const normalized = String(value).toLowerCase();
      if (
        normalized === "ai" ||
        normalized.includes("generated by ai") ||
        normalized.includes("ai-generated") ||
        normalized.includes("ai work")
      ) {
        return "AI";
      }
      if (
        normalized === "human" ||
        normalized.includes("human") ||
        normalized.includes("real news") ||
        normalized.includes("this is real")
      ) {
        return "Human";
      }
      return "";
    }
  }

  window.BeleAPI = Object.freeze({ ApiClient, ApiError });
})();
