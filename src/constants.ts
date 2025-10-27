import os from 'node:os';
import path from 'node:path';

export const GITHUB_AUTH_PROVIDER_ID = 'github';
export const SCOPES = ['user:email', 'repo'];

export const REPOSITORY_NAME = 'personal-dory-notes';
export const REPOSITORY_DESCRIPTION = 'A minimalist and versioned notes application for programmers, inspired by Dory from Finding Nemo';

export const DORY_NOTES_ROOT_PATH = path.join(os.homedir(), '.dory-notes');
export const SECRET_ROOT_PATH_KEY = 'dory-notes.rootPath';

export const DEFAULT_AUTO_COMMIT_INTERVAL = 28800000;
export const SYNC_MODE_CONFIG_KEY = 'dory-notes.syncMode';

