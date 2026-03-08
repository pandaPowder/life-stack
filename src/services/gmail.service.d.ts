export declare class GmailService {
    private SCOPES;
    private TOKEN_PATH;
    private CREDENTIALS_PATH;
    private gmail;
    private loadSavedCredentialsIfExist;
    private saveCredentials;
    authorize(): Promise<void>;
    fetchRecentSchoolEmails(query?: string): Promise<{
        id: string;
        sender: string;
        subject: string;
        body: string;
        date: Date;
        swayLinks: string[];
    }[]>;
    private getEmailBody;
    private extractSwayLinks;
}
//# sourceMappingURL=gmail.service.d.ts.map