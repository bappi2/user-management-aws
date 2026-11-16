import { Amplify } from 'aws-amplify';
import { config } from './config';

/** Connect Amplify to OUR User Pool (created by CDK). Call once, before rendering. */
export function configureAuth(): void {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.userPoolClientId,
        loginWith: { email: true },
        signUpVerificationMethod: 'code',
      },
    },
  });
}

/** Amplify throws Error objects with Cognito's message (e.g. "Incorrect username or password."). */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
