# Keturio static audit report

## Scope inspected
- Newest saved social module: `social(9).js` (used as the base for the replacement `social.js`).
- Latest saved chat module: `app.js` from the project library (used as the base for replacement `app.js`).
- Current `index.html` and `styles.css` published from the GitHub `main` branch.
- Available Stage 3, Stage 4, Stories 2.0, story-replies, and profile-media SQL setup files.
- The saved `get_or_create_direct_conversation(uuid)` RPC from the earlier Supabase-connected ZIP.

This is a static review of the files available in the project library and the published GitHub files. I did not connect to the live Supabase project or execute the SQL migration against the database, so the actual deployed database state still needs verification.

## Findings and changes

### High — Social module is not wired into the published page
The published `index.html` loaded `config.js` and `app.js` only. It did not load `social.js`, and the bottom navigation had no Social button, while the saved social module intentionally does not create its own navigation item.
**Change:** replacement `index.html` adds a Social button, dispatches the existing `keturio:open-social` event, and loads `social.js`. This retains the existing GitHub Pages path and does not alter `config.js`.

### High — Story replies bypass story audience rules
The supplied story-replies setup gave every authenticated user access to all story comments and allowed a signed-in user to insert a reply based only on `author_id`. That could expose replies attached to follower-only stories and allow replies to expired or otherwise invisible stories.
**Change:** `security_hardening.sql` replaces those policies with checks for story expiry and the existing `everyone` / `followers` audience rules, using the existing `follows` table.

### Medium — Story replies could reference a parent on a different story
The schema allowed `parent_comment_id` to reference any row in `moment_comments`, even if the parent reply belonged to another story.
**Change:** migration adds a trigger that requires the parent reply to belong to the same story. Existing tables and columns remain intact.

### Medium — Notification updates allowed more fields than the UI needs
The current policy allowed a recipient to update any column on their notification row. The UI only needs to mark notifications as read.
**Change:** migration narrows authenticated update grants to the `is_read` column only.

### Medium — SECURITY DEFINER notification helper should not be a client RPC
The Stage 4 SQL defines `keturio_add_notification` as a `SECURITY DEFINER` helper intended to be called by trusted database triggers. The migration explicitly revokes execution from client roles while preserving trigger execution by the function owner.

### Medium — Production diagnostic panel and dynamic diagnostic HTML
The chat module displayed a realtime diagnostic overlay after every login and assembled diagnostic values into HTML. Internal identifiers and error text do not need to be shown in normal production use.
**Change:** replacement `app.js` shows the diagnostic panel only when the URL includes `?debug=1` and renders dynamic values with DOM `textContent`, not HTML interpolation.

### Chat RPC review
The available `get_or_create_direct_conversation(uuid)` function checks that the caller is authenticated, rejects a null/self target, checks the target profile exists, and only returns a direct conversation where the caller and target are the two members. The base chat schema/RLS SQL for `messages`, `conversation_members`, receipts, reactions, and profiles was not present in the available files, so those database policies still need review against the live Supabase project.

## Preserved
- Existing Supabase table and column names.
- Existing `profiles.cover_url` and `avatar_url` usage.
- Profile/cover upload logic, accepted MIME types, and 5 MB client limit.
- Story upload/view/reaction/reply logic and the existing `moment_comments` schema.
- Existing chat module behavior, GitHub Pages deployment path, `styles.css`, `manifest.webmanifest`, and `config.js`.
- Public reads for the `profile-media` bucket, as configured for public profile pictures and covers.

## Validation performed
- `node --check` passed for the replacement `app.js` and `social.js`.
- ZIP integrity check passed.
- Static HTML wiring assertion passed: Social button, event dispatch, and `social.js` module script are present.

## Before production release
1. Keep `config.js` unchanged unless separately reviewed. It must contain only the Supabase project URL and publishable/anon key; never expose a `service_role` key in browser files.
2. Review and run `security_hardening.sql` in Supabase SQL Editor after the existing Stage 4, Stories 2.0, and story-replies setup.
3. Test with two accounts: login/logout, chat and realtime messages, Social open, feed, profile edit, profile photo upload, cover upload, story upload/view/reply, follower-only story access, post comments/reactions, and notifications.
4. Confirm the actual Supabase RLS policies and Storage policies in the dashboard match the setup files. Static SQL review cannot prove what is currently deployed.
5. For a complete database-side review, inspect the original SQL that creates chat tables and policies plus the profile-table RLS setup. Those base SQL files were not in the available project library. The deployed `config.js` was also not retrievable during this pass; leave it unchanged and confirm it contains only the Supabase URL and publishable/anon key, never a service-role secret.
