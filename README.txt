KETURIO SECURITY REVIEW UPDATE

Files in this package:
- index.html: complete replacement; adds the Social navigation entry and loads social.js.
- app.js: complete replacement based on the latest saved chat app; diagnostic panel is off by default and uses textContent for dynamic values. Add ?debug=1 to the URL only when debugging.
- social.js: complete replacement based on the latest saved social(9).js; preserves feed, profiles, profile/cover uploads, stories, replies, post comments, notifications and other existing features.
- security_hardening.sql: additive policy/permission hardening. It does not drop or rename tables/columns and does not change buckets.

INSTALLATION
1. Keep your existing config.js unchanged. It must contain the Supabase project URL and publishable/anon key only. Never put a service_role key in browser code.
2. Replace index.html, app.js and social.js in the GitHub repository with these files.
3. Keep your existing styles.css and manifest.webmanifest unchanged.
4. In Supabase SQL Editor, review and run security_hardening.sql after the existing Stage 4, Stories 2.0, and Story Replies setup have been run.
5. Wait for GitHub Pages to redeploy, then test login, logout, chat, opening Social, feed, profile editing, profile photo upload, cover upload, story upload/view/reply, post comments, reactions, and notifications with two test accounts.

NOTES
- No service-role secret is needed in the frontend.
- Public profile-media reads are intentionally retained because profile photos and covers are public-facing.
- This audit used the newest saved social(9).js and app.js available in the project library plus the currently published index.html/styles.css. The saved social(9).js is not the same as the social.js currently loaded by the published index.html, so deploy the matched files together.
- The SQL migration tightens story reply visibility and notification update permissions while preserving existing schema objects.
