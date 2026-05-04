import { google, drive_v3, docs_v1 } from 'googleapis';

export class DriveService {
  private drive: drive_v3.Drive;
  private docs: docs_v1.Docs;

  constructor(auth: any) {
    console.log(`[DRIVE] Initializing DriveService with auth: ${!!auth}`);
    this.drive = google.drive({ version: 'v3', auth });
    this.docs = google.docs({ version: 'v1', auth });
  }

  async getAIContextFolderContent(folderName: string = 'AI Context'): Promise<string> {
    try {
      // Find the "AI Context" folder
      const res = await this.drive.files.list({
        q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
      });

      const folders = res.data.files || [];
      const firstFolder = folders[0];
      if (!firstFolder || !firstFolder.id) {
        console.warn(`[DRIVE] No folder named "${folderName}" found or it has no ID.`);
        return '';
      }

      const folderId = firstFolder.id;

      // List all Google Docs in the "AI Context" folder
      const docsRes = await this.drive.files.list({
        q: `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.document' and trashed = false`,
        fields: 'files(id, name)',
      });

      const files = docsRes.data.files || [];
      console.log(`[DRIVE] Found ${files.length} context documents in "${folderName}".`);
      
      let context = '';

      for (const file of files) {
        if (file.id) {
          const doc = await this.docs.documents.get({
            documentId: file.id,
          });
          
          const content = this.extractDocContent(doc.data);
          context += `\n--- Context: ${file.name} ---\n${content}\n`;
        }
      }

      return context;
    } catch (error) {
      console.error('[DRIVE] Error fetching AI context folder content:', error);
      return '';
    }
  }

  private extractDocContent(doc: docs_v1.Schema$Document): string {
    let content = '';
    if (doc.body && doc.body.content) {
      for (const element of doc.body.content) {
        if (element.paragraph && element.paragraph.elements) {
          for (const el of element.paragraph.elements) {
            if (el.textRun && el.textRun.content) {
              content += el.textRun.content;
            }
          }
        }
      }
    }
    return content;
  }
}
