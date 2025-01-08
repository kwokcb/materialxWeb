import MaterialX as mx
from pxr import Usd, UsdShade, Sdf, UsdGeom, Gf

def mapMtlxToUsdShaderNotation(name):
    '''
    Utility to map from a MaterialX shader notation to Usd.
    It would be easier if the same notation was used.
    '''
    if name == 'surfaceshader': 
        name = 'surface'
    elif name == 'displacementshader':
        name = 'displacement'
    elif name == 'volumshader':
        name = 'volume'
    return name

def emitUsdConnections(node, stage, rootPath):
    """ 
    Emit connections between MaterialX elements as Usd connections for 
    a given MaterialX node.

    Paramters:
    - node : 
        MaterialX node to examine
    - stage :
        Usd stage to write connection to
    """
    if not node:
        return
    
    materialPath = None
    if node.getType() == 'material':
        materialPath = node.getName()

    for valueElement in node.getActiveValueElements():
        isInput = valueElement.isA(mx.Input) 
        isOutput = valueElement.isA(mx.Output)
        if  isInput or isOutput:

            interfacename = ''

            # Find out what type of element is connected to upstream:
            # node, nodegraph, or interface input.
            mtlxConnection = valueElement.getAttribute('nodename')
            if not mtlxConnection:
                mtlxConnection = valueElement.getAttribute('nodegraph')
            if not isOutput:
                if not mtlxConnection:
                    mtlxConnection = valueElement.getAttribute('interfacename')
                    interfacename = mtlxConnection 

            connectionPath = ''
            if mtlxConnection:

                # Handle input connection by searching for the appropriate parent node.
                # - If it's an interface input we want the parent nodegraph. Otherwise
                # we want the node or nodegraph specified above.
                # - If the parent path is the root (getNamePath() is empty), then this is to 
                # nodes at the root document level. 
                if isInput:
                    parent = node.getParent()
                    if parent.getNamePath():
                        if interfacename:
                            connectionPath = rootPath + parent.getNamePath()
                        else:
                            connectionPath = rootPath + parent.getNamePath() + '/' + mtlxConnection
                    else:
                        # The connectio is to a prim at the root level so insert a '/' identifier
                        # as getNamePath() will return an empty string at the root Document level.
                        if interfacename:
                            connectionPath = rootPath
                        else:
                            connectionPath = rootPath + mtlxConnection

                # Handle output connection by looking for sibling elements
                else:
                    parent = node.getParent()                    
                    
                    # Connection is to sibling under the same nodegraph
                    if node.isA(mx.NodeGraph):
                        connectionPath = rootPath + node.getNamePath() + '/' + mtlxConnection
                    else:
                        # Connection is to a nodegraph parent of the current node 
                        if parent.getNamePath():
                            connectionPath = rootPath + parent.getNamePath() + '/' + mtlxConnection
                        # Connection is to the root document.
                        else:
                            connectionPath = rootPath + mtlxConnection

                # Find the source prim
                # Assumes that the source is either a nodegraph, a material or a shader
                connectionPath = connectionPath.removesuffix('/')
                sourcePrim = None
                sourcePort = 'out'
                source = stage.GetPrimAtPath(connectionPath)
                if not source:
                    if materialPath:
                        connectionPath = '/' + materialPath + connectionPath
                        source = stage.GetPrimAtPath(connectionPath)
                        if not source:
                            source = stage.GetPrimAtPath('/' + materialPath)
                if source:
                    if source.IsA(UsdShade.Material): 
                        sourcePrim = UsdShade.Material(source)
                    elif source.IsA(UsdShade.NodeGraph):
                        sourcePrim = UsdShade.NodeGraph(source)
                    elif source.IsA(UsdShade.Shader): 
                        sourcePrim = UsdShade.Shader(source)

                    # Special case handle interface input vs an output
                    if interfacename:
                        sourcePort =  interfacename
                    else:                          
                        sourcePort = valueElement.getAttribute('output')
                        if not sourcePort:
                            sourcePort = 'out'
                    if sourcePort:
                        mtlxConnection = mtlxConnection + '. Port:' + sourcePort

                else:
                    print('> Failed to find source at path:', connectionPath)

                # Find destination prim and port and make the appropriate connection.
                # Assumes that the destination is either a nodegraph, a material or a shader
                destInput = None
                if sourcePrim:
                    dest = stage.GetPrimAtPath(rootPath + node.getNamePath())
                    if not dest:
                        print('> Failed to find dest at path:', rootPath + node.getNamePath())
                    else:
                        destPort = None
                        portName = valueElement.getName()
                        destNode = None
                        if dest.IsA(UsdShade.Material): 
                            destNode = UsdShade.Material(dest)
                        elif dest.IsA(UsdShade.NodeGraph):
                            destNode = UsdShade.NodeGraph(dest)
                        elif dest.IsA(UsdShade.Shader): 
                            destNode = UsdShade.Shader(dest)
                        else:
                            print('> Encountered unsupport destinion type')

                        # Find downstream port (input or output)
                        if destNode:
                            if isInput:
                                # Map from MaterialX to Usd connection syntax
                                if dest.IsA(UsdShade.Material):
                                    portName = mapMtlxToUsdShaderNotation(portName)
                                    portName = 'mtlx:' + portName
                                    destPort = destNode.GetOutput(portName) 
                                else:
                                    destPort = destNode.GetInput(portName) 
                            else:
                                destPort = destNode.GetOutput(portName)                                

                        # Make connection to interface input, or node/nodegraph output
                        if destPort:
                            if interfacename:
                                interfaceInput = sourcePrim.GetInput(sourcePort) 
                                if interfaceInput:
                                    if not destPort.ConnectToSource(interfaceInput):
                                        print('> Failed to connect: ', source.GetPrimPath(), '-->', destPort.GetFullName())
                            else:
                                sourcePrimAPI = sourcePrim.ConnectableAPI()
                                if not destPort.ConnectToSource(sourcePrimAPI, sourcePort):
                                    print('> Failed to connect: ', source.GetPrimPath(), '-->', destPort.GetFullName())
                        else:
                            print('> Failed to find destination port:', portName)


