import fs from 'node:fs';
import { exec } from '../lib/exec';
import { GitServiceResult } from '../types';

export class GitService {
  private readonly rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  async clone(cloneUrl: string, targetPath: string): Promise<GitServiceResult> {
    try {
      await exec(`git clone ${cloneUrl} ${targetPath}`);
      return { success: true, message: 'Repository cloned successfully' };
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async hasChanges(): Promise<boolean> {
    try {
      const result = await exec('git status --porcelain', { cwd: this.rootPath });
      return result.stdout.trim().length > 0;
    }
    catch {
      return false;
    }
  }

  async addAndCommit(message: string): Promise<GitServiceResult> {
    try {
      await exec('git add -A', { cwd: this.rootPath });
      await exec(`git commit -m "${message}"`, { cwd: this.rootPath });
      return { success: true, message };
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async push(): Promise<GitServiceResult> {
    try {
      await exec('git push origin main', { cwd: this.rootPath });
      return { success: true };
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async repositoryExists(): Promise<boolean> {
    try {
      return fs.existsSync(this.rootPath);
    }
    catch {
      return false;
    }
  }

  async pull(): Promise<GitServiceResult> {
    try {
      await exec('git pull origin main', { cwd: this.rootPath });
      return { success: true, message: 'Repository synced successfully' };
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async hasRemote(): Promise<boolean> {
    try {
      const result = await exec('git remote get-url origin', { cwd: this.rootPath });
      return result.stdout.trim().length > 0;
    }
    catch {
      return false;
    }
  }

  async addRemote(url: string): Promise<GitServiceResult> {
    try {
      await exec(`git remote add origin ${url}`, { cwd: this.rootPath });
      return { success: true, message: 'Remote added successfully' };
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async initializeLocalRepo(): Promise<GitServiceResult> {
    try {
      if (!fs.existsSync(this.rootPath)) {
        await exec(`mkdir -p ${this.rootPath}`);
      }
      await exec('git init', { cwd: this.rootPath });
      return { success: true, message: 'Local repository initialized' };
    }
    catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async performAutoCommit(): Promise<void> {
    const hasChanges = await this.hasChanges();
    if (!hasChanges)
      {return;}

    const timestamp = this.getCurrentTimestamp();
    const message = `Auto-commit: ${timestamp}`;

    const commitResult = await this.addAndCommit(message);
    if (!commitResult.success) {
      console.error('Auto-commit failed:', commitResult.error);
      return;
    }

    const pushResult = await this.push();
    if (!pushResult.success) {
      console.error('Auto-push failed:', pushResult.error);
      return;
    }

    console.log(`Auto-commit successful: ${message}`);
  }

  private getCurrentTimestamp(): string {
    return new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }
}

