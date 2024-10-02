const vscode = require('vscode');
const { exec } = require('child_process');
class StatusBarItem {
	constructor() {
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		this.statusBarItem.text = 'AutoDeploy: No Files Selected';
		this.statusBarItem.command = 'sf-autodeploy.manageFiles';
		this.statusBarItem.tooltip = 'Click to select files';
		this.statusBarItem.show();
	}

	updateStatus(selectedFilePaths) {
		if (selectedFilePaths.length > 0) {
			this.statusBarItem.text = `AutoDeploy: ${selectedFilePaths.length} Item Selected`;
			this.statusBarItem.tooltip = 'Click to change selected files or reset';
		} else {
			this.statusBarItem.text = 'AutoDeploy: No Files Selected';
			this.statusBarItem.tooltip = 'Click to select files to watch';
		}
	}

	showQuickPickMenu(selectedFilePaths) {
		let options;

		if (selectedFilePaths.length > 0) {
			// Show options when files are selected
			options = [
				{ label: 'Change Selected Files', description: 'Change the currently selected files' },
				{ label: 'Reset Extension', description: 'Reset the extension configuration' }
			];
		} else {
			// Show option when no files are selected
			options = [{ label: 'Select Files to Watch', description: 'Select new files to watch' }];
		}

		vscode.window.showQuickPick(options).then(selectedOption => {
			if (!selectedOption) return;

			if (selectedOption.label === 'Select Files to Watch' || selectedOption.label === 'Change Selected Files') {
				vscode.commands.executeCommand('sf-autodeploy.selectItems');
			} else if (selectedOption.label === 'Reset Extension') {
				vscode.commands.executeCommand('sf-autodeploy.reset');
			}
		});
	}

	dispose() {
		this.statusBarItem.dispose();
	}
}

class WatchStatusBarItem {
	constructor() {
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
		this.updateStatus();  // Start with the "not watching" state
		this.statusBarItem.show();
	}

	// Update the icon and tooltip based on the watching state
	updateStatus(status) {
		console.log('updateStatus invoked');
		if (status === 'watching') {
			this.statusBarItem.text = '$(eye)';
			this.statusBarItem.command = 'sf-autodeploy.stopWatching';
			this.statusBarItem.tooltip = 'Click to stop watching';
			this.statusBarItem.color = undefined;  // Default color (active)
		} else if (status === 'activate') {
			this.statusBarItem.text = '$(eye-closed)';
			this.statusBarItem.command = 'sf-autodeploy.startWatching'
			this.statusBarItem.tooltip = 'Click to start watching files';
			this.statusBarItem.color = undefined;  // Default color (active)
		} else {
			this.statusBarItem.text = '$(eye-closed)';
			this.statusBarItem.command = undefined;
			this.statusBarItem.tooltip = 'No files selected.';
			this.statusBarItem.color = '#888888';  // Grey out if no files
		}
	}

	dispose() {
		this.statusBarItem.dispose();
	}
}


let watchers = [];
let statusBarItem, watchStatusBarItem;
let selectedFilePaths = [];

function checkSFDXCLI() {
	exec('sfdx --version', (error) => {
		if (error) {
			vscode.window.showErrorMessage('SF AutoDeploy not actiavted - SFDX CLI is not installed. Please install it from https://developer.salesforce.com/tools/sfdxcli.');
			return;
		}
	});
}
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	checkSFDXCLI();
	statusBarItem = new StatusBarItem();
	watchStatusBarItem = new WatchStatusBarItem();
	context.subscriptions.push(statusBarItem, watchStatusBarItem);

	const manageFilesCommand = vscode.commands.registerCommand('sf-autodeploy.manageFiles', () => {
		statusBarItem.showQuickPickMenu(selectedFilePaths);
	});
	context.subscriptions.push(manageFilesCommand);

	const defaultUri = vscode.workspace.workspaceFolders
		? vscode.workspace.workspaceFolders[0].uri.with({ path: vscode.workspace.workspaceFolders[0].uri.path + '/force-app/main/default' })
		: vscode.Uri.file(require('os').homedir());


	watchers = [];
	const cmdSelectItems = vscode.commands.registerCommand('sf-autodeploy.selectItems', function () {
		vscode.window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: true,
			canSelectMany: true,
			defaultUri: defaultUri,
			openLabel: 'Select Files or Folders to Watch',
			filters: {
				'All Salesforce Files': ['js', 'html', 'cls', 'cmp', 'xml', 'svg', 'json']
			}
		}).then(selectedItems => {
			if (selectedItems) {
				const invalidSelections = selectedItems.filter(item => !item.fsPath.includes('force-app/main/default'));
				if (invalidSelections.length > 0) {
					vscode.window.showWarningMessage('Please select only files from within the force-app/main/default directory.');
				} else {
					selectedFilePaths = selectedItems.map(item => item.fsPath);
					vscode.window.showInformationMessage(`Saved ${selectedFilePaths.length} items.`);
					statusBarItem.updateStatus(selectedFilePaths);
					watchStatusBarItem.updateStatus('activate');
				}
			}
		});
	});
	context.subscriptions.push(cmdSelectItems);

	const cmdStartWatching = vscode.commands.registerCommand('sf-autodeploy.startWatching', function () {
		const filePaths = selectedFilePaths;
		if (filePaths.length > 0) {
			watchFiles(filePaths);
			vscode.window.showInformationMessage(`Watching ${filePaths.length} file(s) for changes.`);
			watchStatusBarItem.updateStatus('watching');
		} else {
			vscode.window.showWarningMessage('No files selected. Invoking Select Items Command.');
			vscode.commands.executeCommand('sf-autodeploy.selectItems');
		}
	});
	context.subscriptions.push(cmdStartWatching);

	const cmdStopWatching = vscode.commands.registerCommand('sf-autodeploy.stopWatching', function () {
		stopWatchingFiles();
		//get config for watched files
		const filePaths = selectedFilePaths;
		vscode.window.showInformationMessage(`Stopped watching files. Configuration unchanged. Configured files: ${filePaths}`);
		watchStatusBarItem.updateStatus('activate');
	});
	context.subscriptions.push(cmdStopWatching);

	const cmdReset = vscode.commands.registerCommand('sf-autodeploy.reset', function () {
		stopWatchingFiles();
		selectedFilePaths = [];
		vscode.window.showInformationMessage('Configuration reset. No files are being watched.');
		statusBarItem.updateStatus(selectedFilePaths);
		watchStatusBarItem.updateStatus();
	});
	context.subscriptions.push(cmdReset);
}

function watchFiles(filePaths) {
	if (filePaths.length === 0) return;

	filePaths.forEach(filePath => {
		const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(filePath, '**/*'));
		watcher.onDidChange(uri => {
			deployFile(uri.fsPath);
		});
		watchers.push(watcher);
	});
}

function stopWatchingFiles() {
	if (watchers.length > 0) {
		watchers.forEach(watcher => watcher.dispose());
		watchers = [];
	}
}

/**
 * This function handles the deployment process using the SFDX CLI.
 * @param {string} filePath - The path of the file that was modified.
 */
function deployFile(filePath) {
	return new Promise((resolve) => {
		const terminal = vscode.window.createTerminal(`Deploy ${filePath}`);
		terminal.sendText(`sfdx force:source:deploy -p ${filePath}`);
		terminal.show();
		resolve();  // You can simulate deployment success or failure here
	});
}

function deactivate() {
	stopWatchingFiles();
	if (statusBarItem) {
		statusBarItem.dispose();
	}
}

module.exports = {
	activate,
	deactivate
}

