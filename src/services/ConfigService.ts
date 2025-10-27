import * as vscode from 'vscode';
import { DEFAULT_AUTO_COMMIT_INTERVAL, DORY_NOTES_ROOT_PATH, SECRET_ROOT_PATH_KEY } from '../constants';

export type SyncMode = 'local' | 'github';

export class ConfigService {
  constructor(private context: vscode.ExtensionContext) {}

  async getRootPath(): Promise<string> {
    const storedPath = await this.context.secrets.get(SECRET_ROOT_PATH_KEY);
    return storedPath || DORY_NOTES_ROOT_PATH;
  }

  async setRootPath(path: string): Promise<void> {
    await this.context.secrets.store(SECRET_ROOT_PATH_KEY, path);
  }

  getAutoCommitInterval(): number {
    const config = vscode.workspace.getConfiguration('dory-notes');
    return config.get<number>('autoCommitInterval', DEFAULT_AUTO_COMMIT_INTERVAL);
  }

  getSyncMode(): SyncMode | undefined {
    const config = vscode.workspace.getConfiguration('dory-notes');
    return config.get<SyncMode | undefined>('syncMode');
  }

  async setSyncMode(mode: SyncMode): Promise<void> {
    const config = vscode.workspace.getConfiguration('dory-notes');
    await config.update('syncMode', mode, vscode.ConfigurationTarget.Global);
  }
}

