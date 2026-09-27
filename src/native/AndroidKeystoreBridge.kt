package com.presently.attendance.keystore

import android.content.Context
import android.os.Build
import android.provider.Settings
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyInfo
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import android.webkit.JavascriptInterface
import org.json.JSONObject
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.PrivateKey
import java.security.Signature
import java.security.spec.ECGenParameterSpec

/**
 * Native Android Keystore Bridge for Presently Smart Attendance
 * Provides non-exportable hardware-bound key generation and cryptographic signing
 * backed by Hardware TEE (Trusted Execution Environment) and StrongBox Keymaster chips.
 */
class AndroidKeystoreBridge(private val context: Context) {

    companion object {
        private const val TAG = "AndroidKeystoreBridge"
        private const val ANDROID_KEYSTORE_PROVIDER = "AndroidKeyStore"
        private const val EC_CURVE = "secp256r1"
        private const val SIGN_ALGORITHM = "SHA256withECDSA"
    }

    private val keyStore: KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE_PROVIDER).apply {
        load(null)
    }

    @JavascriptInterface
    fun getDeviceId(): String {
        return Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown_device"
    }

    @JavascriptInterface
    fun getDeviceModel(): String {
        val manufacturer = Build.MANUFACTURER.replaceFirstChar { it.uppercase() }
        val model = Build.MODEL
        return "$manufacturer $model"
    }

    @JavascriptInterface
    fun isHardwareBacked(): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                context.packageManager.hasSystemFeature("android.hardware.strongbox_keystore") ||
                context.packageManager.hasSystemFeature("android.hardware.hardware_keystore")
            } else {
                true
            }
        } catch (e: Exception) {
            true
        }
    }

    @JavascriptInterface
    fun generateDeviceBoundKey(alias: String, studentId: String, challenge: String?): String {
        val response = JSONObject()
        try {
            val keyAlias = if (alias.isNotBlank()) alias else "PRESENTLY_KEY_$studentId"

            if (keyStore.containsAlias(keyAlias)) {
                keyStore.deleteEntry(keyAlias)
            }

            val keyPairGenerator = KeyPairGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_EC,
                ANDROID_KEYSTORE_PROVIDER
            )

            val builder = KeyGenParameterSpec.Builder(
                keyAlias,
                KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
            )
                .setDigests(KeyProperties.DIGEST_SHA256)
                .setAlgorithmParameterSpec(ECGenParameterSpec(EC_CURVE))
                .setUserAuthenticationRequired(false)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                try {
                    if (context.packageManager.hasSystemFeature("android.hardware.strongbox_keystore")) {
                        builder.setIsStrongBoxBacked(true)
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "StrongBox not enabled, falling back to standard TEE: ${e.message}")
                }
            }

            keyPairGenerator.initialize(builder.build())
            val keyPair = keyPairGenerator.generateKeyPair()

            val publicKeyBytes = keyPair.public.encoded
            val publicKeyBase64 = Base64.encodeToString(publicKeyBytes, Base64.NO_WRAP)
            val deviceId = getDeviceId()
            val deviceModel = getDeviceModel()

            response.put("success", true)
            response.put("alias", keyAlias)
            response.put("publicKey", publicKeyBase64)
            response.put("deviceId", deviceId)
            response.put("deviceModel", deviceModel)
            response.put("isHardwareBacked", isHardwareBacked())
            response.put("boundAt", System.currentTimeMillis())

            Log.i(TAG, "Successfully generated hardware device key for alias: $keyAlias")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to generate Keystore key", e)
            response.put("success", false)
            response.put("message", e.localizedMessage ?: "Failed to generate Android Keystore key.")
        }
        return response.toString()
    }

    @JavascriptInterface
    fun signChallenge(alias: String, challenge: String): String {
        val response = JSONObject()
        try {
            if (!keyStore.containsAlias(alias)) {
                response.put("success", false)
                response.put("message", "Hardware key alias '$alias' not found in Android Keystore.")
                return response.toString()
            }

            val entry = keyStore.getEntry(alias, null) as? KeyStore.PrivateKeyEntry
            if (entry == null) {
                response.put("success", false)
                response.put("message", "Unable to retrieve private key entry from Keystore.")
                return response.toString()
            }

            val signatureInstance = Signature.getInstance(SIGN_ALGORITHM).apply {
                initSign(entry.privateKey)
                update(challenge.toByteArray(Charsets.UTF_8))
            }

            val signatureBytes = signatureInstance.sign()
            val signatureBase64 = Base64.encodeToString(signatureBytes, Base64.NO_WRAP)

            response.put("success", true)
            response.put("alias", alias)
            response.put("signature", signatureBase64)
            response.put("challenge", challenge)
            response.put("deviceId", getDeviceId())

            Log.i(TAG, "Successfully signed challenge for alias: $alias")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to sign challenge with Keystore", e)
            response.put("success", false)
            response.put("message", e.localizedMessage ?: "Failed to sign with Android Keystore.")
        }
        return response.toString()
    }
}
