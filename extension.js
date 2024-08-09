const vscode = require('vscode');

function activate(context) {
  const mediaQueryManagerProvider = new MediaQueryManagerProvider();

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      'mediaQueryManagerTree',
      mediaQueryManagerProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('mediaQueryManagerTree.revealRange', (range) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        activeEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        activeEditor.selection = new vscode.Selection(range.start, range.end);
      }
    })
  );

  const provider = new MyWebviewViewProvider(context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('mediaQueryManagerView', provider)
	);	

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => {   

      mediaQueryManagerProvider.filter = false;        
      vscode.window.registerTreeDataProvider('mediaQueryManagerTree', mediaQueryManagerProvider);
      
      provider.clear(); 
      
    })
  );

  
}

class MediaQueryManagerProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    this.items = [];
    this.filter = false;

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
      
      if (!this.filter) {
        this.items = [];
      }
    
      mediaQueries.map((mediaQuery) => {
        const start = activeTabContent.indexOf(mediaQuery, searchPosition);
        const end = activeTabContent.indexOf('}', start) + 1;
        const mediaQueryContent = activeTabContent.slice(start, end);
        const mediaQueryRange = new vscode.Range(
          activeTab.document.positionAt(start),
          activeTab.document.positionAt(end)
        );
    
        const startLine = activeTab.document.positionAt(start).line + 1; // Get the line number (1-based)
    
        // Remove '@media screen and' from the label
        let label = mediaQueryContent.split('{')[0].trim().replace('@media screen and', '').trim();
        label = label.split('{')[0].trim().replace('@media only screen and', '').trim();
    
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
    
        //return treeItem;
        if (!this.filter) {
          this.items.push(treeItem);
        }
      });
      
      return this.items;
    }
  }
}

class MyWebviewViewProvider {
  constructor(context) {
    this.context = context;
    this._view = undefined;
  }

  resolveWebviewView(webviewView, context, token) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // main.js -> vscode.postMessage({ command: 'alert', text: 'Hello from Webview' });
    webviewView.webview.onDidReceiveMessage(message => {
      switch (message.command) {
        case 'alert':
          vscode.window.showInformationMessage(message.text);
          break;
        case 'text':
          let text = message.text;
          
          const treeDataProvider = new MediaQueryManagerProvider();                
          
          const filteredItems = filterItems(treeDataProvider.getChildren(), text);    
          
          treeDataProvider.items = filteredItems;
          if (text === '') {
            treeDataProvider.filter = false;
          }
          else {
            treeDataProvider.filter = true;
          }         

          vscode.window.registerTreeDataProvider('mediaQueryManagerTree', treeDataProvider);

          break;
      }
    });
  }


  getHtmlForWebview(webview) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.js'));

    // Do the same for the stylesheet.
    const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'reset.css'));
    const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'vscode.css'));
    const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'main.css'));

    const nonce = getNonce();

    return `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">

          <link href="${styleResetUri}" rel="stylesheet">
          <link href="${styleVSCodeUri}" rel="stylesheet">
          <link href="${styleMainUri}" rel="stylesheet">

          <title>Webview</title>
        </head>
        <body>
          <div class="wrapper"></div>

			    <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
  }

  clear() {
    if (this._view) {
      this._view.webview.postMessage({ type: 'clear' });
    }
  }
}

function filterItems(items, text) {
	return items.filter(item => item.label.toLowerCase().includes(text.toLowerCase()));
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

exports.activate = activate;

function deactivate() { }

module.exports = {
  activate,
  deactivate
};