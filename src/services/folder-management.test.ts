import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimpleIMAPService } from './simple-imap-service.js';

// Mock ImapFlow
vi.mock('imapflow', () => {
  const ImapFlow = vi.fn(function() {
    return {
      connect: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      mailboxCreate: vi.fn().mockResolvedValue(undefined),
      mailboxDelete: vi.fn().mockResolvedValue(undefined),
      mailboxRename: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([
        { path: 'INBOX', delimiter: '/', flags: new Set() },
        { path: 'Sent', delimiter: '/', flags: new Set() },
      ]),
    };
  });

  return { ImapFlow };
});

// Mock mailparser
vi.mock('mailparser', () => ({
  simpleParser: vi.fn(),
}));

describe('Folder Management', () => {
  let service: SimpleIMAPService;

  beforeEach(async () => {
    service = new SimpleIMAPService();
    // Connect to mock IMAP server
    await service.connect('localhost', 1143, 'test@example.com', 'password');
  });

  describe('createFolder', () => {
    it('should create a new folder', async () => {
      const result = await service.createFolder('MyFolder');
      expect(result).toBe(true);
    });

    it('should throw error if folder already exists', async () => {
      const mockClient = (service as any).client;
      mockClient.mailboxCreate.mockRejectedValueOnce({
        responseText: 'ALREADYEXISTS',
      });

      await expect(service.createFolder('INBOX')).rejects.toThrow(
        "Folder 'INBOX' already exists"
      );
    });

    it('should throw error if not connected', async () => {
      const disconnectedService = new SimpleIMAPService();
      await expect(disconnectedService.createFolder('Test')).rejects.toThrow(
        'IMAP client not connected'
      );
    });
  });

  describe('deleteFolder', () => {
    it('should delete a folder', async () => {
      const result = await service.deleteFolder('MyFolder');
      expect(result).toBe(true);
    });

    it('should prevent deletion of system folders', async () => {
      const systemFolders = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Spam'];

      for (const folder of systemFolders) {
        await expect(service.deleteFolder(folder)).rejects.toThrow(
          `Cannot delete protected folder: ${folder}`
        );
      }
    });

    it('should throw error if folder does not exist', async () => {
      const mockClient = (service as any).client;
      mockClient.mailboxDelete.mockRejectedValueOnce({
        responseText: 'NONEXISTENT',
      });

      await expect(service.deleteFolder('NonExistent')).rejects.toThrow(
        "Folder 'NonExistent' does not exist"
      );
    });

    it('should throw error if folder is not empty', async () => {
      const mockClient = (service as any).client;
      mockClient.mailboxDelete.mockRejectedValueOnce({
        responseText: 'HASCHILDREN',
      });

      await expect(service.deleteFolder('MyFolder')).rejects.toThrow(
        "Folder 'MyFolder' is not empty"
      );
    });

    it('should throw error if not connected', async () => {
      const disconnectedService = new SimpleIMAPService();
      await expect(disconnectedService.deleteFolder('Test')).rejects.toThrow(
        'IMAP client not connected'
      );
    });
  });

  describe('renameFolder', () => {
    it('should rename a folder', async () => {
      const result = await service.renameFolder('OldName', 'NewName');
      expect(result).toBe(true);
    });

    it('should prevent renaming of system folders', async () => {
      const systemFolders = ['INBOX', 'Sent', 'Drafts', 'Trash'];

      for (const folder of systemFolders) {
        await expect(service.renameFolder(folder, 'NewName')).rejects.toThrow(
          `Cannot rename protected folder: ${folder}`
        );
      }
    });

    it('should throw error if old folder does not exist', async () => {
      const mockClient = (service as any).client;
      mockClient.mailboxRename.mockRejectedValueOnce({
        responseText: 'NONEXISTENT',
      });

      await expect(service.renameFolder('NonExistent', 'NewName')).rejects.toThrow(
        "Folder 'NonExistent' does not exist"
      );
    });

    it('should throw error if new folder name already exists', async () => {
      const mockClient = (service as any).client;
      mockClient.mailboxRename.mockRejectedValueOnce({
        responseText: 'ALREADYEXISTS',
      });

      await expect(service.renameFolder('OldName', 'ExistingName')).rejects.toThrow(
        "Folder 'ExistingName' already exists"
      );
    });

    it('should throw error if not connected', async () => {
      const disconnectedService = new SimpleIMAPService();
      await expect(
        disconnectedService.renameFolder('Old', 'New')
      ).rejects.toThrow('IMAP client not connected');
    });
  });

  describe('folder cache management', () => {
    it('should clear folder cache after creating folder', async () => {
      const clearSpy = vi.spyOn((service as any).folderCache, 'clear');
      await service.createFolder('NewFolder');
      expect(clearSpy).toHaveBeenCalled();
    });

    it('should clear folder cache after deleting folder', async () => {
      const clearSpy = vi.spyOn((service as any).folderCache, 'clear');
      await service.deleteFolder('MyFolder');
      expect(clearSpy).toHaveBeenCalled();
    });

    it('should clear folder cache after renaming folder', async () => {
      const clearSpy = vi.spyOn((service as any).folderCache, 'clear');
      await service.renameFolder('OldName', 'NewName');
      expect(clearSpy).toHaveBeenCalled();
    });
  });
});
