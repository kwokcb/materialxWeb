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

    updateStatus(message, force = false) {
        const inputDOM = document.getElementById('status_message');
        if (inputDOM.value == 'Status' || force)
            inputDOM.value = message
        else
            inputDOM.value += '\n' + message
        // Scroll to the bottom of the textarea
        inputDOM.scrollTop = inputDOM.scrollHeight;
    }

    emitEvent1() {
        console.log("WEB: Emitting client_event_1 event");
        this.emit('client_event_1', { message: "event 1" });
    }

    emitEvent2() {
        console.log("WEB: Emitting client_event_2 event");
        this.emit('client_event_2', { message: "event 2" });
    }

    handleServerMessage1(data) {
        console.log("WEB: Receive server message 1");
        this.updateConfigInfo(data.message);
    }

    handleServerMessage2(data) {
        console.log("WEB: Receive server message 2");
        this.updateStatus(data.message);
    }

    setupEventHandlers() {
        // Setup clear status button
        document.getElementById('clear_status').addEventListener('click', () => {
            this.updateStatus('Status', true);
        });

        // Bind event 1 to button click
        document.getElementById('button_event_1').addEventListener('click', () => {
            this.emitEvent1();
        });

        // Bind event 2 button click
        document.getElementById('button_event_2').addEventListener('click', () => {
            this.emitEvent2();
        });

        // Set up socket message event handlers
        this.webSocketWrapper = new WebSocketEventHandlers(this.socket, {
            status_message: (data) => { console.log('WEB: status event:', data.message); this.updateStatus(data.message) },
            server_message_1: (data) => { this.handleServerMessage1(data) },
            server_message_2: (data) => { this.handleServerMessage2(data) }
        });
    }
}

