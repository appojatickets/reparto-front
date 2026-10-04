import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { Marco, RutaProtegida } from './componentes/estructura';
import { PaginaClienteNuevo } from './paginas/PaginaClienteNuevo';
import { PaginaClientes } from './paginas/PaginaClientes';
import { PaginaImportar } from './paginas/PaginaImportar';
import { PaginaInicio } from './paginas/PaginaInicio';
import { PaginaLocal } from './paginas/PaginaLocal';
import { PaginaLogin } from './paginas/PaginaLogin';
import { PaginaPines } from './paginas/PaginaPines';
import { PaginaUsuarios } from './paginas/PaginaUsuarios';
import { AvisoServidorDespertando } from './despertando';
import { ProveedorSesion } from './sesion';

/** Rutas de la aplicación. Cada una declara la acción que exige; la API vuelve a comprobar el permiso. */
export const Aplicacion = () => (
  <BrowserRouter>
    <ProveedorSesion>
      <AvisoServidorDespertando />
      <Routes>
        <Route path="/entrar" element={<PaginaLogin />} />
        <Route element={<RutaProtegida><Marco /></RutaProtegida>}>
          <Route index element={<PaginaInicio />} />
          <Route path="clientes" element={<RutaProtegida accion="buscar-clientes"><PaginaClientes /></RutaProtegida>} />
          <Route path="clientes/nuevo" element={<RutaProtegida accion="cliente-nuevo"><PaginaClienteNuevo /></RutaProtegida>} />
          <Route path="clientes/:id" element={<RutaProtegida accion="buscar-clientes"><PaginaLocal /></RutaProtegida>} />
          <Route path="pines" element={<RutaProtegida accion="revisar-pines"><PaginaPines /></RutaProtegida>} />
          <Route path="admin/importar" element={<RutaProtegida accion="importar-clientes"><PaginaImportar /></RutaProtegida>} />
          <Route path="admin/usuarios" element={<RutaProtegida accion="usuarios"><PaginaUsuarios /></RutaProtegida>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ProveedorSesion>
  </BrowserRouter>
);
