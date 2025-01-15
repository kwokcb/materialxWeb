import { WebSocketClient, WebSocketEventHandlers } from './WebSocketClient.js';

export class MaterialXOCIOClient extends WebSocketClient {
    constructor(socketLibrary, server) {
        // Call parent to setup socket I/O.
        super(socketLibrary, server);

        // Do other setup
        this.materialXEditor = null;
    }

    convertTableToBootstrapRowCol(container) {
        // Modify the table to make it scrollable using Bootstrap classes
        const tables = container.querySelectorAll('table');
        tables.forEach(table => {
            // Add Bootstrap table classes
            table.classList.add('table', 'table-dark', 'table-bordered', 'table-hover', 'table-striped');

            // Wrap the table in a div with Bootstrap's 'overflow-auto' class
            const wrapperDiv = document.createElement('div');
            wrapperDiv.classList.add('overflow-auto');
            wrapperDiv.style.maxWidth = '100%';
            wrapperDiv.style.maxHeight = '300px';

            // Move the table inside the wrapper div
            table.parentNode.insertBefore(wrapperDiv, table);
            wrapperDiv.appendChild(table);

            // Add a Bootstrap color class to the table header
            const thead = table.querySelector('thead');
            const headerColorClass = 'table-primary'; 
            if (thead) {
                thead.classList.add(headerColorClass);
            } else {
                const firstRow = table.querySelector('tr');
                if (firstRow) {
                    firstRow.classList.add(headerColorClass); 
                }
            }
        });
    }

    updateConfigInfo(message) {
        const html = marked.parse(message);
        const configDOM = document.getElementById('config_info')
        configDOM.innerHTML = html;
        this.convertTableToBootstrapRowCol(configDOM);
    }

    updateMaterialXInfo(message) {
        //const materialxDOM = document.getElementById('materialX_info')
        //materialxDOM.value = message;
        this.materialXEditor.setValue(message);
    }

    updateStatus(message, force = false) {
        const inputDOM = document.getElementById('status_message');
        if (inputDOM.value == 'Status' || force)
            inputDOM.value = message
        else
            inputDOM.value += '\n' + message
        // Scroll to the bottom of the textarea
        inputDOM.scrollTop = inputDOM.scrollHeight;
    }

    emitGetConfigInfo() {
        this.updateStatus("Emit client_event_get_config_info event");
        this.emit('client_event_get_config_info', { message: "event 1" });
    }

    getMaterialXInfo() {
        this.updateStatus("Emit client_event_get_materialx_info event");
        this.emit('client_event_get_materialx_info', { message: "event 2" });
    }

    handleServerConfigInfo(data) {
        this.updateStatus("Received server config info");
        this.updateConfigInfo(data.message);
    }

    handleServerMaterialXInfo(data) {
        this.updateStatus("Received server materialx info");
        this.updateMaterialXInfo(data.message);
    }

    handleServerVersionInfo(data) {
        this.updateStatus("Received server version info");

        const ocio_version = document.getElementById('ocio_version');
        const ocio_image = '<img src="https://opencolorio.org/images/ocio_m2x.png" width="48px"></img>';
        ocio_version.innerHTML = ocio_image + ' version: ' + data.ocio_version;

        const materialx_version = document.getElementById('materialx_version');
        const mtlx_image = '<img src="https://materialx.org/LogoImages/MaterialXLogo2K.png" width="48px">';
        materialx_version.innerHTML = mtlx_image + ' version: ' + data.materialx_version;
    }   

    setupEventHandlers() {
        // Setup clear status button
        document.getElementById('clear_status').addEventListener('click', () => {
            this.updateStatus('Status', true);
        });

        document.getElementById('button_event_get_config').addEventListener('click', () => {
            this.emitGetConfigInfo();
        });

        document.getElementById('button_event_get_materialx').addEventListener('click', () => {
            this.getMaterialXInfo();
        });


        // Set up socket message event handlers
        this.webSocketWrapper = new WebSocketEventHandlers(this.socket, {
            status_message: (data) => { console.log('WEB: status event:', data.message); this.updateStatus(data.message) },
            server_message_get_config_info: (data) => { this.handleServerConfigInfo(data) },
            server_message_get_mtlx_info: (data) => { this.handleServerMaterialXInfo(data) },
            server_message_version_info: (data) => { this.handleServerVersionInfo(data) }
        });

        this.emit('client_event_get_version_info');
    }
    
    setupXML() {
        /* 
        const materialXTextArea = document.getElementById('mtlxOutput');
        this.editor = CodeMirror.fromTextArea(materialXTextArea, {
            mode: 'application/json',
            lineNumbers: true,
            theme: 'dracula',
        });
        this.editor.setSize('auto', '300px');
        */

        // Initialize CodeMirror for MaterialX content
        const materialXTextArea2 = document.getElementById('materialX_info');
        this.materialXEditor = CodeMirror.fromTextArea(materialXTextArea2, {
            mode: 'application/xml',
            lineNumbers: true,
            theme: 'dracula',
        });
        this.materialXEditor.setSize('auto', '300px');
    }
}
