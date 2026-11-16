# Marketing engine repository rules

- **React.** Do not import, re-export, or call React's `useEffect`. Load page data with route loaders, handle mutations in actions or event handlers, and compute derived values during render. Use `useSyncExternalStore` for external stores. For Produce, start the job on submit and read its status through the route's data query.
- **Source comments.** Do not add comments to authored JS, JSX, TS, or TSX. Use clear names and types, and put design rationale in Markdown.
- **Feature boundaries.** Put browser code in `src/web/features/<feature>/` and backend code in `src/server/features/<feature>/`. The browser calls the server through HTTP. Both sides import API types from `src/shared/`. Cross-tree imports are forbidden in either direction, including type imports and re-exports. Shared contracts must stay independent of both trees.
- **Feature entrypoints.** Declare same-runtime dependencies in `feature.json` and import through the target feature's `public.ts`. Keep entrypoints and verification metadata in the owning folder so tooling can generate wiring and `FEATURE_MAP.md`.
- **Shared styles.** Define fonts, colors, spacing, and other shared design tokens in `src/style/`. Keep feature-specific styles with the feature and use shared tokens for design values.
- **User-facing text.** Do not hard-code copy in application code. Use message keys from `src/i18n/` for labels, accessibility text, errors, and human-readable CLI output. Keep whole messages in locale catalogs and pass dynamic values as parameters. Keep machine identifiers stable and display source material and generated drafts as content.
- **Durable writes.** Keep writes inside the owning server feature's persistence code. Use its named commands from API handlers, the product CLI, and workers.
- **Verification.** Build and exercise the product CLI path before adding its web UI. Record how a user reaches the feature and what observable result proves it works. Run `npm run check` before handing off changes.
- **Exceptions.** Use an architecture review to record the owner, precise scope, and removal condition for each exception.
