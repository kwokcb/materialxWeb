import base64
import os
import argparse
import datetime
import platform

from flask import Flask, render_template
from flask_socketio import SocketIO, emit

import MaterialX as mx

# Try to import usdmtlx. If cannot, set flag to False
# -- Not really required as part of Python package requirements
try:
    from usdmtlx import convertMtlxToUsd
    have_usd_converter = True
except ImportError:
    print('Cannot import usdmtlx')
    have_usd_converter = False

# Try to import gltf_materialx_converter. If cannot, set flag to False
try:
    from gltf_materialx_converter import converter as MxGLTFPT
    from gltf_materialx_converter import utilities as MxGLTFPTUtil
    have_gltf_converter = True
except ImportError:
    print('Cannot import gltf_materialx_converter')
    have_gltf_converter = False

def get_os_details():
    return {
        'os': platform.system(),
        'release': platform.release(),
        'architecture': platform.machine()
    }

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

        self.deployment_platform = 'Local'
        print(f'* Initialized on deployment plaform: {self.deployment_platform}')
        self.os_details = get_os_details()
        print(f"  * OS: {self.os_details['os']}")
        print(f"  * Release: {self.os_details['release']}")
        print(f"  * Architecture: {self.os_details['architecture']}")

    def _register_routes(self):
        '''
        Register HTTP routes.
        '''
        @self.app.route('/')
        def home():
            '''
            Render the home page.
            '''
            #status_message = f'Startup: Using MaterialX version: {mx.getVersionString()}'
            #self._emit_status_message(status_message)
            return render_template(self.home)

    def _setup_event_handler_map(self):
        '''Pure virtual method: Must be implemented by subclasses.'''
        raise NotImplementedError("Subclasses must implement _setup_event_handler_map")

    def _register_socket_events(self):
        '''
        Register SocketIO events.
        '''
        # Dynamically register event handlers
        for event_name, handler in self.event_handlers.items():
            self.socketio.on_event(event_name, handler)        

    def run(self, host, port, deployment_platform, debug=True):
        '''
        Run the Flask server with SocketIO.
        '''
        self.deployment_platform = deployment_platform
        self.socketio.run(self.app, host, port, debug=debug)

