export const cli = {
  help: `Marketing engine fixture CLI

npm run --silent engine -- --profile fixture source add --file fixtures/launch.md
npm run --silent engine -- --profile fixture produce --source <id> --platform x --wait
npm run --silent engine -- --profile fixture draft show --revision <id>
npm run --silent engine -- --profile fixture draft approve --revision <id>
npm run --silent engine -- --profile fixture publish --revision <id> --account x_demo
npm run --silent engine -- --profile fixture publish status --id <id>

Use --db <path> for a separate workspace and --json for machine-readable output.`,
  errors: {
    invalidArguments: 'Check the command and arguments. Use --help for examples.',
    unsupportedProfile: 'Select --profile fixture to run the local workflow.',
    unsupportedPlatform: 'The fixture workflow produces drafts for X. Select --platform x.',
    unreadableSource: 'Choose a readable text or Markdown file.',
    emptySource: 'Add text to the source file before importing it.',
    sourceNotFound: 'Choose an existing source ID.',
    draftNotFound: 'Choose an existing draft revision ID.',
    approvalRequired: 'Approve this draft revision before publishing.',
    accountNotFound: 'Select the fixture X account x_demo.',
    publicationNotFound: 'Choose an existing publication ID.',
    unexpected: 'The command failed. Check the local database path and try again.',
  },
  sourceSaved: (id: string) => `Saved source ${id}.`,
  draftReady: (id: string, text: string) => `Draft ${id}\n${text}`,
  draftApproved: (id: string) => `Approved revision ${id}.`,
  publication: (id: string, url: string) => `Fixture publication ${id}\n${url}`,
};
