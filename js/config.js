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
      name: "Member 1",
      role: "Project Lead & Research",
      photo: "assets/logo3.png",
      initials: "M1",
      contribution:
        "Coordinates the project, media-literacy research, planning, and final presentation.",
      skills: ["Leadership", "Research", "Presentation"],
    },
    {
      name: "Member 2",
      role: "UI/UX Designer",
      photo: "",
      initials: "M2",
      contribution:
        "Creates the visual identity, user flow, responsive layouts, and accessibility decisions.",
      skills: ["Adobe Illustrator", "Wireframing", "UX"],
    },
    {
      name: "Member 3",
      role: "Frontend Developer",
      photo: "",
      initials: "M3",
      contribution:
        "Builds the responsive interface, quiz interactions, timer, and browser behaviour.",
      skills: ["HTML", "CSS", "JavaScript"],
    },
    {
      name: "Member 4",
      role: "Backend & API Developer",
      photo: "",
      initials: "M4",
      contribution:
        "Develops the quiz API, answer routes, deployment, and media delivery.",
      skills: ["Python", "FastAPI", "Vercel"],
    },
    {
      name: "Member 5",
      role: "Content & Quality Assurance",
      photo: "",
      initials: "M5",
      contribution:
        "Prepares content, checks explanations and sources, and tests the complete game.",
      skills: ["Data curation", "Verification", "Testing"],
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
