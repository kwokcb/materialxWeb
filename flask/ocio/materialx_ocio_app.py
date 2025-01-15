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

    def handle_get_config_info(self, data):
        '''
        Handle event and send back server information
        '''
        event_data = data.get('message', 'Message')
        self.configs, self.aconfig = self.generator.getBuiltinConfigs()
        self.config_info = self.generator.printConfigs(self.configs)
 
        emit('server_message_1', { 'message': self.config_info }, broadcast=True)

    def get_materialx_info(self, targetColorSpace, createGraphs):
        configs, aconfig = self.generator.getBuiltinConfigs()
        
        generator = self.generator

        # Generate MaterialX definitions and implementations for all color spaces
        # found in the ACES Cg Config and ACES Studio Config configurations.
        result = ''
        for c in configs:
            config = configs[c][0]
            for colorSpace in config.getColorSpaces():
                aliases = colorSpace.getAliases()
                trySource = ''
                for alias in aliases:
                    # Get alias if it does not contain a space
                    if ' ' not in alias:
                        trySource = alias
                if not trySource:
                    trySource = colorSpace.getName()
                if trySource:
                    sourceColorSpace = trySource

                    # Skip if the source and target are the same
                    if sourceColorSpace == targetColorSpace:
                        continue

                    #print('--- Generate transform for source color space:', trySource, '---')

                    # Generate source code
                    if not createGraphs:
                        definitionDoc = mx.createDocument()
                        implDoc = mx.createDocument()

                        definition, transformName, code, extension, target = generator.generateOCIO(aconfig, definitionDoc, implDoc, sourceColorSpace, targetColorSpace, 'color4')

                        # Write the definition, implementation and source code files 
                        if definition:

                            #filename = outputPath / mx.FilePath(definition.getName() + '.' + 'mtlx')
                            #print('Write MaterialX definition file:', filename.asString())
                            definitionString = mx.writeToXmlString(definitionDoc)

                            # Write the implementation document
                            #implFileName = outputPath / mx.FilePath('IM_' + transformName + '.' + 'mtlx')
                            #print('Write MaterialX implementation file:', implFileName.asString())
                            implementationString = mx.writeToXmlString(implDoc)

                            result = definitionString + '\n' + implementationString

                            #generator.writeShaderCode(outputPath, code, transformName, extension, target)
                    else:
                        # Generate node graph
                        outputType = 'color3'
                        graphDoc = generator.generateOCIOGraph(aconfig, sourceColorSpace, targetColorSpace, outputType)
                        if graphDoc:
                            transformName = generator.createTransformName(sourceColorSpace, targetColorSpace, outputType, 'mxgraph_')
                            #filename = outputPath / mx.FilePath(transformName + '.' + 'mtlx')
                            #print('Write MaterialX node graph definition file:', filename.asString())
                            result = mx.writeToXmlString(graphDoc)

                else:
                    result = 'Could not find suitable color space name to use: ' + colorSpace.getName()
        
        return result

    def handle_get_materialx_info(self, data):
        '''
        Handle event and send back server message 2
        '''
        event_data = data.get('message', 'Message')
        
        targetColorSpace = 'lin_rec709'
        createGraphs = True
        result = self.get_materialx_info(targetColorSpace, createGraphs)

        print('> Generatated MaterialX', result != None)
        
        #server_message_2 = 'Using OCIO Version: ' + self.OCIO_version + '. MaterialX Version: ' + self.materialx_version
        emit('server_message_2', { 'message': result }, broadcast=True)

    def _setup_event_handler_map(self):
        """
        Set up dictionary of mapping event names to their handlers
        """
        self.event_handlers = {
            'client_event_get_config_info': self.handle_get_config_info,
            'client_event_get_materialx_info': self.handle_get_materialx_info,
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