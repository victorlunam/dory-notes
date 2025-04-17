import path from 'node:path'
import os from 'node:os'
import * as vscode from 'vscode'
import { BaseTreeProvider } from './BaseTreeProvider'
import { FileEntry, FileSystemProvider } from './FileSystemProvider'

export class NotesTreeProvider extends BaseTreeProvider {
  private _onDidCollapseElement: vscode.EventEmitter<FileEntry> = new vscode.EventEmitter<FileEntry>()
  readonly onDidCollapseElement: vscode.Event<FileEntry> = this._onDidCollapseElement.event

  constructor(fileSystemProvider: FileSystemProvider) {
    super(fileSystemProvider)
  }

  async getChildren(element?: FileEntry): Promise<FileEntry[]> {
    if (element) {
      const children = await this.fileSystemProvider.readDirectory(element.uri)
      return children.map(([name, type]) => ({
        uri: vscode.Uri.file(path.join(element.uri.fsPath, name)),
        type,
      }))
    }

    const rootUri = vscode.Uri.file(`${os.homedir()}/.dory-notes`)
    const children = await this.fileSystemProvider.readDirectory(rootUri)

    children.sort((a, b) => {
      if (a[1] === b[1])
        return a[0].localeCompare(b[0])

      return a[1] === vscode.FileType.Directory ? -1 : 1
    })

    return children.map(([name, type]) => ({
      uri: vscode.Uri.file(path.join(rootUri.fsPath, name)),
      type,
    }))
  }

  getTreeItem(element: FileEntry): vscode.TreeItem {
    const basename = path.basename(element.uri.fsPath)
    const treeItem = new vscode.TreeItem(
      basename,
      element.type === vscode.FileType.Directory
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    )

    // Set the resource URI for all items
    treeItem.resourceUri = element.uri

    if (element.type === vscode.FileType.File) {
      treeItem.command = {
        command: 'dory-notes.openNote',
        title: 'Open Note',
        arguments: [element.uri],
      }
      treeItem.contextValue = 'file'
    }
    else if (element.type === vscode.FileType.Directory) {
      treeItem.contextValue = 'directory'
    }

    return treeItem
  }

  protected getFileCommand(element: FileEntry): vscode.Command {
    return {
      command: 'dory-notes.openNote',
      title: 'Open Note',
      arguments: [element.uri],
    }
  }

  async revealAndExpand(uri: vscode.Uri): Promise<void> {
    const element = await this.findElement(uri)
    if (element) {
      await vscode.commands.executeCommand('revealInExplorer', element.uri)
      this._onDidChangeTreeData.fire(element)
    }
  }

  private async findElement(uri: vscode.Uri): Promise<FileEntry | undefined> {
    const rootElements = await this.getChildren()
    for (const element of rootElements) {
      if (element.uri.fsPath === uri.fsPath) {
        return element
      }
      if (element.type === vscode.FileType.Directory) {
        const children = await this.getChildren(element)
        for (const child of children) {
          if (child.uri.fsPath === uri.fsPath) {
            return element // Return the parent directory
          }
        }
      }
    }
    return undefined
  }
} 