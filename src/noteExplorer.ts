import path from 'node:path';
import * as vscode from 'vscode';

import * as utils from './lib/utils';
import { FileSystemProvider, FileEntry } from './providers/FileSystemProvider';
import { NotesTreeProvider } from './providers/NotesTreeProvider';
import { GitService } from './services/GitService';
import { ConfigService } from './services/ConfigService';
import { getErrorMessage } from './lib/errorHandler';
import type { CommandArguments } from './types';

export class NoteExplorer {
  private fileSystemProvider: FileSystemProvider;
  private treeDataProvider: NotesTreeProvider;
  private treeView: vscode.TreeView<FileEntry>;
  private gitService!: GitService;
  private configService: ConfigService;
  private autoCommitInterval: NodeJS.Timeout | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.fileSystemProvider = new FileSystemProvider();
    this.treeDataProvider = new NotesTreeProvider(this.fileSystemProvider);

    this.treeView = vscode.window.createTreeView('dory-notes-container', {
      treeDataProvider: this.treeDataProvider,
      showCollapseAll: true,
    });

    context.subscriptions.push(this.treeView);

    this.configService = new ConfigService(context);
    this.initializeGitService();

    this.registerCommands(context);
    this.startAutoCommit(context);
    this.setupConfigListener(context);
  }

  private async initializeGitService(): Promise<void> {
    try {
      const rootPath = await this.configService.getRootPath();
      
      if (!await utils.exists(rootPath)) {
        await utils.mkdir(rootPath);
      }
      
      this.gitService = new GitService(rootPath);
    }
    catch (error) {
      console.error('Failed to initialize Git service:', error);
    }
  }

  private registerCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      vscode.commands.registerCommand('dory-notes.openNote', resource =>
        this.openNote(resource)),
      
      vscode.commands.registerCommand('dory-notes.newNote', async () =>
        await this.newNote()),
      
      vscode.commands.registerCommand('dory-notes.newFileInFolder', async (folder) =>
        await this.newFileInFolder(folder.uri)),
      
      vscode.commands.registerCommand('dory-notes.newFolder', async () =>
        await this.newFolder()),
      
      vscode.commands.registerCommand('dory-notes.newFolderInFolder', async (folder) =>
        await this.newFolderInFolder(folder.uri)),
      
      vscode.commands.registerCommand('dory-notes.rename', async (resource?: CommandArguments) =>
        await this.rename(resource?.resource?.uri)),
      
      vscode.commands.registerCommand('dory-notes.delete', async (resource) =>
        await this.delete(resource)),
      
      vscode.commands.registerCommand('dory-notes.refresh', () =>
        this.treeDataProvider.refresh()),
    );
  }

  getConfigService(): ConfigService {
    return this.configService;
  }

  private openNote(resource: vscode.Uri): void {
    vscode.window.showTextDocument(resource);
  }

  private async newNote(): Promise<void> {
    try {
      const filename = await this.promptForName('Enter a filename', 'example.md');
      if (!filename)
        {return;}

      const rootPath = await this.configService.getRootPath();
      
      if (!await utils.exists(rootPath)) {
        await utils.mkdir(rootPath);
      }

      const rootUri = vscode.Uri.file(rootPath);
      const filePath = vscode.Uri.joinPath(rootUri, filename);

      await utils.writefile(filePath.fsPath, Buffer.from(''));
      vscode.window.showTextDocument(filePath);
      this.treeDataProvider.refresh();
    }
    catch (error) {
      this.handleFileSystemError(error, 'create file');
    }
  }

  private async newFileInFolder(folderUri: vscode.Uri): Promise<void> {
    try {
      const filename = await this.promptForName('Enter a filename', 'example.md');
      if (!filename)
        {return;}

      const filePath = vscode.Uri.joinPath(folderUri, filename);
      await utils.writefile(filePath.fsPath, Buffer.from(''));
      vscode.window.showTextDocument(filePath);

      await this.treeDataProvider.revealAndExpand(folderUri);
      this.treeDataProvider.refresh();
    }
    catch (error) {
      this.handleFileSystemError(error, 'create file');
    }
  }

  private async newFolder(): Promise<void> {
    try {
      const folderName = await this.promptForName('Enter folder name', 'example-folder');
      if (!folderName)
        {return;}

      const rootPath = await this.configService.getRootPath();
      
      if (!await utils.exists(rootPath)) {
        await utils.mkdir(rootPath);
      }

      const rootUri = vscode.Uri.file(rootPath);
      const folderPath = vscode.Uri.joinPath(rootUri, folderName);

      await this.fileSystemProvider.createDirectory(folderPath);
      this.treeDataProvider.refresh();
      vscode.window.showInformationMessage(`Folder '${folderName}' has been created`);
    }
    catch (error) {
      this.handleFileSystemError(error, 'create folder');
    }
  }

  private async newFolderInFolder(parentUri: vscode.Uri): Promise<void> {
    const folderName = await this.promptForName('Enter folder name', 'example-folder');
    if (!folderName)
      {return;}

    const folderPath = vscode.Uri.joinPath(parentUri, folderName);

    try {
      await this.fileSystemProvider.createDirectory(folderPath);
      this.treeDataProvider.refresh();
      vscode.window.showInformationMessage(`Folder '${folderName}' has been created`);
    }
    catch (error) {
      this.handleFileSystemError(error, 'create folder');
    }
  }

  private async rename(resource: vscode.Uri | undefined): Promise<void> {
    if (!resource) {
      vscode.window.showErrorMessage('No file selected');
      return;
    }

    try {
      const basename = path.basename(resource.fsPath);
      const dirname = path.dirname(resource.fsPath);
      const dotIndex = basename.lastIndexOf('.');

      const value = await vscode.window.showInputBox({
        prompt: 'Enter new name',
        value: basename,
        valueSelection: dotIndex !== -1 ? [0, dotIndex] : undefined,
      });

      if (!value || value.trim().length === 0 || value === basename)
        {return;}

      const newUri = vscode.Uri.file(path.join(dirname, value));
      await this.fileSystemProvider.rename(resource, newUri, { overwrite: false });

      this.treeDataProvider.refresh();
    }
    catch (error) {
      this.handleFileSystemError(error, 'rename file');
    }
  }

  private async delete(resource: FileEntry): Promise<void> {
    const uri = resource.uri;
    if (!uri) {
      vscode.window.showErrorMessage('Invalid file selected');
      return;
    }

    try {
      const basename = path.basename(uri.fsPath);
      const stat = await this.fileSystemProvider.stat(uri);
      const isDirectory = stat.type === vscode.FileType.Directory;

      const answer = await vscode.window.showWarningMessage(
        `Are you sure you want to delete ${isDirectory ? 'folder' : 'file'} '${basename}'?`,
        { modal: true },
        'Delete',
      );

      if (answer === 'Delete') {
        await this.fileSystemProvider.delete(uri, { recursive: isDirectory });

        for (const editor of vscode.window.visibleTextEditors) {
          if (editor.document.uri.fsPath === uri.fsPath) {
            await vscode.window.showTextDocument(editor.document, { preview: false, preserveFocus: true });
            await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
          }
        }

        this.treeDataProvider.refresh();
        vscode.window.showInformationMessage(`${isDirectory ? 'Folder' : 'File'} '${basename}' has been deleted`);
      }
    }
    catch (error) {
      this.handleFileSystemError(error, 'delete file');
    }
  }

  private startAutoCommit(context: vscode.ExtensionContext): void {
    this.restartAutoCommit();

    context.subscriptions.push({
      dispose: () => {
        if (this.autoCommitInterval)
          {clearInterval(this.autoCommitInterval);}
      },
    });
  }

  private setupConfigListener(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('dory-notes.autoCommitInterval'))
          {this.restartAutoCommit();}
      }),
    );
  }

  private restartAutoCommit(): void {
    if (this.autoCommitInterval)
      {clearInterval(this.autoCommitInterval);}

    const intervalMs = this.configService.getAutoCommitInterval();

    this.autoCommitInterval = setInterval(() => {
      if (this.gitService) {
        this.gitService.performAutoCommit().catch(error =>
          console.error('Auto-commit failed:', error),
        );
      }
    }, intervalMs);
  }

  private async promptForName(prompt: string, placeHolder: string): Promise<string | undefined> {
    const value = await vscode.window.showInputBox({ prompt, placeHolder });
    if (value === undefined)
      {return undefined;}

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private handleFileSystemError(error: unknown, operation: string): void {
    const errorMessage = getErrorMessage(error);
    vscode.window.showErrorMessage(`Failed to ${operation}: ${errorMessage}`);
  }
}
