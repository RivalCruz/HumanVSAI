(() => {
  "use strict";

  /*
   * ================================================================
   * BELE EDITABLE SETTINGS
   * ================================================================
   * Change the values in this file when you want to edit the game.
   * The application logic is kept separately in api.js and app.js.
   */

  const TEAM_MEMBERS = [
    {
      name: "Carol",
      role: "Gameplay Logic Developer",
      photo: "",
      initials: "M2",
      contribution:
        "Develops the core game mechanics such as question flow, answer checking, scoring, difficulty levels, timers, and result calculation.",
      skills: ["JavaScript", "Game Logic", "Scoring System"],
    },
    {
      name: "Gregorious",
      role: "Media & Asset Specialist",
      photo: "",
      initials: "M3",
      contribution:
        "Collects, edits, optimizes, and prepares images, videos, and other media content used in the game.",
      skills: ["Asset Collection", "Image Editing", "Video Editing"],
    },
    {
      name: "Melania",
      role: "UI/UX Designer",
      photo: "",
      initials: "M5",
      contribution:
        "Creates the interface, user journey, wireframes, visual design, responsiveness concepts, and overall user experience.",
      skills: ["UI Design", "UX Design", "Adobe Illustrator"],
    },
    {
      name: "Livio",
      role: "Frontend Interaction Developer",
      photo: "",
      initials: "Livio",
      contribution:
        "Develops user interactions, navigation, responsive behavior, media display, feedback components, and overall frontend game experience.",
      skills: ["JavaScript", "Responsive Design", "UI Interaction"],
    },
    {
      name: "Rivaldo",
      role: "Team Lead & API Developer",
      photo: "assets/team/Rivaldo.jpeg",
      initials: "Rivaldo",
      contribution:
        "Leads the project, coordinates the team, develops the API, and manages communication between the dataset and website.",
      skills: ["Python", "FastAPI", "Backend Integration"],
    },
  ];

  window.BeleConfig = Object.freeze({
    APP: Object.freeze({
      name: "is it AI?",
      storageKey: "isitai.playerName",
    }),

    API: Object.freeze({
      baseUrl: "https://quiz-dataset-cyan.vercel.app",
      requestTimeoutMs: 25000,
    }),

    /*
     * CUSTOM FONT SETTINGS
     * 1. Put your font file inside assets/fonts/.
     * 2. Change enabled to true.
     * 3. Update familyName and the source path below.
     * WOFF2 is recommended because it is smaller and loads faster on websites.
     */
    FONT: Object.freeze({
      enabled: false,
      familyName: "is it AI Custom Font",
      applyToBodyText: true,
      fallback:
        'ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif',
      bodyFallback:
        'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: "swap",
      sources: Object.freeze([
        Object.freeze({
          path: "assets/fonts/is-it-ai-custom.woff2",
          format: "woff2",
          weight: "100 900",
          style: "normal",
        }),
      ]),
    }),

    QUIZ: Object.freeze({
      questionCount: 6,
      passPercentage: 60,
      goldPercentage: 80,
      shortExplanationMaxLength: 180,
    }),

    // Timer duration is measured in seconds for each question.
    TIMER: Object.freeze({
      easy: 60,
      medium: 40,
      hard: 25,
    }),

    TEAM_MEMBERS: Object.freeze(
      TEAM_MEMBERS.map((member) =>
        Object.freeze({
          ...member,
          skills: Object.freeze([...member.skills]),
        }),
      ),
    ),
  });
})();
