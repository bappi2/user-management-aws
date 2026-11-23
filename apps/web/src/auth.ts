import { Amplify } from 'aws-amplify';
import 'aws-amplify/auth/enable-oauth-listener';   // completes the redirect sign-in when Amplify is configured
import { config } from './config';

/** Connect Amplify to OUR User Pool (created by CDK). Call once, before rendering. */
export function configureAuth(): void {
  // Same build for localhost, beta and prod: build the redirect URLs from where the app runs.
  // They must match the app client's callbackUrls / logoutUrls in CDK exactly.
  const origin = window.location.origin;
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.userPoolId,
        userPoolClientId: config.userPoolClientId,
        signUpVerificationMethod: 'code',
        loginWith: {
          email: true,
          oauth: {
            domain: config.oauthDomain,
            scopes: ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'],
            redirectSignIn: [`${origin}/auth/callback`],
            redirectSignOut: [`${origin}/login`],
            responseType: 'code',
          },
        },
      },
    },
  });
}

/** Amplify throws Error objects with Cognito's message (e.g. "Incorrect username or password."). */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
