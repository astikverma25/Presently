package com.presently.attendance.keystore;

import android.content.Context;
import android.os.Build;
import android.provider.Settings;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;

import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.ECGenParameterSpec;

/**
 * Native Android Keystore Bridge for Presently Smart Attendance
 * Provides non-exportable hardware-bound key generation and cryptographic signing
 * backed by Hardware TEE (Trusted Execution Environment) and StrongBox Keymaster chips.
 */
public class AndroidKeystoreBridge {

    private static final String TAG = "AndroidKeystoreBridge";
    private static final String ANDROID_KEYSTORE_PROVIDER = "AndroidKeyStore";
    private static final String EC_CURVE = "secp256r1";
    private static final String SIGN_ALGORITHM = "SHA256withECDSA";

    private final Context context;
    private KeyStore keyStore;

    public AndroidKeystoreBridge(Context context) {
        this.context = context;
        try {
            this.keyStore = KeyStore.getInstance(ANDROID_KEYSTORE_PROVIDER);
            this.keyStore.load(null);
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize Android KeyStore instance", e);
        }
    }

    /**
     * Get unique hardware device identifier
     */
    @JavascriptInterface
    public String getDeviceId() {
        try {
            String androidId = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ANDROID_ID);
            return androidId != null ? androidId : "unknown_device";
        } catch (Exception e) {
            return "unknown_device";
        }
    }

    /**
     * Get friendly hardware device model name (e.g. "Samsung SM-S911B" or "Google Pixel 8")
     */
    @JavascriptInterface
    public String getDeviceModel() {
        String manufacturer = Build.MANUFACTURER != null ? Build.MANUFACTURER : "Android";
        if (manufacturer.length() > 0) {
            manufacturer = Character.toUpperCase(manufacturer.charAt(0)) + manufacturer.substring(1);
        }
        String model = Build.MODEL != null ? Build.MODEL : "Device";
        return manufacturer + " " + model;
    }

    /**
     * Check if Android Keystore hardware security (TEE / StrongBox) is active
     */
    @JavascriptInterface
    public boolean isHardwareBacked() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                return context.getPackageManager().hasSystemFeature("android.hardware.strongbox_keystore") ||
                       context.getPackageManager().hasSystemFeature("android.hardware.hardware_keystore");
            }
            return true;
        } catch (Exception e) {
            return true;
        }
    }

    /**
     * 1. Generate Non-Exportable Device-Bound ECDSA Key Pair in Android Keystore
     * Alias format: "PRESENTLY_KEY_<studentId>"
     * @param alias Unique key identifier
     * @param studentId Student UUID or Roll Number
     * @param challenge Cryptographic challenge string
     * @return JSON string with publicKey, deviceId, alias, deviceModel, isHardwareBacked
     */
    @JavascriptInterface
    public String generateDeviceBoundKey(String alias, String studentId, String challenge) {
        JSONObject response = new JSONObject();
        try {
            String keyAlias = (alias != null && !alias.trim().isEmpty()) ? alias : ("PRESENTLY_KEY_" + studentId);

            if (keyStore == null) {
                keyStore = KeyStore.getInstance(ANDROID_KEYSTORE_PROVIDER);
                keyStore.load(null);
            }

            // Remove existing key if already bound to ensure fresh hardware generation
            if (keyStore.containsAlias(keyAlias)) {
                keyStore.deleteEntry(keyAlias);
            }

            KeyPairGenerator keyPairGenerator = KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_EC,
                ANDROID_KEYSTORE_PROVIDER
            );

            KeyGenParameterSpec.Builder builder = new KeyGenParameterSpec.Builder(
                keyAlias,
                KeyProperties.PURPOSE_SIGN | KeyProperties.PURPOSE_VERIFY
            )
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setAlgorithmParameterSpec(new ECGenParameterSpec(EC_CURVE))
                .setUserAuthenticationRequired(false);

            // Use StrongBox Keymaster chip if available on Android 9+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                try {
                    if (context.getPackageManager().hasSystemFeature("android.hardware.strongbox_keystore")) {
                        builder.setIsStrongBoxBacked(true);
                    }
                } catch (Exception e) {
                    Log.w(TAG, "StrongBox not enabled, falling back to standard TEE: " + e.getMessage());
                }
            }

            keyPairGenerator.initialize(builder.build());
            KeyPair keyPair = keyPairGenerator.generateKeyPair();

            // Export standard X.509 Base64 Public Key
            byte[] publicKeyBytes = keyPair.getPublic().getEncoded();
            String publicKeyBase64 = Base64.encodeToString(publicKeyBytes, Base64.NO_WRAP);
            String deviceId = getDeviceId();
            String deviceModel = getDeviceModel();

            response.put("success", true);
            response.put("alias", keyAlias);
            response.put("publicKey", publicKeyBase64);
            response.put("deviceId", deviceId);
            response.put("deviceModel", deviceModel);
            response.put("isHardwareBacked", isHardwareBacked());
            response.put("boundAt", System.currentTimeMillis());

            Log.i(TAG, "Successfully generated hardware device key for alias: " + keyAlias);
        } catch (Exception e) {
            Log.e(TAG, "Failed to generate Keystore key", e);
            try {
                response.put("success", false);
                response.put("message", e.getLocalizedMessage() != null ? e.getLocalizedMessage() : "Failed to generate Android Keystore key.");
            } catch (Exception ignored) {}
        }
        return response.toString();
    }

    /**
     * 2. Sign Challenge with Hardware Private Key (Subsequent Login / Attendance Verification)
     * @param alias Key alias
     * @param challenge Raw challenge or payload string to sign
     * @return JSON string with signature, alias, deviceId
     */
    @JavascriptInterface
    public String signChallenge(String alias, String challenge) {
        JSONObject response = new JSONObject();
        try {
            if (keyStore == null) {
                keyStore = KeyStore.getInstance(ANDROID_KEYSTORE_PROVIDER);
                keyStore.load(null);
            }

            if (!keyStore.containsAlias(alias)) {
                response.put("success", false);
                response.put("message", "Hardware key alias '" + alias + "' not found in Android Keystore.");
                return response.toString();
            }

            KeyStore.PrivateKeyEntry entry = (KeyStore.PrivateKeyEntry) keyStore.getEntry(alias, null);
            if (entry == null) {
                response.put("success", false);
                response.put("message", "Unable to retrieve private key entry from Keystore.");
                return response.toString();
            }

            PrivateKey privateKey = entry.getPrivateKey();
            Signature signatureInstance = Signature.getInstance(SIGN_ALGORITHM);
            signatureInstance.initSign(privateKey);
            signatureInstance.update(challenge.getBytes(StandardCharsets.UTF_8));

            byte[] signatureBytes = signatureInstance.sign();
            String signatureBase64 = Base64.encodeToString(signatureBytes, Base64.NO_WRAP);

            response.put("success", true);
            response.put("alias", alias);
            response.put("signature", signatureBase64);
            response.put("challenge", challenge);
            response.put("deviceId", getDeviceId());

            Log.i(TAG, "Successfully signed challenge for alias: " + alias);
        } catch (Exception e) {
            Log.e(TAG, "Failed to sign challenge with Keystore", e);
            try {
                response.put("success", false);
                response.put("message", e.getLocalizedMessage() != null ? e.getLocalizedMessage() : "Failed to sign with Android Keystore.");
            } catch (Exception ignored) {}
        }
        return response.toString();
    }
}
