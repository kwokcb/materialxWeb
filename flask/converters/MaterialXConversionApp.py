import base64
import os
from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import MaterialX as mx
import datetime

# Try to import usdmtlx. If cannot, set flag to False
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

class MaterialXConversionApp:
    def __init__(self):
        self.app = Flask(__name__)
        self.socketio = SocketIO(self.app)
        self._setup_routes()
        self._setup_socket_events()

    def _setup_routes(self):
        @self.app.route('/')
        def home():
            return render_template('MaterialXConversionApp.html')

    def _setup_socket_events(self):
        @self.socketio.on('page_loaded')
        def handle_page_loaded():
            status = '> Using MaterialX version: ' + mx.getVersionString()
            emit('python_status', {'status': status}, broadcast=True)

        @self.socketio.on('load_materialx')
        def handle_load_materialx(data):
            materialx_file = data.get('materialxFile', 'Default MaterialX File')
            print('> Server: load materialx event received. File:', materialx_file)
            materialx_content = data.get('content', 'MaterialX content')
            doc = mx.createDocument()
            if len(materialx_content) == 0:
                return
            mx.readFromXmlString(doc, materialx_content)
            print('> MaterialX Document loaded')
            doc_string = mx.writeToXmlString(doc)
            emit('materialx_loaded', {'materialxDocument': doc_string}, broadcast=True)

        @self.socketio.on('render_materialx')
        def handle_render_materialx(data):
            materialx_string = data.get('materialxDocument', 'MaterialX content')
            print('> Server: render_materialx event received')

            # Get environment variable: MATERIALX_ILM_VIEWER
            ilm_viewer = os.getenv('MATERIALX_ILM_VIEWER', '')
            if len(ilm_viewer) == 0:
                print('MATERIALX_ILM_VIEWER environment variable not set')
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
            print('> Rendering:', cmd)
            os.system(cmd)
            # Delete the temp files
            os.remove(temp_file)

            image_base64 = self.convert_png_to_base64(capture_filename)
            os.remove(capture_filename)
            print('> Emit materialx_rendered event')
            emit('materialx_rendered', {'image': image_base64}, broadcast=True)

        @self.socketio.on('convert_mtlx_to_usd')
        def handle_convert_to_usd(data):
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
                print('> MaterialX Document loaded')
                stage_string = convertMtlxToUsd(doc, True)
                print('> USD stage created:')
                emit('usd_converted', {'usdDocument': stage_string}, broadcast=True)
            except Exception as e:
                print(f'Error during USD conversion: {e}')
                emit('usd_converted', {'usdDocument': ''}, broadcast=True)

        @self.socketio.on('convert_mtlx_to_gltf')
        def handle_convert_to_glTF(data):
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
            print('> MaterialX document loaded')
            converter = MxGLTFPT.glTFMaterialXConverter()
            json_string, status = converter.materialX_to_glTF(doc)
            if not json_string:
                print('> Error converting to glTF:', status)
                json_string = '{}'
            print('> glTF JSON created:')
            emit('gltf_converted', {'document': json_string}, broadcast=True)

        @self.socketio.on('query_have_gltf_converter')
        def handle_have_gltf_converter():
            emit('have_gltf_converter', {'have_gltf_converter': have_gltf_converter}, broadcast=True)

    @staticmethod
    def convert_png_to_base64(file_path):
        with open(file_path, "rb") as image_file:
            binary_data = image_file.read()
            return base64.b64encode(binary_data).decode('utf-8')

if __name__ == "__main__":
    app_instance = MaterialXConversionApp()
    app_instance.socketio.run(app_instance.app, debug=True)
