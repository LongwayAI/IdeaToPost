export type FixturePublicationReceipt = {
  id: string;
  revisionId: string;
  accountId: string;
  state: 'published';
  fixture: true;
  url: string;
};
