import { APP_NAME } from '../brand';

/**
 * Bump when the tour changes: everyone below this number sees the new tour once.
 * Must be >= 1 (the API model rejects 0).
 */
export const CURRENT_TUTORIAL_VERSION = 1;

export type TutorialStep = { title: string; body: string };

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { title: `Welcome to ${APP_NAME}`, body: 'A quick tour: three steps, under a minute.' },
  { title: 'The sidebar', body: 'Home, Profile and features live here. Items with 🔒 need a higher plan.' },
  { title: 'Your profile', body: 'Update your name under Profile. You can replay this tour from the sidebar any time.' },
];
