package cl.reparto.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RequestBodyPolicyTest {
    @Test fun emptyJsonActionsHaveAnExplicitObject() {
        for (method in listOf("POST", "PUT", "PATCH")) {
            assertEquals("{}", RequestBodyPolicy.payload(method, null))
            assertEquals("{}", RequestBodyPolicy.payload(method, ""))
        }
    }
    @Test fun existingJsonIsPreservedAndReadsDoNotGetBodies() {
        assertEquals("{\"puntos\":[]}", RequestBodyPolicy.payload("POST", "{\"puntos\":[]}"))
        assertNull(RequestBodyPolicy.payload("GET", "{}"))
        assertNull(RequestBodyPolicy.payload("HEAD", null))
        assertNull(RequestBodyPolicy.payload("DELETE", ""))
    }
}
