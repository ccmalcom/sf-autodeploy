
const vscode = require('vscode');


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	const defaultUri = vscode.workspace.workspaceFolders
		? vscode.workspace.workspaceFolders[0].uri.with({ path: vscode.workspace.workspaceFolders[0].uri.path + '/force-app/main/default' })
		: vscode.Uri.file(require('os').homedir());  // Fallback to home directory if no workspace is open

	// Status bar item to show AutoDeploy status
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	statusBarItem.text = 'AutoDeploy: Not Watching';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	let watchers = []; // Array to store active file watchers

	// Command to select files and set up watchers
	const disposable = vscode.commands.registerCommand('sf-autodeploy.startWatching', function () {
		vscode.window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: true,
			canSelectMany: true,
			defaultUri: defaultUri,
			openLabel: 'Select Files or Folders to Watch',
			filters: {
				'All Salesforce Files': ['js', 'html', 'css', 'cls', 'cmp', 'xml', 'svg', 'json'],
				'JavaScript Files': ['js'],
				'HTML Files': ['html'],
				'Apex Classes': ['cls'],
				'Components': ['cmp', 'xml']
			}
		}).then(selectedItems => {
			if (selectedItems) {
				const invalidSelections = selectedItems.filter(item => !item.fsPath.includes('force-app/main/default'));

				if (invalidSelections.length > 0) {
					vscode.window.showWarningMessage('Please select only files from within the force-app/main/default directory.');
				} else {
					vscode.window.showInformationMessage('Files selected successfully.');
					statusBarItem.text = `AutoDeploy: Watching ${selectedItems.length} item(s)`;

					selectedItems.forEach(item => {
						const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(item.fsPath, '**/*'));

						watcher.onDidChange(uri => {
							deployFile(uri.fsPath);
						});

						watchers.push(watcher); // Store watcher
						context.subscriptions.push(watcher);
					});
				}
			}
		});
	});
	context.subscriptions.push(disposable);

	// Command to stop watching files
	const disposable2 = vscode.commands.registerCommand('sf-autodeploy.stopWatching', function () {
		if (watchers.length > 0) {
			watchers.forEach(watcher => watcher.dispose()); // Dispose all watchers
			watchers = []; // Clear the watchers array
			vscode.window.showInformationMessage('Stopped watching files.');
			statusBarItem.text = 'AutoDeploy: Not Watching';
		} else {
			vscode.window.showInformationMessage('No active watchers to stop.');
		}
	});
	context.subscriptions.push(disposable2);
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
