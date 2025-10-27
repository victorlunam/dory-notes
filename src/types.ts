import * as vscode from 'vscode';

export interface FileResource {
  uri?: vscode.Uri
}

export interface CommandArguments {
  resource?: FileResource
  folder?: FileResource
}

export interface GitServiceResult {
  success: boolean
  message?: string
  error?: string
}

