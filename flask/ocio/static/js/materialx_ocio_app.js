import { WebSocketClient, WebSocketEventHandlers } from './WebSocketClient.js';

export class templateClient extends WebSocketClient {
    constructor(socketLibrary, server) {
        // Call parent to setup socket I/O.
        super(socketLibrary, server);

        // Do other setup
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
            wrapperDiv.style.maxHeight = '400px';

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
        const materialxDOM = document.getElementById('materialX_info')
        materialxDOM.value = message;
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
            server_message_1: (data) => { this.handleServerConfigInfo(data) },
            server_message_2: (data) => { this.handleServerMaterialXInfo(data) }
        });
    }
}

