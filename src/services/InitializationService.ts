import * as vscode from 'vscode';
import fs from 'node:fs';

import { Auth } from '../auth';
import { ConfigService } from './ConfigService';
import { RepositoryService } from './RepositoryService';
import { GitService } from './GitService';

export class InitializationService {
  constructor(
    private authService: Auth,
    private configService: ConfigService,
  ) {}

  getAuthService(): Auth {
    return this.authService;
  }

  async initialize(): Promise<void> {
    const rootPath = await this.configService.getRootPath();
    const hasLocal = fs.existsSync(rootPath);
    
    const syncMode = this.configService.getSyncMode();

    if (!syncMode) {
      vscode.window.showInformationMessage(
        'Please choose your sync mode in the Dory Notes view to get started.',
      );
      return;
    }

    const gitService = new GitService(rootPath);

    if (syncMode === 'local') {
      if (!hasLocal) {
        const result = await gitService.initializeLocalRepo();
        if (result.success) {
          vscode.window.showInformationMessage(
            'Local repository initialized. You can connect to GitHub later using the sync button.',
          );
        }
        else {
          vscode.window.showWarningMessage('Could not initialize local repository.');
        }
      }
      return;
    }

    let octokit = await this.authService.getOctokit();

    if (!octokit) {
      const retry = await vscode.window.showInformationMessage(
        'GitHub authentication required to sync your notes. Please sign in.',
        'Retry',
        'Use Local Only',
      );

      if (retry === 'Retry') {
        octokit = await this.authService.getOctokit();
        
        if (!octokit) {
          await vscode.window.showWarningMessage(
            'Authentication cancelled. Using local mode.',
          );
          await this.configService.setSyncMode('local');
          await this.initialize();
          return;
        }
      }
      else {
        await this.configService.setSyncMode('local');
        if (!hasLocal) {
          const result = await gitService.initializeLocalRepo();
          if (result.success) {
            vscode.window.showInformationMessage(
              'Switched to local mode. You can connect to GitHub later using the sync button.',
            );
          }
        }
        return;
      }
    }

    const accessToken = await this.authService.getAccessToken();
    const repositoryService = new RepositoryService(octokit, accessToken);
    const hasRemote = await repositoryService.checkRemoteRepositoryExists();

    const result = await repositoryService.handleRepositoryState(rootPath, hasLocal, hasRemote);

    if (result.success) {
      vscode.window.showInformationMessage(result.message);
    }
    else {
      vscode.window.showErrorMessage(result.message);
    }
  }
}

