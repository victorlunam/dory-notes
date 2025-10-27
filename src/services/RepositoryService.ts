import fs from 'node:fs';
import { exec } from '../lib/exec';
import type { Octokit } from '@octokit/rest';
import { REPOSITORY_NAME, REPOSITORY_DESCRIPTION } from '../constants';
import { GitService } from './GitService';

export class RepositoryService {
  constructor(
    private octokit: Octokit,
    private accessToken: string | null = null,
  ) {}

  private buildAuthenticatedCloneUrl(url: string): string {
    if (!this.accessToken)
      {return url;}

    if (url.startsWith('https://')) {
      return url.replace(
        'https://',
        `https://${this.accessToken}@`,
      );
    }
    return url;
  }

  async setupRepository(rootPath: string): Promise<{ success: boolean; message: string }> {
    const isCloned = fs.existsSync(rootPath);

    if (isCloned) {
      return { success: true, message: 'Repository already exists' };
    }

    try {
      const userInfo = await this.octokit.users.getAuthenticated();
      
      const existingRepo = await this.getRepository(userInfo.data.login);
      
      if (existingRepo) {
        const cloneUrl = this.buildAuthenticatedCloneUrl(existingRepo.clone_url);
        await exec(`git clone ${cloneUrl} ${rootPath}`);
        return {
          success: true,
          message: `Welcome ${userInfo.data.name} to dory notes`,
        };
      }

      const newRepo = await this.createRepository();
      const cloneUrl = this.buildAuthenticatedCloneUrl(newRepo.clone_url);
      await exec(`git clone ${cloneUrl} ${rootPath}`);
      
      return {
        success: true,
        message: `Welcome ${userInfo.data.name} to dory notes`,
      };
    }
    catch (error) {
      return {
        success: false,
        message: `Error while trying to setup repository: ${error}`,
      };
    }
  }

  async checkRemoteRepositoryExists(): Promise<{ clone_url: string } | null> {
    try {
      const userInfo = await this.octokit.users.getAuthenticated();
      return await this.getRepository(userInfo.data.login);
    }
    catch {
      return null;
    }
  }

  async handleRepositoryState(rootPath: string, hasLocal: boolean, hasRemote: { clone_url: string } | null): Promise<{ success: boolean; message: string }> {
    try {
      const userInfo = await this.octokit.users.getAuthenticated();
      const isGitRepo = hasLocal && fs.existsSync(`${rootPath}/.git`);

      if (isGitRepo && hasRemote) {
        const gitService = new GitService(rootPath);
        const result = await gitService.pull();
        return {
          success: result.success,
          message: result.success ? 'Repository synced successfully' : `Failed to sync: ${result.error}`,
        };
      }

      if (hasRemote) {
        if (hasLocal && !isGitRepo) {
          await fs.promises.rm(rootPath, { recursive: true, force: true });
        }
        const cloneUrl = this.buildAuthenticatedCloneUrl(hasRemote.clone_url);
        await exec(`git clone ${cloneUrl} ${rootPath}`);
        return {
          success: true,
          message: `Welcome ${userInfo.data.name} to dory notes`,
        };
      }

      if (hasLocal && !hasRemote) {
        const newRepo = await this.createRepository();
        const gitService = new GitService(rootPath);
        
        if (!fs.existsSync(`${rootPath}/.git`)) {
          await gitService.initializeLocalRepo();
          
          await exec('git branch -M main', { cwd: rootPath });
          await fs.promises.writeFile(`${rootPath}/README.md`, '# Dory Notes\n\nYour minimalist versioned notes.\n', 'utf8');
          await exec('git add README.md', { cwd: rootPath });
          await exec('git commit -m "Initial commit"', { cwd: rootPath });
        }
        
        if (await gitService.hasRemote()) {
          await exec('git remote remove origin', { cwd: rootPath });
        }
        
        const remoteUrl = this.buildAuthenticatedCloneUrl(newRepo.clone_url);
        await gitService.addRemote(remoteUrl);
        const pushResult = await gitService.push();
        
        return {
          success: pushResult.success,
          message: pushResult.success ? 'Repository created and synced' : `Created repository but push failed: ${pushResult.error}`,
        };
      }

      const newRepo = await this.createRepository();
      const cloneUrl = this.buildAuthenticatedCloneUrl(newRepo.clone_url);
      await exec(`git clone ${cloneUrl} ${rootPath}`);
      
      return {
        success: true,
        message: `Welcome ${userInfo.data.name} to dory notes`,
      };
    }
    catch (error) {
      return {
        success: false,
        message: `Error while trying to setup repository: ${error}`,
      };
    }
  }

  async getUserInfo(): Promise<{ name: string; login: string }> {
    const userInfo = await this.octokit.users.getAuthenticated();
    return {
      name: userInfo.data.name || userInfo.data.login,
      login: userInfo.data.login,
    };
  }

  private async getRepository(owner: string): Promise<{ clone_url: string } | null> {
    try {
      const repo = await this.octokit.repos.get({ owner, repo: REPOSITORY_NAME });
      if (repo.status === 200)
        {return repo.data as { clone_url: string };}
      
      return null;
    }
    catch {
      return null;
    }
  }

  private async createRepository(): Promise<{ clone_url: string }> {
    const repo = await this.octokit.repos.createForAuthenticatedUser({
      name: REPOSITORY_NAME,
      description: REPOSITORY_DESCRIPTION,
      private: true,
      auto_init: true,
    });

    return repo.data;
  }
}

