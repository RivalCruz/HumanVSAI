(() => {
  "use strict";

  const COMPONENTS = [
    ["#topbar-root", "components/topbar.html"],
    ["#sidebar-root", "components/sidebar.html"],

    ["#welcome-root", "components/screens/welcome.html"],
    ["#level-root", "components/screens/level.html"],
    ["#quiz-root", "components/screens/quiz.html"],
    ["#about-root", "components/screens/about.html"],
    ["#result-root", "components/screens/result.html"],
    ["#review-root", "components/screens/review.html"],

    ["#global-ui-root", "components/global-ui.html"],
  ];

  async function loadComponent(selector, path) {
    const mount = document.querySelector(selector);

    if (!mount) {
      throw new Error(`Component mount point not found: ${selector}`);
    }

    const response = await fetch(path, {
      cache: "no-cache",
    });

    if (!response.ok) {
      throw new Error(`Could not load ${path}. HTTP ${response.status}`);
    }

    mount.innerHTML = await response.text();
  }

  function loadScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");

      script.src = path;
      script.defer = false;

      script.onload = () => resolve();
      script.onerror = () => {
        reject(new Error(`Could not load script: ${path}`));
      };

      document.body.appendChild(script);
    });
  }

  function showLoaderError(error) {
    console.error(error);

    const app = document.getElementById("app");

    if (!app) return;

    app.innerHTML = `
      <main style="
        min-height:100vh;
        display:grid;
        place-items:center;
        padding:24px;
        font-family:system-ui,sans-serif;
        background:#fff7eb;
        color:#2b211b;
      ">
        <section style="
          width:min(650px,100%);
          padding:32px;
          border-radius:22px;
          background:white;
          box-shadow:0 20px 50px rgba(0,0,0,.12);
        ">
          <h1 style="margin-top:0;">The website could not load.</h1>

          <p>
            This modular version loads HTML files with
            <code>fetch()</code>, so it must run through a local
            or hosted web server.
          </p>

          <p>
            Use VS Code <strong>Live Server</strong> instead of
            opening <code>index.html</code> directly with
            <code>file://</code>.
          </p>

          <pre style="
            white-space:pre-wrap;
            overflow-wrap:anywhere;
            padding:14px;
            border-radius:12px;
            background:#fff7eb;
          ">${String(error?.message || error)}</pre>
        </section>
      </main>
    `;
  }

  async function start() {
    try {
      await Promise.all(
        COMPONENTS.map(([selector, path]) => loadComponent(selector, path)),
      );

      /*
       * Load these in order because app.js depends on config.js
       * and api.js.
       */
      await loadScript("js/config.js?v=10");
      await loadScript("js/api.js?v=10");
      await loadScript("js/app.js?v=10");

      document.dispatchEvent(new CustomEvent("isItAIComponentsReady"));
    } catch (error) {
      showLoaderError(error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
