const vscode = require('vscode');
const { exec } = require('child_process');
class StatusBarItem {
	constructor() {
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
		this.reset();  // Default state is "Click to Select Files"
		this.statusBarItem.show();
	}

	watching(numItems) {
		this.statusBarItem.text = `AutoDeploy: Watching ${numItems} item(s)`;
		this.statusBarItem.command = 'sf-autodeploy.stopWatching';
		this.statusBarItem.tooltip = 'Click to stop watching files or select new items';
	}

	deployed() {
		this.statusBarItem.text = 'AutoDeploy: File Changed - Deployed';
		this.statusBarItem.command = 'sf-autodeploy.stopWatching';
	}

	deployError() {
		this.statusBarItem.text = 'AutoDeploy: Error Deploying';
		this.statusBarItem.command = 'sf-autodeploy.stopWatching';
	}

	noWatch() {
		this.statusBarItem.text = 'AutoDeploy: Not Watching';
		this.statusBarItem.command = 'sf-autodeploy.startWatching';  // Start watching when clicked
		this.statusBarItem.tooltip = 'Click to start watching configured files';
	}

	reset() {
		this.statusBarItem.text = 'AutoDeploy: No Files Selected';
		this.statusBarItem.command = 'sf-autodeploy.selectItems';  // Go back to select files
		this.statusBarItem.tooltip = 'Click to select files to watch';
	}

	dispose() {
		this.statusBarItem.dispose();
	}
}

let watchers = [];
let statusBarItem;
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
	context.subscriptions.push(statusBarItem);
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
					const filePaths = selectedItems.map(item => item.fsPath);
					selectedFilePaths = filePaths;
					vscode.window.showInformationMessage(`Saved ${filePaths.length} items to configuration.`);
					statusBarItem.noWatch();
				}
			}
		});
	});
	context.subscriptions.push(cmdSelectItems);

	const cmdStartWatching = vscode.commands.registerCommand('sf-autodeploy.startWatching', function () {
		const filePaths = selectedFilePaths;
		if (filePaths.length > 0) {
			watchFiles(filePaths);
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
		statusBarItem.noWatch();
	});
	context.subscriptions.push(cmdStopWatching);

	const cmdReset = vscode.commands.registerCommand('sf-autodeploy.reset', function () {
		stopWatchingFiles();
		selectedFilePaths = [];
		vscode.window.showInformationMessage('Configuration reset. No files are being watched.');
		statusBarItem.reset();
	});
	context.subscriptions.push(cmdReset);
}

function watchFiles(filePaths) {
	if (filePaths.length === 0) return;

	filePaths.forEach(filePath => {
		const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(filePath, '**/*'));

		watcher.onDidChange(uri => {
			statusBarItem.text = 'AutoDeploy: File Changed - Deploying...';
			deployFile(uri.fsPath).then(() => {
				statusBarItem.deployed();
				setTimeout(() => statusBarItem.watching(filePaths.length), 3000);
			}).catch(() => {
				statusBarItem.deployError();
				setTimeout(() => statusBarItem.watching(filePaths.length), 3000);
			});
		});

		watchers.push(watcher);
	});

	statusBarItem.watching(filePaths.length);
	vscode.window.showInformationMessage(`Watching ${filePaths.length} file(s) for changes.`);
}

function stopWatchingFiles() {
	if (watchers.length > 0) {
		watchers.forEach(watcher => watcher.dispose());
		watchers = [];
		vscode.window.showInformationMessage('Stopped watching files.');
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

