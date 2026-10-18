package cl.reparto.app;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state) {
        registerPlugin(RepartoNativePlugin.class);
        super.onCreate(state);
    }
}
