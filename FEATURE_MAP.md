# Phase 1 feature map

Generated from feature-local `verify.json` files. Run `npm run feature-map` after editing them.

Run fixture commands as `npm run --silent engine -- --profile fixture <command>`. Use the ID printed by the preceding command. Browser routes are planned.

| Owner | Action | CLI command | Planned route | Control | Observable proof | Status |
| --- | --- | --- | --- | --- | --- | --- |
| server/accounts | Connect account | `account connect --platform <platform>` | `/settings/accounts` | Connect account | The OAuth callback records the expected account identity and permissions. | Planned |
| server/drafts | Produce X draft | `produce --source <id> --platform x --wait` | `/sources/:id` | Produce | The saved source yields an unapproved revision with reviewable X copy. | Fixture CLI |
| server/drafts | Show X draft | `draft show --revision <id>` | `/drafts/:id` | Draft preview | A separate process reads the same revision and text. | Fixture CLI |
| server/drafts | Approve revision | `draft approve --revision <id>` | `/drafts/:id` | Approve revision | Approval is recorded for the revision ID shown in the preview. | Fixture CLI |
| server/drafts | Produce LinkedIn article | `produce --source <id> --platform linkedin` | `/sources/:id` | Produce | The saved source yields a complete article that can open in the LinkedIn editor. | Planned |
| server/drafts | Produce YouTube video | `produce --source <id> --platform youtube` | `/sources/:id` | Produce | The selected skill revision and runner produce a playable MP4 with source-derived content. | Planned |
| server/publishing | Publish to fixture X account | `publish --revision <id> --account x_demo` | `/drafts/:id` | Publish to X | Unapproved revisions fail. Repeating a valid request returns the same simulated receipt. | Fixture CLI |
| server/publishing | Read publication status | `publish status --id <id>` | `/drafts/:id` | Publication status | The receipt matches the selected revision and account across processes. | Fixture CLI |
| server/skills | Configure video skill | `skill import, skill test, skill set-default` | `/settings/skills` | Save revision, Run test, Set default | The saved package passes through both runners. Reopening settings preserves it. Changing the default leaves an existing job pinned to its original revision. | Planned |
| server/sources | Add source | `source add --file fixtures/launch.md` | `/sources/new` | Save source | The fixture returns a source ID that a later CLI process can use. | Fixture CLI |