def mapMtxToUsdType(mtlxType):
    """
    Map a MaterialX type to an Usd Sdf type

    Parameters:
    -----------
    - mtxType : string
        MaterialX type 
    """
    mtlxUsdMap = dict()
    mtlxUsdMap['filename'] = Sdf.ValueTypeNames.Asset
    mtlxUsdMap['string'] = Sdf.ValueTypeNames.String
    mtlxUsdMap['boolean'] = Sdf.ValueTypeNames.Bool
    mtlxUsdMap['integer'] = Sdf.ValueTypeNames.Int
    mtlxUsdMap['float'] = Sdf.ValueTypeNames.Float
    mtlxUsdMap['color3'] = Sdf.ValueTypeNames.Color3f
    mtlxUsdMap['color4'] = Sdf.ValueTypeNames.Color4f
    mtlxUsdMap['vector2'] = Sdf.ValueTypeNames.Float2    
    mtlxUsdMap['vector3'] = Sdf.ValueTypeNames.Vector3f    
    mtlxUsdMap['vector4'] = Sdf.ValueTypeNames.Float4    
    mtlxUsdMap['surfaceshader'] = Sdf.ValueTypeNames.Token

    if mtlxType in mtlxUsdMap:
        return mtlxUsdMap[mtlxType]
    return Sdf.ValueTypeNames.Token

