package com.presently.attendance.keystore;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Official Capacitor Plugin for Hardware-Backed Android Keystore
 * Exposes device-bound key generation and ECDSA signing to JavaScript runtime
 */
@CapacitorPlugin(name = "AndroidKeystore")
public class AndroidKeystorePlugin extends Plugin {

    private AndroidKeystoreBridge keystoreBridge;

    @Override
    public void load() {
        super.load();
        this.keystoreBridge = new AndroidKeystoreBridge(getContext());
    }

    @PluginMethod
    public void getDeviceId(PluginCall call) {
        if (keystoreBridge == null) {
            keystoreBridge = new AndroidKeystoreBridge(getContext());
        }
        JSObject ret = new JSObject();
        ret.put("deviceId", keystoreBridge.getDeviceId());
        call.resolve(ret);
    }

    @PluginMethod
    public void getDeviceModel(PluginCall call) {
        if (keystoreBridge == null) {
            keystoreBridge = new AndroidKeystoreBridge(getContext());
        }
        JSObject ret = new JSObject();
        ret.put("deviceModel", keystoreBridge.getDeviceModel());
        call.resolve(ret);
    }

    @PluginMethod
    public void isHardwareBacked(PluginCall call) {
        if (keystoreBridge == null) {
            keystoreBridge = new AndroidKeystoreBridge(getContext());
        }
        JSObject ret = new JSObject();
        ret.put("isHardwareBacked", keystoreBridge.isHardwareBacked());
        call.resolve(ret);
    }

    @PluginMethod
    public void generateDeviceBoundKey(PluginCall call) {
        if (keystoreBridge == null) {
            keystoreBridge = new AndroidKeystoreBridge(getContext());
        }

        String alias = call.getString("alias", "");
        String studentId = call.getString("studentId", "");
        String challenge = call.getString("challenge", "");

        try {
            String rawJson = keystoreBridge.generateDeviceBoundKey(alias, studentId, challenge);
            org.json.JSONObject obj = new org.json.JSONObject(rawJson);
            JSObject ret = JSObject.fromJSONObject(obj);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getLocalizedMessage() != null ? e.getLocalizedMessage() : "Failed to generate Keystore key", e);
        }
    }

    @PluginMethod
    public void signChallenge(PluginCall call) {
        if (keystoreBridge == null) {
            keystoreBridge = new AndroidKeystoreBridge(getContext());
        }

        String alias = call.getString("alias", "");
        String challenge = call.getString("challenge", "");

        try {
            String rawJson = keystoreBridge.signChallenge(alias, challenge);
            org.json.JSONObject obj = new org.json.JSONObject(rawJson);
            JSObject ret = JSObject.fromJSONObject(obj);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getLocalizedMessage() != null ? e.getLocalizedMessage() : "Failed to sign challenge", e);
        }
    }
}
