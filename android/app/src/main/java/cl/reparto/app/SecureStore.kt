package cl.reparto.app

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.io.IOException
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Session and queue stay encrypted with an app-specific Android Keystore key. */
internal class SecureStore(context: Context) {
    private val prefs = context.getSharedPreferences("reparto.secure.v1", Context.MODE_PRIVATE)

    private fun key(): SecretKey {
        val keys = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        if (keys.containsAlias(ALIAS)) return keys.getKey(ALIAS, null) as SecretKey
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
            init(KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
            generateKey()
        }
    }

    fun get(name: String): String? = synchronized(LOCK) {
        val saved = prefs.getString(name, null) ?: return@synchronized null
        try {
            val parts = saved.split(":", limit = 2)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)))
            String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8)
        } catch (_: Exception) {
            prefs.edit().remove(name).commit()
            null
        }
    }

    fun put(name: String, value: String?) = synchronized(LOCK) {
        val edit = prefs.edit()
        if (value == null) {
            if (!edit.remove(name).commit()) throw IOException("No se pudo guardar en el dispositivo")
        } else {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, key())
            val encoded = Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" +
                Base64.encodeToString(cipher.doFinal(value.toByteArray(Charsets.UTF_8)), Base64.NO_WRAP)
            if (!edit.putString(name, encoded).commit()) throw IOException("No se pudo guardar en el dispositivo")
        }
    }

    companion object {
        val LOCK = Any()
        private const val ALIAS = "reparto.device.v1"
    }
}
