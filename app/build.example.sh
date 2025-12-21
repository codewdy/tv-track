APPPATH=/path/to/app
VERSION=`uuidgen`
git pull
sed -i "s/^config.ts$/# config.ts/g" .gitignore
sed -i "s/VERSION: '.*'/VERSION: '$VERSION'/g" config.ts
eas build -p android --profile production --local
mv *.apk $APPPATH/release.apk
echo $VERSION > $APPPATH/version.txt
sed -i "s/^# config.ts$/config.ts/g" .gitignore