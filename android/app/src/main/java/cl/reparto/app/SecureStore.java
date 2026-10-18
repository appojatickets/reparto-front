package cl.reparto.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.GeneralSecurityException;
import java.io.IOException;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Session and GPS queue encrypted using an app-specific Android Keystore key. */
final class SecureStore {
    static final Object LOCK = new Object();
    private static final String ALIAS = "reparto.device.v1";
    private final SharedPreferences prefs;
    SecureStore(Context context) { prefs = context.getSharedPreferences("reparto.secure.v1", Context.MODE_PRIVATE); }
    private SecretKey key() throws GeneralSecurityException, IOException {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore"); ks.load(null);
        if (!ks.containsAlias(ALIAS)) {
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
            return generator.generateKey();
        }
        return (SecretKey) ks.getKey(ALIAS, null);
    }
    String get(String name) {
        synchronized (LOCK) {
            String saved = prefs.getString(name, null);
            if (saved == null) return null;
            try {
                String[] parts = saved.split(":", 2);
                Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
                return new String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8);
            } catch (Exception failure) { prefs.edit().remove(name).commit(); return null; }
        }
    }
    void put(String name, String value) throws GeneralSecurityException, IOException {
        synchronized (LOCK) {
            if (value == null) { prefs.edit().remove(name).commit(); return; }
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key());
            String encoded = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + ":" + Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
            if (!prefs.edit().putString(name, encoded).commit()) throw new IOException("No se pudo guardar en el dispositivo");
        }
    }
}
