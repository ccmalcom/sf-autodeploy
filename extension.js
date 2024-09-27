
const vscode = require('vscode');


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	const defaultUri = vscode.workspace.workspaceFolders
		? vscode.workspace.workspaceFolders[0].uri.with({ path: vscode.workspace.workspaceFolders[0].uri.path + '/force-app/main/default' })
		: vscode.Uri.file(require('os').homedir());  // Fallback to home directory if no workspace is open


	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('sf-autodeploy.selectFiles', function () {
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
				// Check if all selected files are within the force-app/main/default directory
				const invalidSelections = selectedItems.filter(item => !item.fsPath.includes('force-app/main/default'));

				if (invalidSelections.length > 0) {
					// If any files are outside the allowed directory, show a warning message
					vscode.window.showWarningMessage('Please select only files from within the force-app/main/default directory.');
				} else {
					// Store the valid selected paths to watch
					vscode.window.showInformationMessage('Files selected successfully.');
				}
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
