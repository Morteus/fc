export type RootStackParamList = {
  index: undefined;
  record: undefined;
  transactions: undefined; // Assuming no params needed for modal presentation
  Accounts: undefined;
  CreateAccounts: { accountId?: string };
  Budgets: undefined;
  analysis: undefined;
  signup: undefined;
  profile: undefined;
};

// Augment the React Navigation namespace to use our defined param list globally
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
