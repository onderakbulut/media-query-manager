(function () {
    const vscode = acquireVsCodeApi();

    /* 
    vscode.postMessage({
        command: 'alert',
        text: 'Hello from Webview'
    });  
    */   
    
    const input = document.createElement('input');
    input.type = 'text';
    input.classList.add('search');
    input.placeholder = 'Type here';
    document.querySelector('.wrapper').appendChild(input);

   
    input.addEventListener('input', function() {
        const query = input.value.toLowerCase();
        vscode.postMessage({
            command: 'text',
            text: query
        });
        
    });
    

    window.addEventListener('message', event => {
        const message = event.data; 
        switch (message.type) {
            case 'clear':
                {
                    clear();
                    break;
                }

        }
    });
   
    function clear() {
        input.value = '';
    }

}());