const vscode = require('vscode');

function activate(context) {
  const mediaQueryManagerProvider = new MediaQueryManagerProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      'mediaQueryManagerView',
      mediaQueryManagerProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mediaQueryManagerView.revealRange', (range) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        activeEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        activeEditor.selection = new vscode.Selection(range.start, range.end);
      }
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {
      mediaQueryManagerProvider.refresh();
    })
  );
}

class MediaQueryManagerProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element) {
    return element;
  }

  getChildren(element) {
    const activeTab = vscode.window.activeTextEditor;
    if (!activeTab) {
      return [];
    }
    
    const activeTabContent = activeTab.document.getText();
    const mediaQueries = activeTabContent.match(/@media.*{/g);
    
    if (mediaQueries) {
      let searchPosition = 0; // Initialize the search position
    
      return mediaQueries.map((mediaQuery) => {
        const start = activeTabContent.indexOf(mediaQuery, searchPosition);
        const end = activeTabContent.indexOf('}', start) + 1;
        const mediaQueryContent = activeTabContent.slice(start, end);
        const mediaQueryRange = new vscode.Range(
          activeTab.document.positionAt(start),
          activeTab.document.positionAt(end)
        );
    
        const startLine = activeTab.document.positionAt(start).line + 1; // Get the line number (1-based)
    
        // Remove '@media screen and' from the label
        const label = mediaQueryContent.split('{')[0].trim().replace('@media screen and', '').trim();
    
        const treeItem = new vscode.TreeItem(
          `${label} (Line ${startLine})`,
          vscode.TreeItemCollapsibleState.None
        );
    
        treeItem.command = {
          command: 'vscode.open',
          title: 'Open Media Query',
          arguments: [activeTab.document.uri, { selection: mediaQueryRange }]
        };
    
        searchPosition = end; // Update the search position to the end of the current media query
    
        return treeItem;
      });
    }
  }
}

exports.activate = activate;

function deactivate() { }

module.exports = {
  activate,
  deactivate
};