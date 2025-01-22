# Script to build all Flask applications in the repository
echo "Start building Flask applications"
pushd .
cd flask
for d in */ ; do
    if [ $d == "template/" ]; then
        echo "- Skip building template application"
        continue
    fi    
    echo "------------- Building $d ------------"
    cd $d
    pip install . -q
    cd ..
done
echo "\n------------- Check package dependencies -------------"
pip check
echo "End building Flask applications"
popd


