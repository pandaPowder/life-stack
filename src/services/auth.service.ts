import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { authenticate } from '@google-cloud/local-auth';

export class AuthService {
  private SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/documents.readonly'
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
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(this.TOKEN_PATH, payload);
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

    const authClient = await authenticate({
      scopes: this.SCOPES,
      keyfilePath: this.CREDENTIALS_PATH,
    });

    if (authClient && authClient.credentials) {
      await this.saveCredentials(authClient);
    }

    this.auth = authClient;
    console.log(`\n[AUTH SUCCESS] Authenticated with Google. Auth client present: ${!!this.auth}`);
  }
}
