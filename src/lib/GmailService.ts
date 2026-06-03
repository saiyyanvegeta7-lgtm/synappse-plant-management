/**
 * Modular helper service to automatically send emails via the Google Workspace Gmail API
 */
export const GmailService = {
  /**
   * Safe Base64URL encoder for MIME messages (Gmail API format requirement)
   */
  base64UrlEncode(str: string): string {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  },

  /**
   * Automated secure Gmail dispatcher
   */
  async sendEmail(accessToken: string, toEmails: string[], subject: string, body: string): Promise<boolean> {
    try {
      if (!accessToken) {
        throw new Error('Access token is required to dispatch automated emails');
      }

      const emailContent = [
        `From: me`,
        `To: ${toEmails.join(', ')}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        `Content-Transfer-Encoding: 7bit`,
        '',
        body
      ].join('\r\n');

      const encodedEmail = this.base64UrlEncode(emailContent);

      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedEmail,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gmail API response error: ${errText}`);
      }

      console.log('Automated Gmail dispatched successfully.');
      return true;
    } catch (error) {
      console.error('Error in automatic Gmail delivery:', error);
      throw error;
    }
  }
};
