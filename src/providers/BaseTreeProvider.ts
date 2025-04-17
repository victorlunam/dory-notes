import * as vscode from 'vscode'
import { FileEntry, FileSystemProvider } from './FileSystemProvider'

export abstract class BaseTreeProvider implements vscode.TreeDataProvider<FileEntry> {
  protected _onDidChangeTreeData: vscode.EventEmitter<FileEntry | undefined | void>
    = new vscode.EventEmitter<FileEntry | undefined | void>()

  readonly onDidChangeTreeData: vscode.Event<FileEntry | undefined | void>
    = this._onDidChangeTreeData.event

  constructor(protected fileSystemProvider: FileSystemProvider) {}

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  abstract getChildren(element?: FileEntry): Thenable<FileEntry[]>

  getTreeItem(element: FileEntry): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(
      element.uri,
      element.type === vscode.FileType.Directory
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    )

    if (element.type === vscode.FileType.File) {
      treeItem.command = this.getFileCommand(element)
      treeItem.contextValue = 'file'
    }
    else if (element.type === vscode.FileType.Directory) {
      treeItem.contextValue = 'directory'
    }

    return treeItem
  }

  protected abstract getFileCommand(element: FileEntry): vscode.Command
} 