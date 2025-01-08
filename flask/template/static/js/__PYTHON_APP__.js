import { WebSocketClient,  WebSocketEventHandlers } from './WebSocketClient.js';

export class __JAVASCRIPT_CLIENT__ extends WebSocketClient
{
    constructor(socketLibrary, server) {
        // Call parent to setup socket I/O.
        super(socketLibrary, server);
        
        // Do other setup
    }

    updateStatus(message, force = false) 
    {
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

    handleServerMessage1(data)
    {
        console.log("WEB: Receive server message 1");
        updateStatus(data.message);
    }

    handleServerMessage2(data)
    {
        console.log("WEB: Receive server message 2");
        updateStatus(data.message);       
    }

    setupEventHandlers() {
        // Setup clear status button
        document.getElementById('clear_status').addEventListener('click', () => {
            this.updateStatusInput('Status', true);
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

