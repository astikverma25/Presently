$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
npm run cap:sync
cd d:\Attendence\android
.\gradlew.bat assembleDebug


⚡ Future One-Click Build Command
Whenever you make frontend changes in the future, build the updated APK in one step: