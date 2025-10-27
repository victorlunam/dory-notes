import * as vscode from 'vscode';
import type { Octokit } from '@octokit/rest';
import { GITHUB_AUTH_PROVIDER_ID, SCOPES } from './constants';

export class Auth {
  private octokit: Octokit | undefined;

  async initialize(context: vscode.ExtensionContext): Promise<void> {
    this.registerListeners(context);
    await this.setOctokit();
  }

  private async setOctokit() {
    const session = await vscode.authentication.getSession(
      GITHUB_AUTH_PROVIDER_ID,
      SCOPES,
      { createIfNone: false },
    );

    if (session) {
      const { Octokit } = await import('@octokit/rest');
      this.octokit = new Octokit({
        auth: session.accessToken,
      });

      return;
    }

    this.octokit = undefined;
  }

  registerListeners(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      vscode.authentication.onDidChangeSessions(async (e) => {
        if (e.provider.id === GITHUB_AUTH_PROVIDER_ID)
          {await this.setOctokit();}
      }),
    );
  }

  async getOctokit(): Promise<Octokit | null> {
    if (this.octokit)
      {return this.octokit;}

    const session = await vscode.authentication.getSession(
      GITHUB_AUTH_PROVIDER_ID,
      SCOPES,
      { createIfNone: true },
    );

    if (!session) {
      return null;
    }

    const { Octokit } = await import('@octokit/rest');
    this.octokit = new Octokit({
      auth: session.accessToken,
    });

    return this.octokit;
  }

  async getAccessToken(): Promise<string | null> {
    const session = await vscode.authentication.getSession(
      GITHUB_AUTH_PROVIDER_ID,
      SCOPES,
      { createIfNone: false },
    );

    return session ? session.accessToken : null;
  }
}
