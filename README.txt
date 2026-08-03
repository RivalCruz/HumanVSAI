BELE — RESPONSIVE VANILLA JAVASCRIPT (OOP VERSION)
==================================================

RUN THE WEBSITE
---------------
1. Open this folder in VS Code.
2. Use the Live Server extension, or open a terminal in this folder and run:

   python -m http.server 5500

3. Visit http://localhost:5500

Do not test the API by double-clicking index.html. Use a local server.

EASIEST ITEMS TO EDIT
---------------------
Open js/config.js. It contains:
- API base URL
- Number of questions
- Beginner, Medium, and Hard timer durations
- Passing and medal percentages
- Maximum length of the short answer explanation
- Names, roles, photos, contributions, and skills for all five team members

To add profile photos:
1. Put image files in assets/team/
2. Change a member's photo value in js/config.js, for example:
   photo: "assets/team/member-1.jpg"

OOP STRUCTURE
-------------
js/config.js
- Editable project settings and team information.

js/api.js
- ApiError: custom API error type.
- ApiClient: requests questions and answers and normalizes API responses.

js/app.js
- StorageService: saves and reads the player name.
- ExplanationFormatter: creates the short explanation shown after an answer.
- CountdownTimer: controls the timer.
- MediaRenderer: displays text, images, and videos.
- BeleUI: controls the pages and visual elements.
- QuizGame: controls quiz state, answers, scores, timeouts, and reviews.
- BeleApp: creates the objects and connects all event listeners.

ANSWER EXPLANATIONS
-------------------
After both correct and incorrect choices, the game displays a short version of
"explanation" returned by the answer API. The full explanation and key points
remain available on the review page.

VIDEO NOTES
-----------
The player supports MP4, WebM, OGG, M4V, and MOV URLs. If a video still does not
play, click "Open original video". The media host must return a valid public URL,
a browser-supported codec (H.264/AAC in MP4 is the safest option), a suitable
Content-Type such as video/mp4, and permission for the browser to access it.
