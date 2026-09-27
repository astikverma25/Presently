package com.presently.attendance;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.presently.attendance.keystore.AndroidKeystoreBridge;
import com.presently.attendance.keystore.AndroidKeystorePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AndroidKeystorePlugin.class);
        super.onCreate(savedInstanceState);
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                AndroidKeystoreBridge keystoreBridge = new AndroidKeystoreBridge(this);
                this.bridge.getWebView().addJavascriptInterface(keystoreBridge, "AndroidKeystore");
            }
        } catch (Exception ignored) {}
    }
}
