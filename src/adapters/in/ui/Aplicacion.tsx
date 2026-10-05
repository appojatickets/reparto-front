import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Marco, RutaProtegida } from './componentes/estructura';
import { PaginaCamiones } from './paginas/PaginaCamiones';
import { PaginaVendedores } from './paginas/PaginaVendedores';
import { PaginaConfiguracion } from './paginas/PaginaConfiguracion';
import { PaginaCargar } from './paginas/PaginaCargar';
import { PaginaClienteNuevo } from './paginas/PaginaClienteNuevo';
import { PaginaClientes } from './paginas/PaginaClientes';
import { PaginaFacturas } from './paginas/PaginaFacturas';
import { PaginaImportar } from './paginas/PaginaImportar';
import { PaginaInicio } from './paginas/PaginaInicio';
import { PaginaLocal } from './paginas/PaginaLocal';
import { PaginaLogin } from './paginas/PaginaLogin';
import { PaginaMiRuta } from './paginas/PaginaMiRuta';
import { PaginaPines } from './paginas/PaginaPines';
import { PaginaRutas } from './paginas/PaginaRutas';
import { PaginaUsuarios } from './paginas/PaginaUsuarios';
import { AvisoServidorDespertando } from './despertando';
import { ProveedorSesion } from './sesion';
import { ProveedorTema } from './tema';
import { ProveedorVista } from './vista';

/** Rutas de la aplicación. Cada una declara la acción que exige; la API vuelve a comprobar el permiso. */
export const Aplicacion = () => (
  <ProveedorTema>
  <ProveedorVista>
    <BrowserRouter>
      <ProveedorSesion>
        <AvisoServidorDespertando />
        <Routes>
          <Route path="/entrar" element={<PaginaLogin />} />
          <Route element={<RutaProtegida><Marco /></RutaProtegida>}>
            <Route index element={<PaginaInicio />} />
            <Route path="cargar" element={<RutaProtegida accion="cargar-facturas"><PaginaCargar /></RutaProtegida>} />
            <Route path="mi-ruta" element={<RutaProtegida accion="mi-ruta"><PaginaMiRuta /></RutaProtegida>} />
            <Route path="facturas" element={<RutaProtegida accion="facturas"><PaginaFacturas /></RutaProtegida>} />
            <Route path="rutas" element={<RutaProtegida accion="rutas"><PaginaRutas /></RutaProtegida>} />
            <Route path="clientes" element={<RutaProtegida accion="buscar-clientes"><PaginaClientes /></RutaProtegida>} />
            <Route path="clientes/nuevo" element={<RutaProtegida accion="cliente-nuevo"><PaginaClienteNuevo /></RutaProtegida>} />
            <Route path="clientes/:id" element={<RutaProtegida accion="buscar-clientes"><PaginaLocal /></RutaProtegida>} />
            <Route path="pines" element={<RutaProtegida accion="revisar-pines"><PaginaPines /></RutaProtegida>} />
            <Route path="admin/importar" element={<RutaProtegida accion="importar-clientes"><PaginaImportar /></RutaProtegida>} />
            <Route path="admin/configuracion" element={<RutaProtegida accion="configuracion"><PaginaConfiguracion /></RutaProtegida>} />
            <Route path="admin/camiones" element={<RutaProtegida accion="camiones"><PaginaCamiones /></RutaProtegida>} />
            <Route path="admin/vendedores" element={<RutaProtegida accion="vendedores"><PaginaVendedores /></RutaProtegida>} />
            <Route path="admin/usuarios" element={<RutaProtegida accion="usuarios"><PaginaUsuarios /></RutaProtegida>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ProveedorSesion>
    </BrowserRouter>
  </ProveedorVista>
  </ProveedorTema>
);
