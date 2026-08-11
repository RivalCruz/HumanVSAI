(() => {
  "use strict";

  const config = window.BeleConfig;
  const apiLibrary = window.BeleAPI;

  if (!config) {
    throw new Error(
      "BeleConfig is missing. Load js/config.js before js/app.js.",
    );
  }
  if (!apiLibrary?.ApiClient) {
    throw new Error("BeleAPI is missing. Load js/api.js before js/app.js.");
  }

  class DomUtils {
    static one(selector, scope = document) {
      return scope.querySelector(selector);
    }

    static all(selector, scope = document) {
      return [...scope.querySelectorAll(selector)];
    }

    static titleCase(value) {
      const text = String(value || "");
      return text
        ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
        : "";
    }

    static levelLabel(value) {
      return value === "easy" ? "Beginner" : DomUtils.titleCase(value);
    }
  }

  class FontManager {
    constructor(fontConfig = {}) {
      this.settings = fontConfig;
      this.styleElementId = "bele-custom-font-style";
    }

    apply() {
      const fallback =
        this.settings.fallback ||
        'ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
      const bodyFallback =
        this.settings.bodyFallback ||
        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const sources = Array.isArray(this.settings.sources)
        ? this.settings.sources.filter((source) => source?.path)
        : [];

      let primaryStack = fallback;

      if (this.settings.enabled && this.settings.familyName && sources.length) {
        this.installFontFaces(this.settings.familyName, sources);
        primaryStack = `"${this.escapeCssString(this.settings.familyName)}", ${fallback}`;
        document.documentElement.dataset.customFont = "enabled";
      } else {
        document.documentElement.dataset.customFont = "default";
      }

      document.documentElement.style.setProperty(
        "--font-primary",
        primaryStack,
      );
      document.documentElement.style.setProperty(
        "--font-body",
        this.settings.applyToBodyText ? primaryStack : bodyFallback,
      );
    }

    installFontFaces(familyName, sources) {
      document.getElementById(this.styleElementId)?.remove();

      const styleElement = document.createElement("style");
      styleElement.id = this.styleElementId;
      const family = this.escapeCssString(familyName);
      const fontDisplay = this.safeKeyword(this.settings.display, "swap");

      styleElement.textContent = sources
        .map((source) => {
          const path = this.escapeCssString(source.path);
          const format = this.escapeCssString(
            source.format || this.inferFormat(source.path),
          );
          const weight = this.safeFontWeight(source.weight);
          const fontStyle = this.safeKeyword(source.style, "normal");

          return `@font-face {
          font-family: "${family}";
          src: url("${path}") format("${format}");
          font-weight: ${weight};
          font-style: ${fontStyle};
          font-display: ${fontDisplay};
        }`;
        })
        .join("\n");

      document.head.appendChild(styleElement);
    }

    inferFormat(path) {
      const extension = String(path)
        .split("?")[0]
        .split(".")
        .pop()
        .toLowerCase();
      const formats = {
        woff2: "woff2",
        woff: "woff",
        ttf: "truetype",
        otf: "opentype",
      };
      return formats[extension] || "woff2";
    }

    safeFontWeight(value) {
      const weight = String(value || "400").trim();
      return /^[1-9]00(?:\s+[1-9]00)?$/.test(weight) ? weight : "400";
    }

    safeKeyword(value, fallback) {
      const keyword = String(value || fallback)
        .trim()
        .toLowerCase();
      return /^[a-z-]+$/.test(keyword) ? keyword : fallback;
    }

    escapeCssString(value) {
      return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/[\r\n]/g, "");
    }
  }

  class StorageService {
    constructor(storageKey) {
      this.storageKey = storageKey;
    }

    read(defaultValue = "") {
      try {
        return window.localStorage.getItem(this.storageKey) || defaultValue;
      } catch {
        return defaultValue;
      }
    }

    save(value) {
      try {
        window.localStorage.setItem(this.storageKey, value);
      } catch {
        // The game remains usable when browser storage is blocked.
      }
    }
  }

  class ExplanationFormatter {
    static short(explanation, keyPoints = [], maxLength = 180) {
      const fallback =
        Array.isArray(keyPoints) && keyPoints.length
          ? String(keyPoints[0]).trim()
          : "Look closely at the content, source, consistency, and context before deciding.";

      const cleanText = String(explanation || "")
        .replace(/\s+/g, " ")
        .trim();

      const text =
        cleanText && cleanText !== "No explanation was provided for this item."
          ? cleanText
          : fallback;

      if (text.length <= maxLength) return text;

      const sentenceMatches = text.match(/[^.!?]+[.!?]+/g) || [];
      let selected = "";

      for (const sentence of sentenceMatches) {
        const candidate = `${selected} ${sentence.trim()}`.trim();
        if (candidate.length > maxLength) break;
        selected = candidate;
      }

      if (selected) return selected;

      const shortened = text.slice(0, maxLength + 1);
      const lastSpace = shortened.lastIndexOf(" ");
      return `${shortened.slice(0, lastSpace > 80 ? lastSpace : maxLength).trim()}…`;
    }
  }

  class CountdownTimer {
    constructor(onTick, onExpire) {
      this.onTick = onTick;
      this.onExpire = onExpire;
      this.intervalId = null;
      this.deadline = 0;
      this.remaining = 0;
    }

    start(durationSeconds) {
      this.stop();
      const duration = Math.max(1, Number(durationSeconds) || 1);
      this.deadline = Date.now() + duration * 1000;
      this.update(duration);

      this.intervalId = window.setInterval(() => {
        const seconds = Math.max(
          0,
          Math.ceil((this.deadline - Date.now()) / 1000),
        );
        this.update(seconds);

        if (seconds <= 0) {
          this.stop();
          this.onExpire();
        }
      }, 250);
    }

    update(seconds) {
      this.remaining = Math.max(0, seconds);
      this.onTick(this.remaining);
    }

    stop() {
      if (this.intervalId) window.clearInterval(this.intervalId);
      this.intervalId = null;
      this.deadline = 0;
    }
  }

  class MediaRenderer {
    render(question, compact = false) {
      const wrapper = document.createElement("div");
      wrapper.className = `media-content media-${question.contentType}${compact ? " compact" : ""}`;

      if (!question.content) {
        this.showError(
          wrapper,
          "",
          "The API did not return a media path for this item.",
        );
        return wrapper;
      }

      if (question.contentType === "image") {
        wrapper.appendChild(this.createImage(question, wrapper, compact));
      } else if (question.contentType === "video") {
        wrapper.appendChild(this.createVideo(question, wrapper, compact));
      } else {
        const blockquote = document.createElement("blockquote");
        blockquote.textContent =
          question.content || "No text content was returned by the API.";
        wrapper.appendChild(blockquote);
      }

      return wrapper;
    }

    createImage(question, wrapper, compact) {
      const image = document.createElement("img");
      image.src = question.content;
      image.alt = `Quiz image about ${question.topic}`;
      image.loading = "eager";
      image.decoding = "async";
      image.addEventListener(
        "error",
        () => {
          this.showError(
            wrapper,
            question.content,
            "The image URL could not be displayed.",
            () => wrapper.replaceWith(this.render(question, compact)),
          );
        },
        { once: true },
      );
      return image;
    }

    createVideo(question, wrapper, compact) {
      const shell = document.createElement("div");
      shell.className = "video-shell is-loading";

      const video = document.createElement("video");
      video.controls = true;
      video.playsInline = true;
      video.preload = "metadata";
      video.controlsList = "nodownload";
      video.setAttribute("aria-label", `Quiz video about ${question.topic}`);

      const source = document.createElement("source");
      source.src = question.content;
      const mimeType = this.inferVideoMimeType(question.content);
      if (mimeType) source.type = mimeType;
      video.appendChild(source);

      const fallbackText = document.createElement("p");
      fallbackText.textContent = "Your browser cannot play this video.";
      video.appendChild(fallbackText);

      const loading = document.createElement("div");
      loading.className = "video-loading";
      const loader = document.createElement("span");
      loader.className = "mini-loader";
      loader.setAttribute("aria-hidden", "true");
      const loadingText = document.createElement("span");
      loadingText.textContent = "Loading video…";
      loading.append(loader, loadingText);

      const actions = document.createElement("div");
      actions.className = "video-actions";
      const openLink = document.createElement("a");
      openLink.href = question.content;
      openLink.target = "_blank";
      openLink.rel = "noopener";
      openLink.textContent = "Open original video";
      actions.appendChild(openLink);

      const markReady = () => shell.classList.remove("is-loading", "is-slow");
      video.addEventListener("loadedmetadata", markReady, { once: true });
      video.addEventListener("canplay", markReady, { once: true });
      video.addEventListener(
        "error",
        () => {
          const message =
            video.error?.code === 4
              ? "This video format or server response is not supported by the browser."
              : "The video could not be loaded from the API URL.";

          this.showError(wrapper, question.content, message, () =>
            wrapper.replaceWith(this.render(question, compact)),
          );
        },
        { once: true },
      );

      shell.append(video, loading, actions);

      window.setTimeout(() => {
        if (shell.isConnected && video.readyState === 0)
          shell.classList.add("is-slow");
      }, 7000);

      video.load();
      return shell;
    }

    inferVideoMimeType(url) {
      const cleanUrl = String(url).split("?")[0].toLowerCase();
      if (cleanUrl.endsWith(".webm")) return "video/webm";
      if (cleanUrl.endsWith(".ogg") || cleanUrl.endsWith(".ogv"))
        return "video/ogg";
      if (cleanUrl.endsWith(".mov")) return "video/quicktime";
      if (cleanUrl.endsWith(".mp4") || cleanUrl.endsWith(".m4v"))
        return "video/mp4";
      return "";
    }

    showError(wrapper, url, message, retryHandler = null) {
      const panel = document.createElement("div");
      panel.className = "media-error";

      const title = document.createElement("strong");
      title.textContent = "Media could not be loaded";
      const copy = document.createElement("p");
      copy.textContent = message || "The browser could not display this media.";
      panel.append(title, copy);

      const actions = document.createElement("div");
      actions.className = "media-error-actions";

      if (retryHandler) {
        const retryButton = document.createElement("button");
        retryButton.type = "button";
        retryButton.className = "secondary-button compact-button";
        retryButton.textContent = "Try again";
        retryButton.addEventListener("click", retryHandler);
        actions.appendChild(retryButton);
      }

      if (url) {
        const openLink = document.createElement("a");
        openLink.href = url;
        openLink.target = "_blank";
        openLink.rel = "noopener";
        openLink.textContent = "Open media in a new tab";
        actions.appendChild(openLink);
      }

      panel.appendChild(actions);
      wrapper.replaceChildren(panel);
    }
  }

  class BeleUI {
    constructor(appConfig) {
      this.config = appConfig;
      this.mediaRenderer = new MediaRenderer();
      this.toastTimerId = null;

      this.screens = {
        welcome: DomUtils.one("#welcomeScreen"),
        level: DomUtils.one("#levelScreen"),
        quiz: DomUtils.one("#quizScreen"),
        about: DomUtils.one("#aboutScreen"),
        result: DomUtils.one("#resultScreen"),
        review: DomUtils.one("#reviewScreen"),
      };

      this.elements = {
        appMain: DomUtils.one("#app-main"),
        nameForm: DomUtils.one("#nameForm"),
        playerName: DomUtils.one("#playerName"),
        nameError: DomUtils.one("#nameError"),
        welcomeName: DomUtils.one("#welcomeName"),
        levelPlayerName: DomUtils.one("#levelPlayerName"),
        difficultyLabel: DomUtils.one("#difficultyLabel"),
        questionCounter: DomUtils.one("#questionCounter"),
        progressFill: DomUtils.one("#progressFill"),
        correctCount: DomUtils.one("#correctCount"),
        questionTimer: DomUtils.one("#questionTimer"),
        timerValue: DomUtils.one("#timerValue"),
        contentTypeBadge: DomUtils.one("#contentTypeBadge"),
        questionTopic: DomUtils.one("#questionTopic"),
        contentFrame: DomUtils.one("#contentFrame"),
        answerButtons: DomUtils.one("#answerButtons"),
        answerFeedback: DomUtils.one("#answerFeedback"),
        nextQuestionButton: DomUtils.one("#nextQuestionButton"),
        resultEyebrow: DomUtils.one("#resultEyebrow"),
        resultTitle: DomUtils.one("#resultTitle"),
        resultMessage: DomUtils.one("#resultMessage"),
        scorePercent: DomUtils.one("#scorePercent"),
        resultCorrect: DomUtils.one("#resultCorrect"),
        resultTotal: DomUtils.one("#resultTotal"),
        resultDifficulty: DomUtils.one("#resultDifficulty"),
        resultTimedOut: DomUtils.one("#resultTimedOut"),
        medalWrap: DomUtils.one("#medalWrap"),
        teamGrid: DomUtils.one("#teamGrid"),
        reviewList: DomUtils.one("#reviewList"),
        reviewPreview: DomUtils.one("#reviewPreview"),
        loadingOverlay: DomUtils.one("#loadingOverlay"),
        loadingTitle: DomUtils.one("#loadingTitle"),
        loadingMessage: DomUtils.one("#loadingMessage"),
        apiIndicator: DomUtils.one("#apiIndicator"),
        apiLabel: DomUtils.one(".api-label"),
        menuButton: DomUtils.one("#menuButton"),
        sideMenu: DomUtils.one("#sideMenu"),
        menuBackdrop: DomUtils.one("#menuBackdrop"),
        closeMenuButton: DomUtils.one("#closeMenuButton"),
        modalBackdrop: DomUtils.one("#modalBackdrop"),
        modalContent: DomUtils.one("#modalContent"),
        modalCloseButton: DomUtils.one("#modalCloseButton"),
        toast: DomUtils.one("#toast"),
      };
    }

    showScreen(name) {
      Object.entries(this.screens).forEach(([key, screen]) => {
        const active = key === name;
        screen.hidden = !active;
        screen.classList.toggle("is-active", active);
      });

      this.closeMenu();
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.setTimeout(
        () => this.elements.appMain.focus({ preventScroll: true }),
        50,
      );
    }

    updatePlayer(playerName) {
      const safeName = String(playerName || "").trim();
      this.elements.playerName.value = safeName;
      this.elements.welcomeName.textContent = safeName ? `, ${safeName}` : "";
      this.elements.levelPlayerName.textContent = safeName || "Player";
    }

    showNameError(message) {
      this.elements.nameError.textContent = message;
      if (message) this.elements.playerName.focus();
    }

    setLoading(
      visible,
      title = "Loading quiz",
      message = "Fetching questions from the quiz API…",
    ) {
      this.elements.loadingOverlay.hidden = !visible;
      this.elements.loadingTitle.textContent = title;
      this.elements.loadingMessage.textContent = message;
    }

    setApiStatus(status, label) {
      this.elements.apiIndicator.dataset.status = status;
      this.elements.apiLabel.textContent = label;
    }

    showToast(message, tone = "info") {
      this.elements.toast.textContent = message;
      this.elements.toast.dataset.tone = tone;
      this.elements.toast.hidden = false;
      window.clearTimeout(this.toastTimerId);
      this.toastTimerId = window.setTimeout(() => {
        this.elements.toast.hidden = true;
      }, 3500);
    }

    openMenu() {
      this.elements.sideMenu.classList.add("is-open");
      this.elements.sideMenu.setAttribute("aria-hidden", "false");
      this.elements.menuButton.setAttribute("aria-expanded", "true");
      this.elements.menuBackdrop.hidden = false;
      this.elements.closeMenuButton.focus();
    }

    closeMenu() {
      this.elements.sideMenu.classList.remove("is-open");
      this.elements.sideMenu.setAttribute("aria-hidden", "true");
      this.elements.menuButton.setAttribute("aria-expanded", "false");
      this.elements.menuBackdrop.hidden = true;
    }

    openHowToPlayModal() {
      const timers = this.config.TIMER;
      this.elements.modalContent.innerHTML = `
        <p class="eyebrow">Game guide</p>
        <h2 id="modalTitle">How to play</h2>
        <ol class="modal-steps">
          <li><strong>Choose a level.</strong><span>Beginner gives ${timers.easy} seconds, Medium gives ${timers.medium} seconds, and Hard gives ${timers.hard} seconds per question.</span></li>
          <li><strong>Inspect the content.</strong><span>You may receive text, an image, or a video from the live quiz collection.</span></li>
          <li><strong>Choose Human or AI.</strong><span>Look for evidence instead of relying on one visual clue.</span></li>
          <li><strong>Read the feedback.</strong><span>A short explanation appears after every answer.</span></li>
          <li><strong>Review the round.</strong><span>Use the full explanations and key points to improve your reasoning.</span></li>
        </ol>
        <div class="modal-callout"><strong>Remember:</strong> AI detectors and human judgement can both be wrong. Verify important information using reliable sources.</div>`;

      this.elements.modalBackdrop.hidden = false;
      this.elements.modalCloseButton.focus();
      this.closeMenu();
    }

    closeModal() {
      this.elements.modalBackdrop.hidden = true;
      this.elements.modalContent.innerHTML = "";
    }

    // renderTeamMembers(members) {
    //   const cards = members.map((member) => {
    //     const card = document.createElement("article");
    //     card.className = "team-card";

    //     const memberHeader = document.createElement("div");
    //     memberHeader.className = "member-header";

    //     if (member.photo) {
    //       const photo = document.createElement("img");
    //       photo.className = "member-photo";
    //       photo.src = member.photo;
    //       photo.alt = `Portrait of ${member.name}`;
    //       card.appendChild(photo);
    //     } else {
    //       const avatar = document.createElement("div");
    //       avatar.className = "member-avatar";
    //       avatar.setAttribute("aria-hidden", "true");
    //       avatar.textContent = member.initials;
    //       card.appendChild(avatar);
    //     }

    //     const copy = document.createElement("div");
    //     copy.className = "member-copy";

    //     const role = document.createElement("p");
    //     role.className = "member-role";
    //     role.textContent = member.role;

    //     const name = document.createElement("h3");
    //     name.textContent = member.name;

    //     const contribution = document.createElement("p");
    //     contribution.textContent = member.contribution;

    //     const skills = document.createElement("div");
    //     skills.className = "member-skills";
    //     skills.setAttribute("aria-label", "Skills");
    //     member.skills.forEach((skill) => {
    //       const tag = document.createElement("span");
    //       tag.textContent = skill;
    //       skills.appendChild(tag);
    //     });

    //     copy.append(role, name, contribution, skills);
    //     card.appendChild(copy);
    //     return card;
    //   });

    //   this.elements.teamGrid.replaceChildren(...cards);
    // }

    renderTeamMembers(members) {
      const cards = members.map((member) => {
        const card = document.createElement("article");
        card.className = "team-card";

        // =========================
        // HEADER: Photo + Name + Role
        // =========================
        const memberHeader = document.createElement("div");
        memberHeader.className = "member-header";

        // Photo or fallback avatar
        if (member.photo) {
          const photo = document.createElement("img");
          photo.className = "member-photo";
          photo.src = member.photo;
          photo.alt = `Portrait of ${member.name}`;

          memberHeader.appendChild(photo);
        } else {
          const avatar = document.createElement("div");
          avatar.className = "member-avatar";
          avatar.setAttribute("aria-hidden", "true");
          avatar.textContent = member.initials || member.name.charAt(0);

          memberHeader.appendChild(avatar);
        }

        // Name + Role beside the photo
        const identity = document.createElement("div");
        identity.className = "member-identity";

        const name = document.createElement("h3");
        name.className = "member-name";
        name.textContent = member.name;

        const role = document.createElement("p");
        role.className = "member-role";
        role.textContent = member.role;

        identity.append(name, role);
        memberHeader.appendChild(identity);

        // =========================
        // CONTRIBUTION
        // =========================
        const contribution = document.createElement("p");
        contribution.className = "member-contribution";
        contribution.textContent = member.contribution;

        // =========================
        // SKILLS
        // =========================
        const skills = document.createElement("div");
        skills.className = "member-skills";
        skills.setAttribute("aria-label", `${member.name}'s skills`);

        member.skills.forEach((skill) => {
          const tag = document.createElement("span");
          tag.className = "skill-tag";
          tag.textContent = skill;

          skills.appendChild(tag);
        });

        // =========================
        // BUILD CARD
        // =========================
        card.append(memberHeader, contribution, skills);

        return card;
      });

      this.elements.teamGrid.replaceChildren(...cards);
    }

    renderQuestion({
      question,
      currentIndex,
      total,
      correctCount,
      difficulty,
    }) {
      const questionNumber = currentIndex + 1;
      this.elements.difficultyLabel.textContent = `${DomUtils.levelLabel(difficulty)} level`;
      this.elements.questionCounter.textContent = `Question ${questionNumber} of ${total}`;
      this.elements.progressFill.style.width = `${(currentIndex / total) * 100}%`;
      this.elements.correctCount.textContent = String(correctCount);
      this.elements.contentTypeBadge.textContent =
        question.contentType.toUpperCase();
      this.elements.questionTopic.textContent = question.topic;
      this.elements.contentFrame.replaceChildren(
        this.mediaRenderer.render(question),
      );
      this.resetAnswerArea(questionNumber === total);
    }

    resetAnswerArea(isLastQuestion) {
      this.elements.answerFeedback.hidden = true;
      this.elements.answerFeedback.className = "answer-feedback";
      this.elements.answerFeedback.replaceChildren();
      this.elements.nextQuestionButton.hidden = true;
      this.elements.nextQuestionButton.textContent = isLastQuestion
        ? "See my result →"
        : "Next question →";

      this.answerButtons().forEach((button) => {
        button.disabled = false;
        button.classList.remove(
          "is-selected",
          "is-correct",
          "is-wrong",
          "is-loading",
        );
      });
    }

    answerButtons() {
      return DomUtils.all(".answer-button", this.elements.answerButtons);
    }

    prepareAnswerSubmission(selectedButton) {
      this.answerButtons().forEach((button) => {
        button.disabled = true;
        button.classList.toggle("is-selected", button === selectedButton);
      });
      selectedButton.classList.add("is-loading");
    }

    restoreAnswerButtons(selectedButton) {
      this.answerButtons().forEach((button) => {
        button.disabled = false;
        button.classList.remove("is-selected", "is-correct", "is-wrong");
      });
      selectedButton.classList.remove("is-loading");
    }

    showAnswerResult(
      result,
      selectedButton,
      shortExplanation,
      progressPercentage,
      correctCount,
    ) {
      selectedButton.classList.remove("is-loading");
      selectedButton.classList.add(result.correct ? "is-correct" : "is-wrong");

      if (!result.correct) {
        const correctButton = this.answerButtons().find(
          (button) => button.dataset.guess === result.answer,
        );
        correctButton?.classList.add("is-correct");
      }

      this.elements.answerFeedback.className = `answer-feedback ${result.correct ? "correct" : "incorrect"}`;
      this.elements.answerFeedback.replaceChildren();

      const title = document.createElement("strong");
      title.textContent = result.correct
        ? "Correct!"
        : `Not quite — the correct answer is ${result.answer}.`;

      const explanation = document.createElement("p");
      explanation.className = "feedback-explanation";
      explanation.textContent = shortExplanation;

      this.elements.answerFeedback.append(title, explanation);
      this.elements.answerFeedback.hidden = false;
      this.elements.nextQuestionButton.hidden = false;
      this.elements.correctCount.textContent = String(correctCount);
      this.elements.progressFill.style.width = `${progressPercentage}%`;
      this.elements.nextQuestionButton.focus();
    }

    showTimeoutPending(isLastQuestion, progressPercentage) {
      this.answerButtons().forEach((button) => {
        button.disabled = true;
      });
      this.elements.answerFeedback.className = "answer-feedback timeout";
      this.elements.answerFeedback.replaceChildren();

      const title = document.createElement("strong");
      title.textContent = "Time’s up!";
      const explanation = document.createElement("p");
      explanation.className = "feedback-explanation";
      explanation.textContent =
        "This question is unanswered. The correct answer and a short explanation are loading.";

      this.elements.answerFeedback.append(title, explanation);
      this.elements.answerFeedback.hidden = false;
      this.elements.nextQuestionButton.hidden = false;
      this.elements.nextQuestionButton.textContent = isLastQuestion
        ? "See my result →"
        : "Next question →";
      this.elements.progressFill.style.width = `${progressPercentage}%`;
      this.elements.nextQuestionButton.focus();
    }

    updateTimeoutResult(result, shortExplanation) {
      if (this.elements.answerFeedback.hidden) return;
      this.elements.answerFeedback.replaceChildren();

      const title = document.createElement("strong");
      title.textContent = `Time’s up — the correct answer is ${result.answer}.`;
      const explanation = document.createElement("p");
      explanation.className = "feedback-explanation";
      explanation.textContent = shortExplanation;

      this.elements.answerFeedback.append(title, explanation);
    }

    updateTimer(seconds, difficulty) {
      const limit = this.config.TIMER[difficulty] || this.config.TIMER.easy;
      const ratio = seconds / limit;
      const timerState =
        ratio <= 0.2 ? "danger" : ratio <= 0.4 ? "warning" : "normal";

      this.elements.timerValue.textContent = String(seconds);
      this.elements.questionTimer.dataset.state = timerState;
      this.elements.questionTimer.setAttribute(
        "aria-label",
        `${seconds} seconds remaining`,
      );
    }

    renderResult({
      playerName,
      percentage,
      correct,
      total,
      difficulty,
      timedOut,
    }) {
      let title = "Keep investigating!";
      let message =
        "Every mistake is useful evidence. Review the explanations and try another round.";
      let medal = "bronze";

      if (percentage >= this.config.QUIZ.goldPercentage) {
        title = "Excellent investigation!";
        message = `Well done, ${playerName}. You examined the content carefully and made strong judgements.`;
        medal = "gold";
      } else if (percentage >= this.config.QUIZ.passPercentage) {
        title = "Good critical thinking!";
        message = `Nice work, ${playerName}. You caught many clues; the review will help with the difficult ones.`;
        medal = "silver";
      }

      this.elements.resultEyebrow.textContent =
        percentage >= this.config.QUIZ.passPercentage
          ? "Congratulations — you passed!"
          : "Round complete";
      this.elements.resultTitle.textContent = title;
      this.elements.resultMessage.textContent = message;
      this.elements.scorePercent.textContent = `${percentage}%`;
      this.elements.resultCorrect.textContent = String(correct);
      this.elements.resultTotal.textContent = String(total);
      this.elements.resultDifficulty.textContent =
        DomUtils.levelLabel(difficulty);
      this.elements.resultTimedOut.textContent = String(timedOut);
      this.elements.medalWrap.className = `medal-wrap ${medal}`;
    }

    renderReviewList(answers) {
      const buttons = answers.map((answer, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `review-item ${answer.timedOut ? "timed-out" : answer.correct ? "correct" : "incorrect"}`;
        button.dataset.reviewIndex = String(index);

        const number = document.createElement("span");
        number.className = "review-number";
        number.textContent = String(index + 1);

        const copy = document.createElement("span");
        copy.className = "review-item-copy";
        const title = document.createElement("strong");
        title.textContent = `Question ${index + 1}`;
        const topic = document.createElement("small");
        topic.textContent = answer.question.topic;
        copy.append(title, topic);

        const status = document.createElement("span");
        status.className = "review-status";
        status.textContent = answer.timedOut ? "◷" : answer.correct ? "✓" : "×";

        button.append(number, copy, status);
        return button;
      });

      this.elements.reviewList.replaceChildren(...buttons);
    }

    showReviewDetail(answer, index) {
      DomUtils.all(".review-item", this.elements.reviewList).forEach((item) => {
        item.classList.toggle(
          "is-active",
          Number(item.dataset.reviewIndex) === index,
        );
      });

      const preview = document.createElement("div");
      preview.className = "review-detail";

      const mediaContainer = document.createElement("div");
      mediaContainer.className = "review-media";
      mediaContainer.appendChild(
        this.mediaRenderer.render(answer.question, true),
      );

      const copy = document.createElement("div");
      copy.className = "review-copy";

      const answerRow = document.createElement("div");
      answerRow.className = "review-answer-row";
      answerRow.append(
        this.createAnswerPill(
          "Your answer",
          answer.timedOut ? "No answer (time expired)" : answer.guess,
        ),
        this.createAnswerPill("Correct answer", answer.answer),
      );

      const heading = document.createElement("h2");
      heading.textContent = answer.correct
        ? "Why this answer is correct"
        : "Useful clues to consider";

      const explanation = document.createElement("p");
      explanation.textContent = answer.explanation;

      copy.append(answerRow, heading, explanation);

      if (answer.source) {
        const source = document.createElement("p");
        source.className = "source-note";
        const sourceLabel = document.createElement("strong");
        sourceLabel.textContent = "Source note: ";
        source.append(sourceLabel, document.createTextNode(answer.source));
        copy.appendChild(source);
      }

      if (answer.keyPoints.length) {
        const keyTitle = document.createElement("h3");
        keyTitle.textContent = "Key points";
        const list = document.createElement("ul");
        answer.keyPoints.forEach((point) => {
          const item = document.createElement("li");
          item.textContent = point;
          list.appendChild(item);
        });
        copy.append(keyTitle, list);
      }

      const reminder = document.createElement("div");
      reminder.className = "literacy-note";
      const reminderLabel = document.createElement("strong");
      reminderLabel.textContent = "Media literacy reminder: ";
      reminder.append(
        reminderLabel,
        document.createTextNode(
          "Treat these clues as prompts for further verification, not as a guaranteed AI detector.",
        ),
      );
      copy.appendChild(reminder);

      preview.append(mediaContainer, copy);
      this.elements.reviewPreview.replaceChildren(preview);
    }

    createAnswerPill(label, value) {
      const pill = document.createElement("span");
      pill.append(document.createTextNode(`${label}: `));
      const strong = document.createElement("strong");
      strong.textContent = value;
      pill.appendChild(strong);
      return pill;
    }
  }

  class QuizGame {
    constructor({ appConfig, apiClient, storage, ui }) {
      this.config = appConfig;
      this.api = apiClient;
      this.storage = storage;
      this.ui = ui;

      this.state = {
        playerName: this.storage.read(""),
        difficulty: "easy",
        questions: [],
        answers: [],
        currentIndex: 0,
        answerPending: false,
      };

      this.timer = new CountdownTimer(
        (seconds) => this.ui.updateTimer(seconds, this.state.difficulty),
        () => this.handleTimeExpired(),
      );
    }

    get currentQuestion() {
      return this.state.questions[this.state.currentIndex];
    }

    get correctCount() {
      return this.state.answers.filter((answer) => answer?.correct).length;
    }

    showScreen(name) {
      if (name !== "quiz") this.timer.stop();
      this.ui.showScreen(name);
    }

    startFromName() {
      const value = this.ui.elements.playerName.value.trim();
      if (value.length < 2) {
        this.ui.showNameError("Please enter at least two characters.");
        return;
      }

      this.state.playerName = value;
      this.storage.save(value);
      this.ui.showNameError("");
      this.ui.updatePlayer(value);
      this.showScreen("level");
    }

    async beginQuiz(difficulty) {
      this.state.difficulty = difficulty;
      this.state.questions = [];
      this.state.answers = [];
      this.state.currentIndex = 0;
      this.state.answerPending = false;

      this.ui.setLoading(
        true,
        `Preparing ${DomUtils.levelLabel(difficulty)} mode`,
        `Fetching ${this.config.QUIZ.questionCount} random items from the API…`,
      );

      try {
        this.state.questions = await this.api.loadQuiz(
          difficulty,
          this.config.QUIZ.questionCount,
        );
        this.ui.setApiStatus("online", "API online");
        this.showScreen("quiz");
        this.renderCurrentQuestion();
      } catch (error) {
        this.ui.setApiStatus("offline", "API unavailable");
        this.ui.showToast(error.message, "error");
        this.showScreen("level");
      } finally {
        this.ui.setLoading(false);
      }
    }

    renderCurrentQuestion() {
      const question = this.currentQuestion;
      if (!question) {
        this.finishQuiz();
        return;
      }

      this.ui.renderQuestion({
        question,
        currentIndex: this.state.currentIndex,
        total: this.state.questions.length,
        correctCount: this.correctCount,
        difficulty: this.state.difficulty,
      });

      this.timer.start(
        this.config.TIMER[this.state.difficulty] || this.config.TIMER.easy,
      );
    }

    async answerCurrentQuestion(guess, selectedButton) {
      if (
        this.state.answerPending ||
        this.state.answers[this.state.currentIndex]
      )
        return;

      const question = this.currentQuestion;
      const answerIndex = this.state.currentIndex;
      const remainingBeforeSubmit = this.timer.remaining;
      this.state.answerPending = true;
      this.timer.stop();
      this.ui.prepareAnswerSubmission(selectedButton);

      try {
        const result = await this.api.submitAnswer(question, guess);
        this.state.answers[answerIndex] = { ...result, question };

        const shortExplanation = ExplanationFormatter.short(
          result.explanation,
          result.keyPoints,
          this.config.QUIZ.shortExplanationMaxLength,
        );

        this.ui.showAnswerResult(
          result,
          selectedButton,
          shortExplanation,
          ((answerIndex + 1) / this.state.questions.length) * 100,
          this.correctCount,
        );
      } catch (error) {
        this.ui.restoreAnswerButtons(selectedButton);
        this.timer.start(Math.max(5, remainingBeforeSubmit));
        this.ui.showToast(error.message, "error");
      } finally {
        selectedButton.classList.remove("is-loading");
        this.state.answerPending = false;
      }
    }

    handleTimeExpired() {
      if (
        this.state.answerPending ||
        this.state.answers[this.state.currentIndex]
      )
        return;

      const expiredIndex = this.state.currentIndex;
      const question = this.state.questions[expiredIndex];

      this.state.answers[expiredIndex] = {
        id: question.id,
        question,
        guess: "No answer",
        correct: false,
        answer: "Loading…",
        source: "",
        explanation: "The explanation is loading.",
        keyPoints: [],
        timedOut: true,
      };

      this.ui.showTimeoutPending(
        expiredIndex === this.state.questions.length - 1,
        ((expiredIndex + 1) / this.state.questions.length) * 100,
      );

      this.api
        .revealAnswer(question)
        .then((result) => {
          this.state.answers[expiredIndex] = {
            ...result,
            question,
            guess: "No answer",
            correct: false,
            timedOut: true,
          };

          if (
            this.state.currentIndex === expiredIndex &&
            !this.ui.screens.quiz.hidden
          ) {
            const shortExplanation = ExplanationFormatter.short(
              result.explanation,
              result.keyPoints,
              this.config.QUIZ.shortExplanationMaxLength,
            );
            this.ui.updateTimeoutResult(result, shortExplanation);
          }

          const activeReview = this.ui.elements.reviewList.querySelector(
            ".review-item.is-active",
          );
          if (
            !this.ui.screens.review.hidden &&
            Number(activeReview?.dataset.reviewIndex) === expiredIndex
          ) {
            this.showReviewDetail(expiredIndex);
          }
        })
        .catch(() => {
          this.state.answers[expiredIndex] = {
            ...this.state.answers[expiredIndex],
            answer: "Unavailable",
            explanation:
              "The correct answer and explanation could not be retrieved.",
          };
        });
    }

    goToNextQuestion() {
      if (!this.state.answers[this.state.currentIndex]) return;

      if (this.state.currentIndex >= this.state.questions.length - 1) {
        this.finishQuiz();
        return;
      }

      this.state.currentIndex += 1;
      this.renderCurrentQuestion();
      DomUtils.one("#questionHeading")?.focus?.();
    }

    finishQuiz() {
      const total = this.state.questions.length || 1;
      const correct = this.correctCount;
      const percentage = Math.round((correct / total) * 100);
      const timedOut = this.state.answers.filter(
        (answer) => answer?.timedOut,
      ).length;

      this.ui.renderResult({
        playerName: this.state.playerName,
        percentage,
        correct,
        total,
        difficulty: this.state.difficulty,
        timedOut,
      });

      this.showScreen("result");
    }

    renderReview() {
      this.ui.renderReviewList(this.state.answers);
      this.showScreen("review");
      if (this.state.answers.length) this.showReviewDetail(0);
    }

    showReviewDetail(index) {
      const answer = this.state.answers[index];
      if (answer) this.ui.showReviewDetail(answer, index);
    }

    navigate(target) {
      if (target === "home") {
        this.ui.updatePlayer(this.state.playerName);
        this.showScreen("welcome");
      } else if (target === "levels") {
        this.showScreen(this.state.playerName ? "level" : "welcome");
      } else if (target === "about") {
        this.showScreen("about");
      }
    }

    confirmQuitQuiz() {
      if (
        window.confirm("Leave this round? Your current answers will be lost.")
      ) {
        this.showScreen("level");
      }
    }

    handleKeyboard(event) {
      if (event.key === "Escape") {
        if (!this.ui.elements.modalBackdrop.hidden) this.ui.closeModal();
        else this.ui.closeMenu();
      }

      const canAnswer =
        !this.ui.screens.quiz.hidden &&
        !this.state.answers[this.state.currentIndex] &&
        !this.state.answerPending;

      if (!canAnswer) return;
      if (event.key.toLowerCase() === "h")
        DomUtils.one("[data-guess='Human']")?.click();
      if (event.key.toLowerCase() === "a")
        DomUtils.one("[data-guess='AI']")?.click();
    }
  }

  class BeleApp {
    constructor() {
      this.config = config;
      this.fontManager = new FontManager(this.config.FONT);
      this.fontManager.apply();
      this.storage = new StorageService(this.config.APP.storageKey);
      this.api = new apiLibrary.ApiClient(this.config.API);
      this.ui = new BeleUI(this.config);
      this.game = new QuizGame({
        appConfig: this.config,
        apiClient: this.api,
        storage: this.storage,
        ui: this.ui,
      });
    }

    bindEvents() {
      const { elements } = this.ui;

      elements.nameForm.addEventListener("submit", (event) => {
        event.preventDefault();
        this.game.startFromName();
      });

      elements.playerName.addEventListener("input", () =>
        this.ui.showNameError(""),
      );

      DomUtils.all(".level-card").forEach((button) => {
        button.addEventListener("click", () =>
          this.game.beginQuiz(button.dataset.difficulty),
        );
      });

      this.ui.answerButtons().forEach((button) => {
        button.addEventListener("click", () =>
          this.game.answerCurrentQuestion(button.dataset.guess, button),
        );
      });

      elements.nextQuestionButton.addEventListener("click", () =>
        this.game.goToNextQuestion(),
      );
      DomUtils.one("#quitQuizButton").addEventListener("click", () =>
        this.game.confirmQuitQuiz(),
      );
      DomUtils.one("#reviewButton").addEventListener("click", () =>
        this.game.renderReview(),
      );
      DomUtils.one("#playAgainButton").addEventListener("click", () =>
        this.game.showScreen("level"),
      );
      DomUtils.one("#reviewBackButton").addEventListener("click", () =>
        this.game.showScreen("result"),
      );
      DomUtils.one("#brandButton").addEventListener("click", () =>
        this.game.navigate("home"),
      );

      document.addEventListener("click", (event) => {
        const navButton = event.target.closest("[data-nav]");
        if (navButton) this.game.navigate(navButton.dataset.nav);

        const modalButton = event.target.closest("[data-modal]");
        if (modalButton?.dataset.modal === "how") this.ui.openHowToPlayModal();

        const reviewButton = event.target.closest("[data-review-index]");
        if (reviewButton) {
          this.game.showReviewDetail(Number(reviewButton.dataset.reviewIndex));

          if (window.matchMedia("(max-width: 1050px)").matches) {
            window.requestAnimationFrame(() => {
              this.ui.elements.reviewPreview.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            });
          }
        }
      });

      elements.menuButton.addEventListener("click", () => this.ui.openMenu());
      elements.closeMenuButton.addEventListener("click", () =>
        this.ui.closeMenu(),
      );
      elements.menuBackdrop.addEventListener("click", () =>
        this.ui.closeMenu(),
      );
      elements.modalCloseButton.addEventListener("click", () =>
        this.ui.closeModal(),
      );
      elements.modalBackdrop.addEventListener("click", (event) => {
        if (event.target === elements.modalBackdrop) this.ui.closeModal();
      });

      document.addEventListener("keydown", (event) =>
        this.game.handleKeyboard(event),
      );
      window.addEventListener("beforeunload", () => this.game.timer.stop());
    }

    async initialize() {
      this.ui.updatePlayer(this.game.state.playerName);
      this.ui.renderTeamMembers(this.config.TEAM_MEMBERS);
      this.bindEvents();
      this.ui.setApiStatus("checking", "Checking API");

      try {
        await this.api.checkHealth();
        this.ui.setApiStatus("online", "API online");
      } catch {
        this.ui.setApiStatus("offline", "API unavailable");
      }
    }
  }

  // Exposed for learning and debugging. Gameplay starts with BeleApp below.
  window.BeleClasses = Object.freeze({
    ApiClient: apiLibrary.ApiClient,
    FontManager,
    StorageService,
    ExplanationFormatter,
    CountdownTimer,
    MediaRenderer,
    BeleUI,
    QuizGame,
    BeleApp,
  });

  const startApplication = () => {
    const app = new BeleApp();
    app.initialize();
    window.BeleAppInstance = app;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApplication, {
      once: true,
    });
  } else {
    startApplication();
  }
})();
