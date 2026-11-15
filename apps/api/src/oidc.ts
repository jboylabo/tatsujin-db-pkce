import * as client from 'openid-client'
import type { Config } from './config.ts'

export type FlowChecks = { codeVerifier: string; state: string; nonce: string }
export type OidcIdentity = { issuer: string; subject: string; email?: string; idToken: string }

/** 標準OIDCのみを扱う薄い境界。IdP(Keycloak/Cognito)固有の処理は持たない */
export interface OidcService {
  createFlow(): Promise<FlowChecks & { url: string }>
  exchange(callbackUrl: URL, checks: FlowChecks): Promise<OidcIdentity>
  endSessionUrl(idToken: string | undefined): Promise<string>
}

export function createOidcService(cfg: Config): OidcService {
  let configPromise: Promise<client.Configuration> | undefined
  const getConfig = () => {
    configPromise ??= client
      .discovery(new URL(cfg.OIDC_ISSUER), cfg.OIDC_CLIENT_ID, cfg.OIDC_CLIENT_SECRET, undefined, {
        // ローカル開発の http IdP のみ許可
        execute: cfg.OIDC_ISSUER.startsWith('http://') ? [client.allowInsecureRequests] : [],
      })
      .catch((e) => {
        configPromise = undefined
        throw e
      })
    return configPromise
  }

  return {
    async createFlow() {
      const config = await getConfig()
      const codeVerifier = client.randomPKCECodeVerifier()
      const state = client.randomState()
      const nonce = client.randomNonce()
      const url = client.buildAuthorizationUrl(config, {
        redirect_uri: cfg.OIDC_REDIRECT_URI,
        scope: 'openid email profile',
        code_challenge: await client.calculatePKCECodeChallenge(codeVerifier),
        code_challenge_method: 'S256',
        state,
        nonce,
      })
      return { codeVerifier, state, nonce, url: url.href }
    },

    async exchange(callbackUrl, checks) {
      const config = await getConfig()
      const tokens = await client.authorizationCodeGrant(config, callbackUrl, {
        pkceCodeVerifier: checks.codeVerifier,
        expectedState: checks.state,
        expectedNonce: checks.nonce,
        idTokenExpected: true,
      })
      const claims = tokens.claims()
      if (!claims || !tokens.id_token) throw new Error('id_token missing')
      return {
        issuer: claims.iss,
        subject: claims.sub,
        email: typeof claims.email === 'string' ? claims.email : undefined,
        idToken: tokens.id_token,
      }
    },

    async endSessionUrl(idToken) {
      const config = await getConfig()
      const url = client.buildEndSessionUrl(config, {
        post_logout_redirect_uri: cfg.OIDC_POST_LOGOUT_REDIRECT_URI,
        ...(idToken ? { id_token_hint: idToken } : {}),
      })
      return url.href
    },
  }
}