class MaterialXConversionApp(MaterialXFlaskApp):
    '''
    '''
    def __init__(self, homePage):
        '''
        Constructor
        '''
        super().__init__(homePage)

    def _setup_event_handler_map(self):
        '''
        Set up dictionary of mapping event names to their handlers
        '''
        event_map = {}
        event_map['page_loaded'] = self.handle_page_loaded

        self.event_handlers = {
            'page_loaded': self.handle_page_loaded,
            'load_materialx': self.handle_load_materialx,
            'render_materialx': self.handle_render_materialx, 
            'convert_mtlx_to_usd': self.handle_convert_to_usd,
            'convert_mtlx_to_gltf': self.handle_convert_to_glTF,
            'query_have_gltf_converter': self.handle_have_gltf_converter,
        }

    def handle_page_loaded(self, data):
        '''
        Handle page load / startup feedback
        '''
        status = '> Using MaterialX version: ' + mx.getVersionString()
        emit('materialx_version', {'status': status}, broadcast=True)

    def handle_load_materialx(self, data):
        '''
        Handle loading in of MaterialX document
        '''
        materialx_file = data.get('materialxFile', 'Default MaterialX File')
        print('> Server: load materialx event received. File:', materialx_file)
        materialx_content = data.get('content', 'MaterialX content')
        doc = mx.createDocument()
        if len(materialx_content) == 0:
            return
        mx.readFromXmlString(doc, materialx_content)
        print('>> MaterialX Document loaded')
        doc_string = mx.writeToXmlString(doc)
        emit('materialx_loaded', {'materialxDocument': doc_string}, broadcast=True)

    def handle_render_materialx(self, data):
        '''
        Handle request to render MaterialX document
        '''
        materialx_string = data.get('materialxDocument', 'MaterialX content')
        print('> Server: render_materialx event received')

        # Get environment variable: MATERIALX_DEFAULT_VIEWER
        ilm_viewer = os.getenv('MATERIALX_DEFAULT_VIEWER', '')
        if len(ilm_viewer) == 0:
            print('>> MATERIALX_DEFAULT_VIEWER environment variable not set')
            return

        doc = mx.createDocument()
        if len(materialx_string) == 0:
            return

        stdlib = mx.createDocument()
        mx.loadLibraries(mx.getDefaultDataLibraryFolders(), mx.getDefaultDataSearchPath(), stdlib)
        doc.importLibrary(stdlib)
        mx.readFromXmlString(doc, materialx_string)

        # Get platform temporary folder location
        temp_location = os.getenv('TEMP', '/tmp')
        if not os.path.exists(temp_location):
            temp_location = '/tmp'
        # Generate a temp file name based on the current date and time
        temp_name = datetime.datetime.now().strftime('%Y%m%d%H%M%S') + '.mtlx'
        temp_file = f'{temp_location}/{temp_name}'
        mx.writeToXmlFile(doc, temp_file)
        capture_filename = temp_file.replace(".mtlx", ".png")
        cmd = f'{ilm_viewer} --screenWidth 512 --screenHeight 512 '
        cmd += f' --captureFilename {capture_filename} --material {temp_file}'
        print('>> Rendering:', cmd)
        os.system(cmd)
        # Delete the temp files
        os.remove(temp_file)

        image_base64 = self.convert_png_to_base64(capture_filename)
        os.remove(capture_filename)
        print('>> Emit materialx_rendered event')
        emit('materialx_rendered', {'image': image_base64}, broadcast=True)

    def handle_convert_to_usd(self, data):
        '''
        Handle request to convert MaterialX to USD
        '''
        if not have_usd_converter:
            emit('usd_converted', {'usdDocument': ''}, broadcast=True)
            return

        materialx_string = data.get('materialxDocument', '')
        print('> Server: convert-to-usd event received')
        doc = mx.createDocument()
        if len(materialx_string) == 0:
            return
        try:
            mx.readFromXmlString(doc, materialx_string)
            print('>> MaterialX document loaded')
            stage_string = convertMtlxToUsd(doc, True)
            print('>> USD stage created.')
            emit('usd_converted', {'usdDocument': stage_string}, broadcast=True)
        except Exception as e:
            print(f'>> Error during USD conversion: {e}')
            emit('usd_converted', {'usdDocument': ''}, broadcast=True)

    def handle_convert_to_glTF(self, data):
        '''
        Handle request to convert MaterialX to glTF Texture Procedural
        graph
        '''
        if not have_gltf_converter:
            emit('gltf_converted', {'document': '{}'}, broadcast=True)
            return

        materialx_string = data.get('materialxDocument', '')
        print('> Server: convert_to_glTF event received')
        stdlib, _ = MxGLTFPTUtil.load_standard_libraries()
        doc = MxGLTFPTUtil.create_working_document([stdlib])
        if len(materialx_string) == 0:
            return
        mx.readFromXmlString(doc, materialx_string)
        print('>> MaterialX document loaded')
        converter = MxGLTFPT.glTFMaterialXConverter()
        json_string, status = converter.materialX_to_glTF(doc)
        if not json_string:
            print('>> Error converting to glTF:', status)
            json_string = '{}'
        print('>> glTF JSON created:')
        emit('gltf_converted', {'document': json_string}, broadcast=True)

    def handle_have_gltf_converter(self):
        '''
        Handle query to see if glTF converter is available
        '''
        emit('have_gltf_converter', {'have_gltf_converter': have_gltf_converter}, broadcast=True)

    @staticmethod
    def convert_png_to_base64(file_path):
        '''
        Utility to load in png image from disk and return Base64 
        representation
        '''
        with open(file_path, "rb") as image_file:
            binary_data = image_file.read()
            return base64.b64encode(binary_data).decode('utf-8')

def deployment_platform():
    # Small detection setup to determine the platform
    # More can be added as needed
    if os.environ.get('RENDER_SERVICE_ID'):
        return "Render"
    elif os.environ.get('HEROKU'):
        return "Heroku"
    elif os.environ.get('AWS_EXECUTION_ENV'):
        return "AWS"
    else:
        # Assume running local
        return "Local"

def main():
    '''
    Main command line interface
    '''
    parser = argparse.ArgumentParser(description="GPUOpen MaterialX Application")
    parser.add_argument('--host', type=str, default='127.0.0.1', help="Host address to run the server on (default: 127.0.0.1)")
    parser.add_argument('--port', type=int, default=None, help="Port to run the server on (default: 8000)")
    parser.add_argument('--home', type=str, default='MaterialXConversionApp.html', help="Home page.")

    args = parser.parse_args()

    app_host = args.host
    deploy_platform = deployment_platform()
    if deployment_platform() == "Render":
        # Enforce this for Render deployments
        app_host = '0.0.0.0'

    # Get the port from the environment or fallback to args
    app_port = int(os.environ.get('PORT', 8080))  
    if args.port is not None:
        app_port = args.port

    app = MaterialXConversionApp(args.home)
    app.run(host=app_host, port=app_port, deployment_platform=deployment_platform)

if __name__ == "__main__":
    main()