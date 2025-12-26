export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface StoredTokens {
  broadcasterToken?: string;
  botToken?: string;
  broadcasterRefreshToken?: string;
  botRefreshToken?: string;
  broadcasterUsername?: string;
  botUsername?: string;
  twitchClientId?: string;
  twitchClientSecret?: string;
  broadcasterTokenExpiry?: number;
  botTokenExpiry?: number;
  lastUpdated?: string;
}

/**
 * Refreshes an access token using the refresh token.
 * @param refreshToken The refresh token to use.
 * @param clientId Twitch Client ID.
 * @param clientSecret Twitch Client Secret.
 * @returns The new token data.
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<TokenData> {
  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to refresh token: ${response.status} ${response.statusText} - ${errorData}`);
  }

  const tokenData: TokenData = await response.json();
  return tokenData;
}

/**
 * Validates an access token with Twitch.
 * @param accessToken The access token to validate.
 * @returns True if valid, false otherwise.
 */
export async function validateAccessToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://id.twitch.tv/oauth2/validate', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
}



/**
 * Ensures a valid access token, refreshing if necessary.
 * @param clientId Twitch Client ID.
 * @param clientSecret Twitch Client Secret.
 * @param tokenType 'broadcaster' or 'bot'.
 * @returns The valid access token.
 */

