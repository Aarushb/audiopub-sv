\### Refined Prompt



\---



\*\*Context \& Platform Conventions\*\*



Thoroughly analyze the source code, comments, and documentation to understand the platform’s architecture, coding paradigms, and conventions. You will replicate and emulate these patterns exactly.



\* \*\*AI Artifacts:\*\* Do not introduce unnecessary AI artifacts in code or comments (e.g., extraneous em dashes or en dashes). Conduct a final verification pass across all modified files before completion to ensure none were added and the existing codebase's paradimes were followed.

\* \*\*Accessibility (Crucial):\*\* I am blind, and this platform is specifically designed for blind users. Ensure all UI changes rigorously follow accessibility best practices using the existing framework's patterns (proper heading hierarchy, ARIA attributes, semantic HTML, and visual parity for sighted users).



\---



\*\*Local Setup \& Repository Workflow\*\*



1\. Ensure the fork is fully synced with upstream before starting.

2\. Set up a portable local environment using Docker for the external MariaDB database (ensuring any local Docker compose/config files are excluded via `.gitignore`).

3\. Create a dedicated feature branch with a clear name.



\---



\*\*Feature Implementation Requirements\*\*



\#### 1. Playlists Feature



\* \*\*Creation UI:\*\* Add a "Create" submenu under the main menu (housing \*Upload\*, \*Go Live\*, and \*Make Playlist\*). Clicking \*Make Playlist\* opens a creation page where users can input a playlist name and view their uploaded videos as `###` (H3) headings with multi-select checkboxes, followed by an "Add" button.

\* \*\*Upload Integration:\*\* When uploading new media, include a checkbox/multi-select option allowing users to add the new clip to one or more existing playlists.

\* \*\*Feed Display \& Routing:\*\* On feed items (e.g., homepage clips), display a "Part of \[Playlist Name]" link after the clip title and before the creator’s username link.

\* \*Optional Routing:\* If achievable without disrupting existing DB or URL architecture, structure playlist URLs cleanly (e.g., `user/@username/playlists` or `?clip=1`). If this risks architecture regression, skip the custom route structure.





\* \*\*Profile Page Integration:\*\* Add profile tabs to filter user content (e.g., \*Live Archives\*, \*Uploaded Clips\*, \*Playlists\*). Ensure items use proper heading structures (`###`) so screen reader users can jump through them efficiently. Clicking a playlist opens its contents.



\#### 2. Autoplay System



\* Implement an autoplay toggle switch in the media player.

\* \*\*In a Playlist:\*\* If toggled ON, automatically play the next clip in the playlist sequence.

\* \*\*In standard feeds (Homepage, Profile, etc.):\*\* If toggled ON, automatically play the next consecutive clip down the list/feed.



\#### 3. Filtering \& Search Modifiers



\* \*\*UI Filter Redesign:\*\* Convert the existing "Exclude Archives" checkbox into a flexible filter control (e.g., checkboxes for \*Clips\*, \*Playlists\*, and \*Live Archives\*). Users can select any combination, but cannot uncheck all options.

\* \*\*Accessible Layout:\*\* Keep this interface clean and uncluttered using expandable/collapsible regions or headings according to accessibility standards, ensuring clear visual and screen-reader indicators.

\* \*\*Search Prefixes:\*\* Add search tag syntax to the main search bar (e.g., `playlist:query` to restrict results to playlists, `live:query` for live archives).



\---



\*\*Git \& Commit Standards\*\*



\* Work systematically and modularly. Separate issues and implementations rather than tackling everything in one monolith.

\* Make frequent, atomic commits based on completed logical units (feature, fix, doc update) rather than lines of code written.

\* Use Conventional Commits formatting strictly in single-line format: `git commit -m "feat: description"` or `git commit -m "fix: description"`. No multiline commit messages or bulk commits.

\* Notify me when the feature branch is complete and ready for PR review.



