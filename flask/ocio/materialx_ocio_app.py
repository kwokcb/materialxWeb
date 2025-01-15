'''
@file materialx_ocio_app.py
@brief __PYTHON_APP_DESCRIPTION__
'''
import argparse
from flask import Flask, render_template
from flask_socketio import SocketIO, emit

import MaterialX as mx
import PyOpenColorIO as OCIO
from materialxocio import core as mxocio

class MaterialXFlaskApp:
    def __init__(self, home):
        self.home = home

        # Initialize Flask and SocketIO
        self.app = Flask(__name__)
        self.socketio = SocketIO(self.app)

        # Register routes and events
        self._register_routes()
        self._setup_event_handler_map()
        self._register_socket_events()

    def _register_routes(self):
        """
        Register HTTP routes.
        """
        @self.app.route('/')
        def home():
            """
            Render the home page.
            """
            #status_message = f'Startup: Using MaterialX version: {mx.getVersionString()}'
            #self._emit_status_message(status_message)
            return render_template(self.home)

    def _setup_event_handler_map(self):
        """Pure virtual method: Must be implemented by subclasses."""
        raise NotImplementedError("Subclasses must implement _setup_event_handler_map")

    def _register_socket_events(self):
        """
        Register SocketIO events.
        """
        # Dynamically register event handlers
        for event_name, handler in self.event_handlers.items():
            self.socketio.on_event(event_name, handler)        

    def run(self, host, port, debug=True):
        """
        Run the Flask server with SocketIO.
        """
        self.socketio.run(self.app, host, port, debug=debug)


class materialx_ocio_app(MaterialXFlaskApp):
    '''
    '''
    def __init__(self, homePage):
        """
        Initialize the Flask application and the MaterialX loader.
        """
        super().__init__(homePage)

        # Check OCIO version
        self.OCIO_version = OCIO.GetVersion()
        ocioVersion = self.OCIO_version.split('.')
        if len(ocioVersion) < 2:
            print('> OCIO version is not in the expected format.')
        if int(ocioVersion[0]) < 2 or int(ocioVersion[1]) < 2:
            print('> OCIO version 2.2 or greater is required.')
    
        print('> Using OCIO version:', self.OCIO_version)

        self.materialx_version = mx.getVersionString()
        print('> Using MaterialX version:', self.materialx_version)

        self.generator = mxocio.OCIOMaterialaxGenerator()
        #self.configs, self.aconfig = self.generator.getBuiltinConfigs()

    def _emit_status_message(self, message):
        """
        Emit a status message to the client.
        """
        emit('status_message', { 'message': message }, broadcast=True)

    def _handle_client_event_1(self, data):
        '''
        Handle event and send back server message 1
        '''
        event_data = data.get('message', 'Message')
        #server_message_1 = "server handled: " + event_data

        #self.generator = mxocio.OCIOMaterialaxGenerator()
        self.configs, self.aconfig = self.generator.getBuiltinConfigs()
        self.config_info = self.generator.printConfigs(self.configs)
 
        emit('server_message_1', { 'message': self.config_info }, broadcast=True)

    def _handle_client_event_2(self, data):
        '''
        Handle event and send back server message 2
        '''
        event_data = data.get('message', 'Message')
        server_message_2 = "server handled: " + event_data
        emit('server_message_2', { 'message': server_message_2 }, broadcast=True)

    def _setup_event_handler_map(self):
        """
        Set up dictionary of mapping event names to their handlers
        """
        self.event_handlers = {
            'client_event_1': self._handle_client_event_1,
            'client_event_2': self._handle_client_event_2,
        }

# Main entry point
def main(): 
    parser = argparse.ArgumentParser(description="__PYTHON_PROJECT_DESCRIPTION__")
    parser.add_argument('--host', type=str, default='127.0.0.1', help="Host address to run the server on (default: 127.0.0.1)")
    parser.add_argument('--port', type=int, default=5002, help="Port to run the server on (default: 5002)")
    parser.add_argument('--home', type=str, default='materialx_ocio_app.html', help="Home page.")

    args = parser.parse_args()

    app = materialx_ocio_app(args.home)
    app_host = args.host
    app_port = args.port
    app.run(host=app_host, port=app_port)

if __name__ == '__main__':
    main()