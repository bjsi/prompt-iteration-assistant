rm -rf dist 

tsc
npm publish --dry-run

if [ ! -f dist/index.js ]
then
    echo
    echo "Build did not successfully generate dist/index.js"
    exit 1
fi

npm publish --dry-run 2>&1 >/dev/null | grep "package size" | grep -q "MB"
if [ $? -eq 0 ]
then
    echo
    echo "BUILD FAILED: npm package is too large."
    echo "Check if all files above should be published and if so adjust the limit."
    exit 1
fi

expectedFiles=42
actualFiles=$(npm publish --dry-run 2>&1 >/dev/null | grep "total files:" | awk '{print $NF}')

if [ $actualFiles -ne $expectedFiles ]
then
    echo
    echo "BUILD FAILED: npm package contains an unexpected number of files."
    echo "Expected: $expectedFiles"
    echo "Actual: $actualFiles"
    echo "Check if all files above should be published and if so adjust the expected file number."
    exit 1
fi

