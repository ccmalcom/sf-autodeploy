
const vscode = require('vscode');


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	console.log('Congratulations, your extension "sf-autodeploy" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('sf-autodeploy.selectFiles', function () {
		vscode.window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: true,
			canSelectMany: true,
			openLabel: 'Select Files or Folders to Watch'
		}).then(selectedItems => {
			if (selectedItems) {
				selectedItems.forEach(item => {
					// Watch for changes in selected files/folders
					const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(item.fsPath, '**/*'));

					watcher.onDidChange(uri => {
						deployFile(uri.fsPath);
					});

					context.subscriptions.push(watcher);
				});
			}
		});
	});

	context.subscriptions.push(disposable);
}

/**
 * This function handles the deployment process using the SFDX CLI.
 * @param {string} filePath - The path of the file that was modified.
 */
function deployFile(filePath) {
	vscode.window.showInformationMessage(`Deploying ${filePath}...`);

	const terminal = vscode.window.createTerminal(`Deploy ${filePath}`);
	terminal.sendText(`sfdx force:source:deploy -p ${filePath}`);
	terminal.show();
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
}
