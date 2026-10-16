"""Configura orientação, tela cheia e recursos vetoriais do Android."""
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1] / 'android'
manifest = root / 'app/src/main/AndroidManifest.xml'
s = manifest.read_text()
if 'android:screenOrientation=' not in s:
    s = s.replace('<activity', '<activity android:screenOrientation="landscape"', 1)
manifest.write_text(s)
res = root / 'app/src/main/res'
# Substitui as imagens padrão por recursos vetoriais do próprio jogo.
for p in res.rglob('*.png'):
    p.unlink()
vector = '''<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
    <path android:fillColor="#101322" android:pathData="M0,0h108v108h-108z"/>
    <path android:fillColor="#BAFF53" android:pathData="M27,38h11v32h-11zM70,38h11v32h-11zM20,44h7v20h-7zM81,44h7v20h-7z"/>
    <path android:fillColor="#F3F6FF" android:pathData="M38,50h32v8h-32z"/>
    <path android:fillColor="#FF647D" android:pathData="M48,25h17l-9,12h8l-20,20l8,-17h-10z"/>
</vector>
'''
(res/'drawable').mkdir(exist_ok=True)
(res/'drawable/ic_launcher_foreground.xml').write_text(vector)
for name in ['ic_launcher', 'ic_launcher_round']:
    adaptive = res/f'mipmap-anydpi-v26/{name}.xml'
    adaptive.parent.mkdir(exist_ok=True)
    adaptive.write_text('''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/splash_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
''')
(res/'drawable/splash.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_background"/>
    <item android:drawable="@drawable/ic_launcher_foreground" android:gravity="center" android:width="160dp" android:height="160dp"/>
</layer-list>
''')
(res/'mipmap').mkdir(exist_ok=True)
for name in ['ic_launcher', 'ic_launcher_round']:
    (res/f'mipmap/{name}.xml').write_text(vector)
colors = res/'values/colors.xml'
s = colors.read_text() if colors.exists() else '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>'
if 'name="splash_background"' not in s:
    s = s.replace('</resources>', '    <color name="splash_background">#101322</color>\n</resources>')
colors.write_text(s)
(res/'values/styles.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="colorPrimary">#101322</item>
        <item name="colorPrimaryDark">#101322</item>
        <item name="colorAccent">#BAFF53</item>
        <item name="android:windowLightStatusBar">false</item>
        <item name="android:statusBarColor">#101322</item>
        <item name="android:navigationBarColor">#101322</item>
    </style>
    <style name="AppTheme.NoActionBar" parent="AppTheme">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">@null</item>
    </style>
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="windowSplashScreenBackground">@color/splash_background</item>
        <item name="windowSplashScreenAnimatedIcon">@drawable/ic_launcher_foreground</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
        <item name="android:background">@drawable/splash</item>
    </style>
</resources>
''')
activity = root/'app/src/main/java/com/fugadolegday/app/MainActivity.java'
activity.write_text('''package com.fugadolegday.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
''')
print('Android configurado: paisagem, tela cheia, ícone e splash.')
