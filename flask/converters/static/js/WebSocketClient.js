export class WebSocketClient
{
    constructor(socketLibrary, server) {
        this.socket = null;
        this.initialize(socketLibrary, server);
    }

    async initialize(socketLibrary, server) {
        try {
            if (!socketLibrary || socketLibrary.len == 0)
            {
                socketLibrary = "https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.5.4/socket.io.esm.min.js";
            }
            console.log(socketLibrary)
            // Dynamically load socket.io from CDN
            const { io } = await import(socketLibrary);
            
            //console.log('io:', io)

            // Initialize the socket connection
            if (server && server.len > 0)
            {
                this.socket = io(server); 
                console.log('Initialized socket.io', this.socket)
                this.setupEventHandlers();
            }
            else
            {
                this.socket = io();
                console.log('Initialized socket.io', this.socket)
                this.setupEventHandlers();
            }

        } catch (error) {
            console.error('Failed to load socket.io:', error);
        }
    }

    setupEventHandlers() {
        // Empty. Derived classes can override this          
    }
    
    emit(message, data) {
        this.socket.emit(message, data);
    }
}

export class WebSocketEventHandlers {    
    constructor(socket, eventHandlers) {
        console.log('Create event handlers:', eventHandlers)
        this.socket = socket;
        this.eventHandlers = eventHandlers;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Iterate over the event handlers and bind them to the socket
        for (const [eventName, handler] of Object.entries(this.eventHandlers)) {
            this.socket.on(eventName, handler);
        }
    }
}