def mapMtxToUsdValue(mtlxType, mtlxValue):
    """
    Map a MaterialX value of a given type to a Usd value.
    Note: Not all types are included here.
    """
    usdValue = '__'
    if mtlxType == 'float':
        usdValue = mtlxValue
    elif mtlxType == 'integer':
        usdValue = mtlxValue
    elif mtlxType == 'boolean':                    
        usdValue = mtlxValue
    elif mtlxType == 'string':                    
        usdValue = mtlxValue
    elif mtlxType == 'filename':  
        usdValue = mtlxValue
    elif mtlxType == 'vector2':
        usdValue = Gf.Vec2f( mtlxValue[0], mtlxValue[1] )
    elif mtlxType == 'color3' or mtlxType == 'vector3':
        usdValue = Gf.Vec3f( mtlxValue[0], mtlxValue[1], mtlxValue[2] )
    elif mtlxType == 'color4' or mtlxType == 'vector4':
        usdValue = Gf.Vec4f( mtlxValue[0], mtlxValue[1], mtlxValue[2], mtlxValue[3] )

    return usdValue

def emitUsdValueElements(node, usdNode, emitAllValueElements):
    """
    Emit MaterialX value elements in Usd.

    Parameters
    ------------    
    node: 
        MaterialX node with value elements to scan
    usdNode:
        UsdShade node to create value elements on.
    emitAllValueElements: bool
        Emit value elements based on node definition, even if not specified on node instance.      
    """
    if not node:
        return    
    
    isMaterial = node.getType() == 'material'
 
    # Instantiate with all the nodedef inputs (if emitAllValueELements is True).
    # Note that outputs are always created.
    nodedef = node.getNodeDef()
    if nodedef and not isMaterial:
        for valueElement in nodedef.getActiveValueElements():
            if valueElement.isA(mx.Input):
                if emitAllValueElements:
                    mtlxType = valueElement.getType()
                    usdType = mapMtxToUsdType(mtlxType)

                    portName = valueElement.getName()
                    usdInput = usdNode.CreateInput(portName, usdType)

                    if len(valueElement.getValueString()) > 0:
                        mtlxValue = valueElement.getValue()
                        usdValue = mapMtxToUsdValue(mtlxType, mtlxValue)
                        if usdValue != '__':
                            usdInput.Set(usdValue)

            elif not isMaterial and valueElement.isA(mx.Output):
                usdOutput = usdNode.CreateOutput(valueElement.getName(), mapMtxToUsdType(valueElement.getType()))

            else:
                print('- Skip mapping of definition element: ', valueElement.getName(), '. Type: ', valueElement.getCategory())

    # From the given instance add inputs and outputs and set values.
    # This may override the default value specified on the definition.
    for valueElement in node.getActiveValueElements():
        if valueElement.isA(mx.Input):
            mtlxType = valueElement.getType()
            usdType = mapMtxToUsdType(mtlxType)
            portName = valueElement.getName()
            if isMaterial:
                # Map from Materials to Usd notation
                portName = mapMtlxToUsdShaderNotation(portName)    
                usdInput = usdNode.CreateOutput('mtlx:' + portName, usdType)
            else:            
                usdInput = usdNode.CreateInput(portName, usdType)

            # Set value. Note that we check the length of the value string
            # instead of getValue() as a 0 value will be skipped.
            if len(valueElement.getValueString()) > 0:
                mtlxValue = valueElement.getValue()
                usdValue = mapMtxToUsdValue(mtlxType, mtlxValue)
                if usdValue != '__':
                    usdInput.Set(usdValue)

        elif not isMaterial and valueElement.isA(mx.Output):
            usdOutput = usdNode.GetInput(valueElement.getName())
            if not usdOutput:
                usdOutput = usdNode.CreateOutput(valueElement.getName(), mapMtxToUsdType(valueElement.getType()))

        else:
            print('- Skip mapping of element: ', valueElement.getNamePath(), '. Type: ', valueElement.getCategory())


def moveChild(newParent, child):
    newChild = newParent.addChildOfCategory(child.getCategory(), child.getName())
    print(newChild.getNamePath())
    newChild.copyContentFrom(child)
    oldParent = child.getParent()
    oldParent.removeChild(child.getName())

