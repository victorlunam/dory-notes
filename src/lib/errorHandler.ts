import * as vscode from 'vscode';

export function getErrorMessage(error: unknown): string {
  if (error instanceof vscode.FileSystemError) {
    switch (error.code) {
      case 'FileNotFound':
        return 'The file no longer exists';
      case 'FileExists':
        return 'A file or folder with that name already exists';
      case 'NoPermissions':
        return 'You do not have permission to perform this operation';
      default:
        return `Failed to perform operation: ${error.message}`;
    }
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unknown error occurred';
}

export function showErrorMessage(message: string): void {
  vscode.window.showErrorMessage(message);
}

export function showWarningMessage(message: string): void {
  vscode.window.showWarningMessage(message);
}

export function showInformationMessage(message: string): void {
  vscode.window.showInformationMessage(message);
}

