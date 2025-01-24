# Script to build all NodeJS  applications in the repository
echo "Start building NodeJS applications"
pushd .
cd nodejs
for d in */ ; do
    echo "------------- Building $d ------------"
    cd $d
    npm install --silent
    cd ..
done
echo "End building NodeJS applications"
popd


