const vscode = require('vscode');

class StatusBarItem {
	constructor() {
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		this.statusBarItem.text = 'AutoDeploy: Not Watching';
		this.statusBarItem.command = 'sf-autodeploy.startWatching';
		this.statusBarItem.tooltip = 'Click to select files to watch';
		this.statusBarItem.show();
	}

	watching(numItems) {
		this.statusBarItem.text = `AutoDeploy: Watching ${numItems} item(s)`;
		this.statusBarItem.command = 'sf-autodeploy.stopWatching';
		this.statusBarItem.tooltip = 'Click to stop watching files';
	}

	deployed() {
		this.statusBarItem.text = 'AutoDeploy: File Changed - Deployed';
		this.statusBarItem.command = 'sf-autodeploy.stopWatching';
	}


	deployError() {
		this.statusBarItem.text = 'AutoDeploy: Error Deploying';
		this.statusBarItem.command = 'sf-autodeploy.stopWatching';
	}

	stopped() {
		this.statusBarItem.text = 'AutoDeploy: Not Watching';
		this.statusBarItem.command = 'sf-autodeploy.startWatching';
		this.statusBarItem.tooltip = 'Click to select files to watch';
	}

	dispose() {
		this.statusBarItem.dispose();
	}
}

let watchers, statusBarItem;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	const defaultUri = vscode.workspace.workspaceFolders
		? vscode.workspace.workspaceFolders[0].uri.with({ path: vscode.workspace.workspaceFolders[0].uri.path + '/force-app/main/default' })
		: vscode.Uri.file(require('os').homedir());

	statusBarItem = new StatusBarItem();
	context.subscriptions.push(statusBarItem);

	watchers = [];

	const cmdStartWatching = vscode.commands.registerCommand('sf-autodeploy.startWatching', function () {
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
					vscode.window.showInformationMessage(`Watching ${selectedItems.length} item(s) for changes...`);
					statusBarItem.watching(selectedItems.length);
					selectedItems.forEach(item => {
						const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(item.fsPath, '**/*'));
						watcher.onDidChange(uri => {
							statusBarItem.text = 'AutoDeploy: File Changed - Deploying...';
							statusBarItem.command = '';
							deployFile(uri.fsPath)
								.then(() => {
									vscode.window.showInformationMessage(`Successfully Deployed ${uri.fsPath}`);
									statusBarItem.deployed();
									setTimeout(() => {
										statusBarItem.watching(selectedItems.length);
									}, 3000);
								})
								.catch(err => {
									vscode.window.showErrorMessage(`Error deploying ${uri.fsPath}: ${err.message}`);
									statusBarItem.deployError();
									setTimeout(() => {
										statusBarItem.watching(selectedItems.length);
									}, 3000);
								});
						});
						watchers.push(watcher);
						context.subscriptions.push(watcher);
					});
				}
			}
		});
	});
	context.subscriptions.push(cmdStartWatching);

	const cmdStopWatching = vscode.commands.registerCommand('sf-autodeploy.stopWatching', function () {
		if (watchers.length > 0) {
			watchers.forEach(watcher => watcher.dispose());
			watchers = [];
			vscode.window.showInformationMessage('Stopped watching files.');
			statusBarItem.stopped();
		} else {
			vscode.window.showInformationMessage('No active watchers to stop.');
		}
	});
	context.subscriptions.push(cmdStopWatching);
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

function deactivate() {
	if (watchers.length > 0) {
		watchers.forEach(watcher => watcher.dispose());
		watchers = [];

		if (statusBarItem) {
			statusBarItem.dispose();
		}
	}
}

module.exports = {
	activate,
	deactivate
}

