import path from 'node:path'
import fs from 'node:fs'
import * as vscode from 'vscode'
import * as utils from '../lib/utils'

export class FileStat implements vscode.FileStat {
  constructor(private fsStat: fs.Stats) {}

  get type(): vscode.FileType {
    return this.fsStat.isFile()
      ? vscode.FileType.File
      : this.fsStat.isDirectory()
        ? vscode.FileType.Directory
        : this.fsStat.isSymbolicLink()
          ? vscode.FileType.SymbolicLink
          : vscode.FileType.Unknown
  }

  get isFile(): boolean | undefined {
    return this.fsStat.isFile()
  }

  get isDirectory(): boolean | undefined {
    return this.fsStat.isDirectory()
  }

  get isSymbolicLink(): boolean | undefined {
    return this.fsStat.isSymbolicLink()
  }

  get size(): number {
    return this.fsStat.size
  }

  get ctime(): number {
    return this.fsStat.ctime.getTime()
  }

  get mtime(): number {
    return this.fsStat.mtime.getTime()
  }
}

export interface FileEntry {
  uri: vscode.Uri
  type: vscode.FileType
}

export class FileSystemProvider implements vscode.FileSystemProvider {
  private _onDidChangeFile: vscode.EventEmitter<vscode.FileChangeEvent[]>

  constructor() {
    this._onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>()
  }

  get onDidChangeFile(): vscode.Event<vscode.FileChangeEvent[]> {
    return this._onDidChangeFile.event
  }

  watch(
    uri: vscode.Uri,
    options: { recursive: boolean; excludes: string[] },
  ): vscode.Disposable {
    const watcher = fs.watch(
      uri.fsPath,
      { recursive: options.recursive },
      async (event, filename) => {
        if (filename) {
          const filepath = path.join(
            uri.fsPath,
            utils.normalizeNFC(filename.toString()),
          )

          this._onDidChangeFile.fire([
            {
              type:
                event === 'change'
                  ? vscode.FileChangeType.Changed
                  : (await utils.exists(filepath))
                    ? vscode.FileChangeType.Created
                    : vscode.FileChangeType.Deleted,
              uri: uri.with({ path: filepath }),
            } as vscode.FileChangeEvent,
          ])
        }
      },
    )

    return { dispose: () => watcher.close() }
  }

  stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
    return this._stat(uri.fsPath)
  }

  async _stat(path: string): Promise<vscode.FileStat> {
    return new FileStat(await utils.stat(path))
  }

  readDirectory(
    uri: vscode.Uri,
  ): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
    return this._readDirectory(uri)
  }

  async _readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    const children = await utils.readdir(uri.fsPath)

    const result: [string, vscode.FileType][] = []
    for (let i = 0; i < children.length; i++) {
      if (children[i] === '.git')
        continue

      const child = children[i]
      const stat = await this._stat(path.join(uri.fsPath, child))
      result.push([child, stat.type])
    }

    return Promise.resolve(result)
  }

  createDirectory(uri: vscode.Uri): void | Thenable<void> {
    return utils.mkdir(uri.fsPath)
  }

  readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
    return utils.readfile(uri.fsPath)
  }

  writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean },
  ): void | Thenable<void> {
    return this._writeFile(uri, content, options)
  }

  async _writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean },
  ): Promise<void> {
    const exists = await utils.exists(uri.fsPath)
    if (!exists) {
      if (!options.create)
        throw vscode.FileSystemError.FileNotFound()

      await utils.mkdir(path.dirname(uri.fsPath))
    }
    else {
      if (!options.overwrite)
        throw vscode.FileSystemError.FileExists()
    }

    return utils.writefile(uri.fsPath, content as Buffer)
  }

  delete(
    uri: vscode.Uri,
    options: { recursive: boolean },
  ): void | Thenable<void> {
    if (options.recursive)
      return utils.rmrf(uri.fsPath)

    return utils.unlink(uri.fsPath)
  }

  rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { overwrite: boolean },
  ): void | Thenable<void> {
    return this._rename(oldUri, newUri, options)
  }

  async _rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { overwrite: boolean },
  ): Promise<void> {
    const exists = await utils.exists(newUri.fsPath)
    if (exists) {
      if (!options.overwrite)
        throw vscode.FileSystemError.FileExists()
      else
        await utils.rmrf(newUri.fsPath)
    }

    const parentExists = await utils.exists(path.dirname(newUri.fsPath))
    if (!parentExists)
      await utils.mkdir(path.dirname(newUri.fsPath))

    return utils.rename(oldUri.fsPath, newUri.fsPath)
  }
} 