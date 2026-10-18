package cl.reparto.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(RepartoNativePlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
