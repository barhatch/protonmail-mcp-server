declare module 'mailparser' {
  export interface Attachment {
    filename?: string;
    contentType: string;
    size: number;
    content: Buffer;
    cid?: string;
  }

  export interface AddressObject {
    text: string;
    value: Array<{
      address: string;
      name: string;
    }>;
  }

  export interface ParsedMail {
    from?: AddressObject;
    to?: AddressObject;
    cc?: AddressObject;
    bcc?: AddressObject;
    subject?: string;
    text?: string;
    html?: string | false;
    date?: Date;
    attachments?: Attachment[];
    headers?: Map<string, string>;
    messageId?: string;
    inReplyTo?: string;
    references?: string[];
  }

  export function simpleParser(source: Buffer | string): Promise<ParsedMail>;
}
