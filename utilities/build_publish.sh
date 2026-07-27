pushd .
echo "Start building and publishing converter package"
cd flask/converters
rm -rf dist/ build/ *.egg-info
py -m build
twine check dist/*
#twine upload dist/*
echo "End building and publishing converter package"
cd ../..
echo "Start building and publishing gpuopen package"
cd flask/gpuopen
rm -rf dist/ build/ *.egg-info
py -m build
twine check dist/*
#twine upload dist/*
echo "End building and publishing gpuopen package"