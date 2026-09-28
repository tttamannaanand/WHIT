export type RootStackParamList = {
  Onboarding: undefined;
  SignUp: undefined;
  Login: undefined;
  Home: undefined;
  Lesson: { lessonId: string };
  Quiz: { lessonId: string };
  Archive: undefined;
  Paywall: { reason?: 'archive' | 'manage' } | undefined;
  Settings: undefined;
  Profile: undefined;
};
