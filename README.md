# Dory Notes - VS Code Extension

A minimalist and versioned notes application for programmers, inspired by Dory, the forgetful fish from Finding Nemo.

## Features

- **Versioned Notes**: All your notes are automatically versioned using Git and stored in a private GitHub repository.
- **Sidebar Tree View**: Organize your notes with folders and files in the sidebar.
- **Auto-commit**: Changes are automatically committed and pushed (configurable interval, default: 8 hours).
- **Full CRUD Operations**: Create, rename, delete notes and folders with ease.
- **GitHub Integration**: Seamlessly sync your notes across devices through GitHub.
- **Minimalist Interface**: Simple and focused note-taking experience within VS Code.

## Installation

### From VS Code Marketplace
1. Launch VS Code.
2. Go to the Extensions view by clicking on the square icon on the left sidebar or by pressing `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac).
3. Search for "Dory Notes" in the Extensions view search bar.
4. Click on the "Install" button next to the "Dory Notes" extension.
5. Once installed, click on the "Reload" button to activate the extension.

### From Source
1. Clone the repository:
```bash
git clone https://github.com/victorlunam/dory-notes.git
cd dory-notes
```
2. Install dependencies:
```bash
npm install
```
3. Build the extension:
```bash
npm run build
```
4. Press `F5` in VS Code to open a new window with the extension loaded.

## Usage

### First Time Setup
1. Login to GitHub by running the command: `Dory: Login` (or `Cmd/Ctrl+Shift+P` and search "Dory: Login")
2. Authorize the extension to access GitHub
3. The extension will create a private `personal-dory-notes` repository on your GitHub account
4. Your notes will be cloned to `~/.dory-notes`

### Managing Notes
- **Create a new note**: Click the "+" button in the sidebar or run `Dory: New Note`
- **Create a folder**: Click the folder icon or run `Dory: New Folder`
- **Open a note**: Click on any note in the sidebar
- **Rename**: Right-click on a file/folder and select "Rename" or press `F2`
- **Delete**: Right-click on a file/folder and select "Delete"
- **Refresh**: Click the refresh icon in the sidebar

### Configuration
- **Auto-commit interval**: Configure in VS Code settings under `dory-notes.autoCommitInterval` (default: 8 hours)

## Development

### Prerequisites
- Node.js 18.x or higher
- Git
- VS Code 1.85.0 or higher

### Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Open in VS Code and press `F5` to run the extension
4. Build for production: `npm run build:extension`

### Project Structure
```
src/
├── extension.ts          # Main extension entry point
├── auth.ts               # GitHub authentication
├── noteExplorer.ts       # Core note management
├── providers/            # Tree and file system providers
└── lib/                  # Utilities and helpers
```

## Contributing

Contributions are welcome! If you have any ideas, suggestions, or bug reports, please open an issue or submit a pull request on the [GitHub repository](https://github.com/victorlunam/dory-notes).

## License

This extension is licensed under the [MIT License](./LICENSE).

## Acknowledgements

- This extension was inspired by Dory, the forgetful fish from Finding Nemo.
- Special thanks to the VS Code team for providing a great extension development platform.
- Built with [Octokit](https://github.com/octokit/octokit.js) for GitHub integration.

## Sponsor

If you find this extension useful, consider sponsoring the project on [GitHub Sponsors](https://github.com/sponsors/victorlunam).
