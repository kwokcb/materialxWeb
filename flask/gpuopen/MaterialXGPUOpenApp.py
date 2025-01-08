'''
@file app.py
@brief A Flask application that connects with the GPUOpen MaterialX server to allow downloading and extracting of materials by regular expression.
'''
import argparse
from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from materialxMaterials import GPUOpenLoader as gpuo

# Not required unless performing MaterialX operations on data
#import MaterialX as mx

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


class MaterialXGPUOpenApp(MaterialXFlaskApp):
    '''
    A Flask application that connects with the GPUOpen MaterialX server to allow downloading 
    and extracting of materials by regular expression.    
    '''
    def __init__(self, homePage):
        """
        Initialize the Flask application and the MaterialX loader.
        """
        super().__init__(homePage)

        # Material loader and associated attributes
        self.loader = None
        self.materials = None
        self.material_names = None
        self.material_count = 0

    def _emit_status_message(self, message):
        """
        Emit a status message to the client.
        """
        emit('materialx_status', { 'message': message }, broadcast=True)
        print('Python:', message)

    def handle_download_materialx(self, data):
        """
        Handle the 'download_materialx' event, initialize the loader, and send materials data to the client.
        """
        status_message = f'Downloaded materials...'
        self._emit_status_message(status_message)

        # Initialize the loader and fetch materials
        self.loader = gpuo.GPUOpenMaterialLoader()
        self.materials = self.loader.getMaterials()
        self.material_names = self.loader.getMaterialNames()

        # Convert materials to JSON and get the count
        materials_list = self.loader.getMaterialsAsJsonString()
        self.material_count = len(self.material_names)

        # Emit a status message
        status_message = f'Downloaded {self.material_count} materials.'
        self._emit_status_message(status_message)

        # Emit the data back to the client
        emit('materialx_downloaded', {
            'materialCount': self.material_count,
            'materialNames': self.material_names,
            'materialsList': materials_list
        }, broadcast=True)

    def handle_extract_material(self, data):
        """
        Handle the 'extract_material' event, extract material data, and send it back to the client.
        """
        if self.loader is None:
            self._emit_status_message('Loader is not initialized. Download materials first.')
            return

        expression = data.get('expression', 'Default Expression')
        data_items = self.loader.downloadPackageByExpression(expression)
        return_list = []

        for data_item in data_items:
            status_message = f'Extracting material: {data_item[1]}'
            self._emit_status_message(status_message)
            package = data_item[0]
            title = data_item[1]
            extracted_data = self.loader.extractPackageData(package, None)
            return_data = {}

            if extracted_data:
                for item in extracted_data:
                    file_name = item['file_name']
                    if item['type'] == 'mtlx':
                        self._emit_status_message(f'- MaterialX file {file_name}')
                        return_data[file_name] = item['data']
                    elif item["type"] == 'image':
                        self._emit_status_message(f'- Image file {file_name}')
                        image = item["data"]
                        image_base64 = self.loader.convertPilImageToBase64(image)
                        return_data[file_name] = image_base64

            if len(return_data) > 0:
                return_list.append({'title': title, 'data': return_data})

        if len(return_list) == 0:
            self._emit_status_message('No materials extracted')
        else:
            status_message = f'Extracted {len(return_list)} materials'
            self._emit_status_message(status_message)
            emit('materialx_extracted', {'extractedData': return_list}, broadcast=True)

    def _setup_event_handler_map(self):
        """
        Set up dictionary of mapping event names to their handlers
        """
        self.event_handlers = {
            'download_materialx': self.handle_download_materialx,
            'extract_material': self.handle_extract_material,
        }

# Main entry point
def main(): 
    parser = argparse.ArgumentParser(description="GPUOpen MaterialX Application")
    parser.add_argument('--host', type=str, default='127.0.0.1', help="Host address to run the server on (default: 127.0.0.1)")
    parser.add_argument('--port', type=int, default=8080, help="Port to run the server on (default: 8080)")
    parser.add_argument('--home', type=str, default='MaterialXGPUOpenApp.html', help="Home page.")

    args = parser.parse_args()

    app = MaterialXGPUOpenApp(args.home)
    app_host = args.host
    app_port = args.port
    app.run(host=app_host, port=app_port)

if __name__ == '__main__':
    main()