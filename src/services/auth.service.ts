import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { authenticate } from '@google-cloud/local-auth';

export class AuthService {
  private SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/documents.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
  ];
  private TOKEN_PATH = path.join(process.cwd(), 'token.json');
  private CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
  public auth: any = null;

  private async loadSavedCredentialsIfExist() {
    try {
      const content = await fs.readFile(this.TOKEN_PATH, 'utf-8');
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    } catch (err) {
      return null;
    }
  }

  private async saveCredentials(client: any) {
    const content = await fs.readFile(this.CREDENTIALS_PATH, 'utf-8');
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const credentials = {
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    };
    await fs.writeFile(this.TOKEN_PATH, JSON.stringify(credentials));
    return credentials;
  }

  async authorize() {
    let client: any = await this.loadSavedCredentialsIfExist();
    
    if (client) {
      try {
        // Simple verification that the token still works
        const drive = google.drive({ version: 'v3', auth: client });
        await drive.about.get({ fields: 'user' });
        this.auth = client;
        console.log(`\n[AUTH SUCCESS] Authenticated with Google.`);
        return;
      } catch (err) {
        console.log('Saved token is invalid or expired. Re-authenticating...');
        try { await fs.unlink(this.TOKEN_PATH); } catch {}
      }
    }

    // NOTE: @google-cloud/local-auth (v3.0.1) bundles google-auth-library@9,
    // while `googleapis` (v171+) uses google-auth-library@10 internally.
    // Passing the client returned by `authenticate()` directly into
    // google.drive()/google.gmail() silently drops the Authorization header
    // (v10's request pipeline builds headers as a fetch `Headers` object,
    // which v9's request code doesn't know how to mutate), producing
    // "unregistered callers" / "CREDENTIALS_MISSING" errors even though the
    // token itself is valid. So we only use the local-auth client to obtain
    // credentials, then rebuild a v10-native client (same as the cached-token
    // load path below) to actually make API calls with.
    const authClient = await authenticate({
      scopes: this.SCOPES,
      keyfilePath: this.CREDENTIALS_PATH,
    });

    if (!authClient || !authClient.credentials || !authClient.credentials.refresh_token) {
      throw new Error('Google authentication did not return a refresh token.');
    }

    const credentials = await this.saveCredentials(authClient);
    this.auth = google.auth.fromJSON(credentials);
    console.log(`\n[AUTH SUCCESS] Authenticated with Google. Auth client present: ${!!this.auth}`);
  }
}
