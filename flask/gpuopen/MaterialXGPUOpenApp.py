'''
@file app.py
@brief A Flask application that connects with the GPUOpen MaterialX server to allow downloading and extracting of materials by regular expression.
'''
import argparse
import sys
from flask import Flask, render_template
import json
from flask_socketio import SocketIO, emit
from materialxMaterials import GPUOpenLoader as gpuo
have_mx = False
try:
    import MaterialX as mx
    have_mx = True
except ImportError as e:
    print("MaterialX module not found.")

# Not required unless performing MaterialX operations on data
#import MaterialX as mx

class MaterialXFlaskApp:
    '''
    @brief Base Flask application class for MaterialX GPUOpen server interactions.
    '''
    def __init__(self, home):
        '''
        Initialize the Flask application and SocketIO.
        @param home The home page template to render.
        '''
        self.home = home

        # Initialize Flask and SocketIO
        self.app = Flask(__name__)
        self.socketio = SocketIO(self.app)

        # Register routes and events
        self._register_routes()
        self._setup_event_handler_map()
        self._register_socket_events()

    def _register_routes(self):
        '''
        Register HTTP routes.
        '''
        @self.app.route('/')
        def home():
            """
            Render the home page.
            """
            status_message = f'Startup: Using MaterialX version: {mx.getVersionString()}'
            #self._emit_status_message(status_message)
            print(status_message)
            return render_template(self.home)

    def _setup_event_handler_map(self):
        """Pure virtual method: Must be implemented by subclasses."""
        raise NotImplementedError("Subclasses must implement _setup_event_handler_map")

    def _register_socket_events(self):
        '''
        Register SocketIO events.
        '''
        # Dynamically register event handlers
        for event_name, handler in self.event_handlers.items():
            self.socketio.on_event(event_name, handler)        

    def run(self, host, port, debug=True):
        '''
        Run the Flask server with SocketIO.
        @param host The host address to run the server on.
        @param port The port to run the server on.
        @param debug Whether to run the server in debug mode.
        '''
        self.socketio.run(self.app, host, port, debug=debug)


class MaterialXGPUOpenApp(MaterialXFlaskApp):
    '''
    A Flask application that connects with the GPUOpen MaterialX server to allow downloading 
    and extracting of materials by regular expression.    
    '''
    def __init__(self, homePage):
        '''
        Initialize the Flask application and the MaterialX loader.
        @param homePage The home page template to render.
        '''
        super().__init__(homePage)

        # Material loader and associated attributes
        self.loader = None
        self.materials = None
        self.material_names = None
        self.material_count = 0

    def _emit_status_message(self, message):
        '''
        @brief Emit a status message to the client. The message emitted is of the form:
        { 'message': 'message string' }

        @param message The status message to emit. 
        '''
        emit('materialx_status', { 'message': message }, broadcast=True)
        print('Python:', message)

    def handle_download_materialx(self, data):
        '''
        @brief Handle the 'download_materialx' event, initialize the loader, and send materials data to the client.
        Data is of the form:
        { 'materialCount': int, 
          'materialNames': list of strings, 
          'materialsList': list of material data in JSON format 
        }
        @param data The data received from the client (not used in this handler).

        '''
        status_message = f'Downloaded materials...'
        self._emit_status_message(status_message)

        # Initialize the loader and fetch materials
        self.loader = gpuo.GPUOpenMaterialLoader()
        from_package = data.get('frompackage', False)
        if from_package:
            self.loader.readPackageFiles()
        else:
            # Download vs package...
            self.materials = self.loader.getMaterials()
            self.loader.getRenders()
        self.material_names = self.loader.getMaterialNames()

        # Convert materials to JSON and add preview URLs
        materials_list = []
        merged_results = { "results": [] }
        for mat_json in self.loader.getMaterialsAsJsonString():
            mat_obj = json.loads(mat_json)
            # Add preview URL for each result
            results = mat_obj.get('results', [])
            for result in results:
                title = result.get('title')
                result['url'] = self.loader.getMaterialPreviewURL(title)
                merged_results["results"].append(result)

        # Sort list by title
        merged_results["results"].sort(key=lambda x: x.get('title', ''))
        materials_list.append(json.dumps(merged_results, indent=2))

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
        '''
        @brief Handle the 'extract_material' event, extract material data, and send it back to the client.
        @param data The data received from the client, expected to contain:
        { 'expression': string, 'update_materialx': bool }
        '''
        return_list = []

        if self.loader is None:
            self._emit_status_message('Loader is not initialized. Download materials first.')
            emit('materialx_extracted', {'extractedData': return_list}, broadcast=True)    
            return

        self._emit_status_message('Extracting materials...')
        expression = data.get('expression', 'Default Expression')
        update_mtlx = data.get('update_materialx', False)
        if not have_mx:
            update_mtlx = False

        # Since we are selecting only one existing material, use exact match search
        exact_match = True
        data_items = self.loader.downloadPackageByExpression(expression, exact_match)

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
                        mx_string = item['data']
                        if update_mtlx:
                            self._emit_status_message(f'Updating MaterialX data to version: {mx.getVersionString()}')
                            doc = mx.createDocument()
                            readOptions = mx.XmlReadOptions()
                            readOptions.readComments = True
                            readOptions.readNewlines = True
                            readOptions.upgradeVersion = True
                            mx.readFromXmlString(doc, mx_string, mx.FileSearchPath(), readOptions)
                            mx_string = mx.writeToXmlString(doc)

                        return_data[file_name] = mx_string
                    elif item["type"] == 'image':
                        self._emit_status_message(f'- Image file {file_name}')
                        image = item["data"]
                        image_base64 = self.loader.convertPilImageToBase64(image)
                        return_data[file_name] = image_base64                    

            if len(return_data) > 0:
                url = self.loader.getMaterialPreviewURL(title)
                self._emit_status_message(f'Preview URL: {url}')
                return_list.append({'title': title, 'data': return_data, 'url': url})

        if len(return_list) == 0:
            self._emit_status_message('No materials extracted')
            emit('materialx_extracted', {'extractedData': return_list}, broadcast=True)
        else:
            status_message = f'Extracted {len(return_list)} materials'
            self._emit_status_message(status_message)
            emit('materialx_extracted', {'extractedData': return_list}, broadcast=True)

    def _setup_event_handler_map(self):
        '''
        Set up dictionary of mapping event names to their handlers
        '''
        self.event_handlers = {
            'download_materialx': self.handle_download_materialx,
            'extract_material': self.handle_extract_material,
        }

# Main entry point
def main(): 
    '''
    @brief Main entry point for the application. Parses command-line arguments and starts the Flask server.
    @detail Argument parameters are:
    -h/--host: Host address to run the server on (default: 127.0.0.1)
    -po/--port: Port to run the server on (default: 8080)
    -ho/--home: Home page template (default: MaterialXGPUOpenApp.html)
    '''
    parser = argparse.ArgumentParser(description="GPUOpen MaterialX Application")
    parser.add_argument('-hs', '--host', type=str, default='127.0.0.1', help="Host address to run the server on (default: 127.0.0.1)")
    parser.add_argument('-p','--port', type=int, default=8080, help="Port to run the server on (default: 8080)")
    parser.add_argument('-ho', '--home', type=str, default='MaterialXGPUOpenApp.html', help="Home page.")

    args = parser.parse_args()

    app = MaterialXGPUOpenApp(args.home)
    app_host = args.host
    app_port = args.port
    app.run(host=app_host, port=app_port)

if __name__ == '__main__':
    main()