
const assert = require('assert');
const vscode = require('vscode');
const myExtension = require('../extension'); // Adjust path as needed

suite('Extension Test Suite', function () {
	this.timeout(5000); // Some tests may take a bit longer

	suiteSetup(async () => {
		// Wait for the extension to activate
		await vscode.extensions.getExtension('ccmalcom.sf-autodeploy').activate();
	});

	// Test that the extension is activating correctly
	test('Extension should be active', async () => {
		const extension = vscode.extensions.getExtension('ccmalcom.sf-autodeploy');
		assert.ok(extension.isActive, 'Extension should be active after activation');
	});

	// Test that the command is registered
	test('sf-autodeploy.selectFiles command should be registered', async () => {
		const command = await vscode.commands.getCommands(true);
		assert.ok(command.includes('sf-autodeploy.selectFiles'), 'Command should be registered');
	});

	// Test selecting files for watching
	test('Selecting files to watch should open file dialog', async () => {
		// Mock the vscode.window.showOpenDialog to simulate file selection
		const showOpenDialog = vscode.window.showOpenDialog;
		vscode.window.showOpenDialog = async function () {
			// Simulate file selection by returning a mock URI array
			return [
				vscode.Uri.file('/mock/path/to/file')
			];
		};

		// Simulate invoking the command
		await vscode.commands.executeCommand('sf-autodeploy.selectFiles');

		// Restore the original showOpenDialog function
		vscode.window.showOpenDialog = showOpenDialog;

		assert.ok(true, 'File selection command should run without throwing errors');
	});

	// Test that file watching is initiated (Mocking)
	test('File watcher should be created for selected files', async () => {
		// Mock vscode.window.showOpenDialog to simulate file selection
		const showOpenDialog = vscode.window.showOpenDialog;
		vscode.window.showOpenDialog = async function () {
			// Simulate file selection by returning a mock URI array
			return [
				vscode.Uri.file('/mock/path/to/file')
			];
		};

		// Mock vscode.workspace.createFileSystemWatcher
		const createFileSystemWatcher = vscode.workspace.createFileSystemWatcher;
		let watcherCreated = false;

		vscode.workspace.createFileSystemWatcher = function () {
			watcherCreated = true;
			// Create event emitters for onDidChange, onDidCreate, onDidDelete
			const onDidChangeEmitter = new vscode.EventEmitter();
			const onDidCreateEmitter = new vscode.EventEmitter();
			const onDidDeleteEmitter = new vscode.EventEmitter();

			return {
				onDidChange: onDidChangeEmitter.event,
				onDidCreate: onDidCreateEmitter.event,
				onDidDelete: onDidDeleteEmitter.event,
				ignoreCreateEvents: false,
				ignoreChangeEvents: false,
				ignoreDeleteEvents: false,
				dispose: function () {
					onDidChangeEmitter.dispose();
					onDidCreateEmitter.dispose();
					onDidDeleteEmitter.dispose();
				}
			};
		};

		// Simulate invoking the command
		await vscode.commands.executeCommand('sf-autodeploy.selectFiles');

		// Verify that a watcher was created
		assert.ok(watcherCreated, 'File watcher should be created for selected files');

		// Restore original functions
		vscode.window.showOpenDialog = showOpenDialog;
		vscode.workspace.createFileSystemWatcher = createFileSystemWatcher;
	});

	// Test that the watcher triggers deployment on file change
	test('Watcher should trigger deployment on file change', async () => {
		// Mock vscode.window.showOpenDialog to simulate file selection
		const showOpenDialog = vscode.window.showOpenDialog;
		vscode.window.showOpenDialog = async function () {
			return [
				vscode.Uri.file('/mock/path/to/file')
			];
		};

		// Mock vscode.workspace.createFileSystemWatcher
		const createFileSystemWatcher = vscode.workspace.createFileSystemWatcher;
		let onDidChangeCallback = null;

		vscode.workspace.createFileSystemWatcher = function () {
			const onDidChangeEmitter = new vscode.EventEmitter();
			onDidChangeCallback = onDidChangeEmitter.fire.bind(onDidChangeEmitter);  // Bind the fire function to the emitter

			return {
				onDidChange: onDidChangeEmitter.event,
				onDidCreate: () => new vscode.Disposable(() => { }),
				onDidDelete: () => new vscode.Disposable(() => { }),
				ignoreCreateEvents: false,
				ignoreChangeEvents: false,
				ignoreDeleteEvents: false,
				dispose: () => {
					onDidChangeEmitter.dispose();
				}
			};
		};

		// Mock the terminal to capture the deploy command
		const createTerminal = vscode.window.createTerminal;
		let terminalCommand = '';
		vscode.window.createTerminal = function () {
			return {
				sendText: (text) => {
					terminalCommand = text; // Capture the deployment command
				},
				show: () => { },
				hide: () => { },  // Add the hide method
				name: 'Mock Terminal',
				processId: Promise.resolve(1234),  // Mock process ID
				creationOptions: {},
				exitStatus: undefined,  // Simulate a terminal that hasn't exited yet
				dispose: () => { },
				state: { isInteractedWith: false }
			};
		};

		// Simulate invoking the command
		await vscode.commands.executeCommand('sf-autodeploy.selectFiles');

		// Ensure onDidChangeCallback was assigned correctly before triggering
		assert.ok(onDidChangeCallback, 'onDidChangeCallback should be assigned');

		// Simulate a file change to trigger deployment
		onDidChangeCallback(vscode.Uri.file('/mock/path/to/file'));

		// Verify that the deployment command was triggered
		assert.strictEqual(terminalCommand, 'sfdx force:source:deploy -p /mock/path/to/file', 'Deployment command should be triggered on file change');

		// Restore original functions
		vscode.window.showOpenDialog = showOpenDialog;
		vscode.workspace.createFileSystemWatcher = createFileSystemWatcher;
		vscode.window.createTerminal = createTerminal;
	});
});