def emitUsdShaderGraph(doc, stage, mxnodes, emitAllValueElements):
    """
    Emit Usd shader graph to a given stage from a list of MaterialX nodes.

    Parameters
    ------------    
    doc: 
        MaterialX source document
    stage:
        Usd target stage
    mxnodes:
        MaterialX shader nodes.
    emitAllValueElements: bool
        Emit value elements based on node definition, even if not specified on node instance.      
    """
    materialPath = None
    print('Stage:', stage)
    if not stage:
        return

    for v in mxnodes:
        elem = doc.getDescendant(v)
        if elem.getType() == 'material':    
            materialPath = elem.getName()
            break
            
    # Emit Usd nodes
    for v in mxnodes:
        elem = doc.getDescendant(v)

        # Note that MaterialX does not use absolute path notation while Usd
        # does. This will result in an error when trying set the path
        usdPath = '/' + elem.getNamePath()

        nodeDef = None
        usdNode = None
        if elem.getType() == 'material':
            usdNode = UsdShade.Material.Define(stage, usdPath)                
        elif elem.isA(mx.Node):
            nodeDef = elem.getNodeDef()
            if materialPath:
                elemPath = '/' + materialPath + usdPath
            else:
                elemPath = usdPath
            usdNode = UsdShade.Shader.Define(stage, elemPath)
        elif elem.isA(mx.NodeGraph):
            if materialPath:
                elemPath = '/' + materialPath + usdPath
            else:
                elemPath = usdPath
            usdNode = UsdShade.NodeGraph.Define(stage, elemPath)

        if usdNode:
            if nodeDef:
                usdNode.SetShaderId(nodeDef.getName())
            emitUsdValueElements(elem, usdNode, emitAllValueElements)

    # Emit connections between Usd nodes
    for v in mxnodes:
        elem = doc.getDescendant(v)
        usdPath = '/' + elem.getNamePath()

        if elem.getType() == 'material':
            emitUsdConnections(elem, stage, '/')                
        elif elem.isA(mx.Node):
            if materialPath:
                emitUsdConnections(elem, stage, '/' + materialPath + '/')                
        elif elem.isA(mx.NodeGraph):
            if materialPath:
                emitUsdConnections(elem, stage, '/' + materialPath + '/')     

def findMaterialXNodes(doc):
    """
    Find all nodes in a MaterialX document
    """
    visitedNodes = []
    treeIter = doc.traverseTree()
    for elem in treeIter:
        path = elem.getNamePath()
        if path in visitedNodes:
            continue
        visitedNodes.append(path)
    return visitedNodes

def convertMtlxToUsd(doc, emitAllValueElements):
    """
    Read in a MaterialX file and emit it to a new Usd Stage
    Dump results for display and save to usda file.

    Parameters:
    -----------
    mtlxFileName : string
        Name of file containing MaterialX document. Assumed to end in ".mtlx"
     emitAllValueElements: bool
        Emit value elements based on node definition, even if not specified on node instance.         
    """
    stage = Usd.Stage.CreateInMemory()
    
    #doc = mx.createDocument()
    #mtlxFilePath = mx.FilePath(mtlxFileName)
    #if not mtlxFilePath.exists():
    #    print('Failed to read file: ', mtlxFilePath.asString())
    #    return
    
    # Find nodes to transform before importing the definition library
    #mx.readFromXmlFile(doc, mtlxFileName)
    mxnodes = findMaterialXNodes(doc)
    stdlib = mx.createDocument()
    libFiles = []
    searchPath = mx.getDefaultDataSearchPath()
    libFiles = mx.loadLibraries(mx.getDefaultDataLibraryFolders(), searchPath, stdlib)
    doc.importLibrary(stdlib)
    
    # Translate
    emitUsdShaderGraph(doc, stage, mxnodes, emitAllValueElements)        

    #usdFile = mtlxFileName.removesuffix('.mtlx')
    #usdFile = usdFile + '.usda'
    #print('Export USD file: ', usdFile)
    #stage.Export(usdFile, False)

    stageString = stage.GetRootLayer().ExportToString()

    return stageString

