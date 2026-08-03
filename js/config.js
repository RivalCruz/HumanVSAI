(() => {
  "use strict";

  const TEAM_MEMBERS = [
    {
      name: "Member 1",
      role: "Project Lead & Research",
      photo: "",
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
      name: "Bele",
      storageKey: "bele.playerName",
    }),

    API: Object.freeze({
      baseUrl: "https://quiz-dataset-cyan.vercel.app",
      requestTimeoutMs: 25000,
    }),

    QUIZ: Object.freeze({
      questionCount: 6,
      passPercentage: 60,
      goldPercentage: 80,
      shortExplanationMaxLength: 180,
    }),

    // Timer
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
