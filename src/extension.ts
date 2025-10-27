import * as vscode from 'vscode';
import fs from 'node:fs';

import { Auth } from './auth';
import { NoteExplorer } from './noteExplorer';
import { ConfigService } from './services/ConfigService';
import { InitializationService } from './services/InitializationService';
import { RepositoryService } from './services/RepositoryService';
import { DORY_NOTES_ROOT_PATH } from './constants';

export async function activate(context: vscode.ExtensionContext) {
  const authService = new Auth();
  await authService.initialize(context);

  const configService = new ConfigService(context);
  await configService.setRootPath(DORY_NOTES_ROOT_PATH);

  const initializationService = new InitializationService(authService, configService);
  await initializationService.initialize();

  new NoteExplorer(context);

  const loginDisposable = vscode.commands.registerCommand('dory-notes.login', async () => {
    await handleLogin(context, authService, configService);
  });

  const syncDisposable = vscode.commands.registerCommand('dory-notes.syncWithGitHub', async () => {
    await handleSyncWithGitHub(context, authService, configService);
  });

  const chooseLocalDisposable = vscode.commands.registerCommand('dory-notes.chooseLocal', async () => {
    await configService.setSyncMode('local');
    await initializationService.initialize();
  });

  const chooseGitHubDisposable = vscode.commands.registerCommand('dory-notes.chooseGitHub', async () => {
    const octokit = await authService.getOctokit();

    if (!octokit) {
      vscode.window.showWarningMessage('GitHub authentication cancelled. Please try again or use Local Mode.');
      return;
    }

    await configService.setSyncMode('github');
    await initializationService.initialize();
  });

  context.subscriptions.push(loginDisposable, syncDisposable, chooseLocalDisposable, chooseGitHubDisposable);
}

async function handleLogin(
  context: vscode.ExtensionContext,
  authService: Auth,
  configService: ConfigService,
): Promise<void> {
  try {
    const octokit = await authService.getOctokit();

    if (!octokit) {
      vscode.window.showWarningMessage('Authentication cancelled. Local repository is available.');
      return;
    }

    const accessToken = await authService.getAccessToken();
    const repositoryService = new RepositoryService(octokit, accessToken);
    const rootPath = await configService.getRootPath();
    const hasLocal = fs.existsSync(rootPath);
    const hasRemote = await repositoryService.checkRemoteRepositoryExists();

    const result = await repositoryService.handleRepositoryState(rootPath, hasLocal, hasRemote);

    if (result.success) {
      vscode.window.showInformationMessage(result.message);
    }
    else {
      vscode.window.showErrorMessage(result.message);
    }
  }
  catch (error) {
    vscode.window.showErrorMessage(
      `Error while trying to login into dory notes: ${error}`,
    );
  }
}

async function handleSyncWithGitHub(
  context: vscode.ExtensionContext,
  authService: Auth,
  configService: ConfigService,
): Promise<void> {
  try {
    const octokit = await authService.getOctokit();

    if (!octokit) {
      vscode.window.showWarningMessage('Authentication cancelled.');
      return;
    }

    await configService.setSyncMode('github');

    const accessToken = await authService.getAccessToken();
    const repositoryService = new RepositoryService(octokit, accessToken);
    const rootPath = await configService.getRootPath();
    const hasLocal = fs.existsSync(rootPath);
    const hasRemote = await repositoryService.checkRemoteRepositoryExists();

    const result = await repositoryService.handleRepositoryState(rootPath, hasLocal, hasRemote);

    if (result.success) {
      vscode.window.showInformationMessage('Successfully connected to GitHub!');
    }
    else {
      vscode.window.showErrorMessage(result.message);
    }
  }
  catch (error) {
    vscode.window.showErrorMessage(
      `Error while trying to sync with GitHub: ${error}`,
    );
  }
}

export function deactivate() {}
