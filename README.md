# SF AutoDeploy README

**SF AutoDeploy** is a Visual Studio Code extension designed for Salesforce developers to automatically deploy changes to Salesforce using the **SFDX CLI** whenever files are saved. It's perfect for those quick development cycles when you need to see changes quickly, such as when making tweaks to a Lightning Web Component (LWC). This extension automates the process, saving time and ensuring efficiency during the development process.

⚠️ **Note**: SF AutoDeploy is intended for quick development cycles and is not recommended for use in production environments. Please be careful, as it automatically deploys code upon saving the watched files, which could lead to accidental production deployments.

## Features

- **AutoDeploy on Save**: Automatically deploy selected Salesforce components (LWC, Apex classes, etc.) when changes are detected.
- **File/Folder Selection**: Choose specific files or folders within the `force-app/main/default` directory to watch.
- **Stop Watching Files**: Easily stop watching files with a single command or by clicking the status bar item.
- **Visual Feedback**: A status bar item keeps you informed about the current state (watching files, deployment in progress, errors, etc.).

## Demo

Coming Soon

## Requirements

- **Salesforce CLI (SFDX CLI)** must be installed and available in your system's `PATH`. You can download the Salesforce CLI from [here](https://developer.salesforce.com/tools/sfdxcli).

## How to Use

0.1 **Ensure the SFDX CLI** is installed on your system.

1. **Install SF AutoDeploy** from the Visual Studio Marketplace or load it into your workspace.
2. **Activate the extension**: On activation, status bar item will appear in status bar.
3. **Select files or folders**:
   - Click on the status bar or use the VS Code command palette (`Cmd + Shift + P` or `Ctrl + Shift + P`) and search for `SF AutoDeploy: Start Watching`.
   - A dialogue menu will open to the directory of your workspace. Choose the files or folders from the `force-app/main/default` directory that you want to watch.
   - _NOTE_: watching a high level directory, such as 'lwc', could result in accidental deployments. It is recommended to select only files you are actively working on.
4. **Auto-deployment**: Once files are being watched, any saved changes will trigger an automatic deployment to Salesforce via the SFDX CLI.
5. **Stop watching**: Click on the status bar or use the command `SF AutoDeploy: Stop Watching` to stop watching files.

## Extension Commands

This extension contributes the following commands:

- `sf-autodeploy.startWatching`: Start watching selected files/folders for changes and auto-deploy them.
- `sf-autodeploy.stopWatching`: Stop watching files.

## Known Issues

- **Accidental Production Deployments**: This extension is not intended for use in production environments due to the risk of automatic deployments. Please ensure you are connected to a sandbox or development environment while using SF AutoDeploy.
- **File Path Restrictions**: Only files located within `force-app/main/default` are eligible to be watched and deployed.

## Extension Settings

Currently, SF AutoDeploy does not contribute any custom settings. Future updates may include configuration options like deployment target environments or ignoring certain files.

## Release Notes

### 1.0.0

- Initial release of SF AutoDeploy.
- Added auto-deploy functionality for Salesforce components upon file changes.
- Status bar integration for easy control.

---

## For more information

- [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
- [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)
- [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli)

---

### Enjoy using SF AutoDeploy!
