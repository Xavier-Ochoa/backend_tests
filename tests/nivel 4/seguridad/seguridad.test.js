/**
 * Tests de seguridad — Nivel 4
 *
 * Cubre los 4 casos críticos de seguridad:
 *
 * 1. Token en blacklist rechazado después del logout
 * 2. Estudiante NO puede aprobar su propio proyecto
 * 3. Usuario NO puede editar/eliminar el proyecto de otro
 * 4. Sin token no se puede crear un proyecto
 *
 * Además prueba:
 * - Admin no puede cambiar su propio rol
 * - Admin no puede cambiar su propio estado
 * - Token manipulado/inválido es rechazado
 * - Estudiante no puede acceder a rutas de admin
 */

import request from 'supertest';
import { conectarBD, desconectarBD } from '../../dbHelper.js';
import Proyecto from '../../../src/models/Proyecto.js';
import Estudiante from '../../../src/models/Estudiante.js';
import TokenBlacklist from '../../../src/models/TokenBlacklist.js';
import app from '../../../src/server.js';
import { crearEstudiante, crearAdmin, bodyProyectoValido } from '../../helpers.js';

// ─── Setup ────────────────────────────────────────────────────────────────────
let estudianteA;      // dueño del proyecto — su token NO debe invalidarse nunca
let estudianteB;      // intruso
let admin;
let estudianteCaso1;  // usuario dedicado exclusivamente al test de logout del CASO 1
let proyectoId;       // proyecto creado por estudianteA y aprobado

beforeAll(async () => {
  await conectarBD();
  estudianteA    = await crearEstudiante();
  estudianteB    = await crearEstudiante();
  admin          = await crearAdmin();
  // estudianteCaso1 es un usuario independiente. Si se usara estudianteA aquí,
  // el JWT generado por login podría ser idéntico al de estudianteA.token (mismo
  // id + mismo segundo = mismo iat = mismo string firmado). Al hacer logout ese
  // token se mete en la blacklist e invalida estudianteA.token también.
  estudianteCaso1 = await crearEstudiante();

  // Crear y aprobar un proyecto de estudianteA para usarlo en las pruebas
  const resProyecto = await request(app)
    .post('/api/proyectos')
    .set('Authorization', `Bearer ${estudianteA.token}`)
    .send(bodyProyectoValido);

  proyectoId = resProyecto.body.data._id;

  await request(app)
    .put(`/api/admin/proyectos/${proyectoId}/aprobar`)
    .set('Authorization', `Bearer ${admin.token}`);
});

// FIX 3: desconectar DESPUÉS de limpiar la BD, no antes.
// El orden anterior llamaba desconectarBD() primero, dejando la conexión
// cerrada cuando los deleteMany intentaban ejecutarse.
afterAll(async () => {
  await Proyecto.deleteMany({});
  await TokenBlacklist.deleteMany({});
  await Estudiante.deleteMany({ email: /\.test@epn\.edu\.ec$/ });
  await desconectarBD();
});
// ─────────────────────────────────────────────────────────────────────────────


// ══════════════════════════════════════════════════════════════════════════════
// CASO 1 — Token en blacklist rechazado después del logout
// ══════════════════════════════════════════════════════════════════════════════
describe('SEGURIDAD 1 — Token en blacklist después del logout', () => {

  // estudianteCaso1 es un usuario distinto a estudianteA. Aunque se use login
  // para obtener tokenParaInvalidar, el JWT es para un id diferente, por lo que
  // el logout no puede colisionar con estudianteA.token.
  let tokenParaInvalidar;

  it('hace login y obtiene un token válido', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        correoInstitucional: estudianteCaso1.usuario.email,
        contraseña:          'Clave456@',
      });

    expect(res.status).toBe(200);
    tokenParaInvalidar = res.body.token;
    expect(tokenParaInvalidar).toBeDefined();
  });

  it('el token funciona correctamente antes del logout', async () => {
    const res = await request(app)
      .get('/api/auth/perfil')
      .set('Authorization', `Bearer ${tokenParaInvalidar}`);

    expect(res.status).toBe(200);
  });

  it('hace logout y el token queda en la blacklist', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${tokenParaInvalidar}`);

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe('Sesión cerrada correctamente');

    // Verificar que el token quedó en la blacklist en BD
    const enBlacklist = await TokenBlacklist.findOne({ token: tokenParaInvalidar });
    expect(enBlacklist).not.toBeNull();
  });

  it('el mismo token es rechazado después del logout', async () => {
    const res = await request(app)
      .get('/api/auth/perfil')
      .set('Authorization', `Bearer ${tokenParaInvalidar}`);

    expect(res.status).toBe(401);
    expect(res.body.msg).toContain('Sesión cerrada');
  });

  it('el token rechazado tampoco puede crear proyectos', async () => {
    const res = await request(app)
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${tokenParaInvalidar}`)
      .send(bodyProyectoValido);

    expect(res.status).toBe(401);
  });

  it('hacer doble logout con el mismo token retorna 200 sin error', async () => {
    // El controlador maneja el duplicado con código 11000
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${tokenParaInvalidar}`);

    // Debe retornar 200 o 401 (token ya en blacklist), nunca 500
    expect([200, 401]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });

});


// ══════════════════════════════════════════════════════════════════════════════
// CASO 2 — Estudiante NO puede aprobar su propio proyecto
// ══════════════════════════════════════════════════════════════════════════════
describe('SEGURIDAD 2 — Estudiante no puede aprobar proyectos', () => {

  it('retorna 403 si un estudiante intenta aprobar su propio proyecto', async () => {
    const res = await request(app)
      .put(`/api/admin/proyectos/${proyectoId}/aprobar`)
      .set('Authorization', `Bearer ${estudianteA.token}`);

    expect(res.status).toBe(403);
  });

  it('retorna 403 si un estudiante intenta aprobar el proyecto de otro', async () => {
    const res = await request(app)
      .put(`/api/admin/proyectos/${proyectoId}/aprobar`)
      .set('Authorization', `Bearer ${estudianteB.token}`);

    expect(res.status).toBe(403);
  });

  it('retorna 403 si un estudiante intenta rechazar un proyecto', async () => {
    const res = await request(app)
      .put(`/api/admin/proyectos/${proyectoId}/rechazar`)
      .set('Authorization', `Bearer ${estudianteA.token}`)
      .send({ motivo: 'Intento de rechazo no autorizado' });

    expect(res.status).toBe(403);
  });

  it('retorna 403 si un estudiante intenta listar proyectos del panel admin', async () => {
    const res = await request(app)
      .get('/api/admin/proyectos')
      .set('Authorization', `Bearer ${estudianteA.token}`);

    expect(res.status).toBe(403);
  });

  it('retorna 403 si un estudiante intenta listar todos los usuarios', async () => {
    const res = await request(app)
      .get('/api/admin/estudiantes')
      .set('Authorization', `Bearer ${estudianteA.token}`);

    expect(res.status).toBe(403);
  });

  it('retorna 403 si un estudiante intenta cambiar el estado de otro usuario', async () => {
    const res = await request(app)
      .patch(`/api/admin/estudiantes/${estudianteB.userId}/estado`)
      .set('Authorization', `Bearer ${estudianteA.token}`)
      .send({ estado: 'inactivo' });

    expect(res.status).toBe(403);
  });

  it('retorna 403 si un estudiante intenta cambiar el rol de otro usuario', async () => {
    const res = await request(app)
      .patch(`/api/auth/usuarios/${estudianteB.userId}/rol`)
      .set('Authorization', `Bearer ${estudianteA.token}`)
      .send({ rol: 'admin' });

    expect(res.status).toBe(403);
  });

});


// ══════════════════════════════════════════════════════════════════════════════
// CASO 3 — Usuario NO puede editar ni eliminar el proyecto de otro
// ══════════════════════════════════════════════════════════════════════════════
describe('SEGURIDAD 3 — Protección de propiedad del proyecto', () => {

  it('estudianteB no puede editar el proyecto de estudianteA', async () => {
    const res = await request(app)
      .put(`/api/proyectos/${proyectoId}`)
      .set('Authorization', `Bearer ${estudianteB.token}`)
      .send({ titulo: 'Título robado por estudianteB' });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('permiso');
  });

  it('el título del proyecto NO cambió tras el intento fallido', async () => {
    const proyecto = await Proyecto.findById(proyectoId);
    expect(proyecto.titulo).toBe(bodyProyectoValido.titulo);
  });

  it('estudianteB no puede eliminar el proyecto de estudianteA', async () => {
    // FIX 2: crear el proyecto con estudianteA.token (que sigue válido porque
    // el logout del CASO 1 usó un token obtenido con login, no estudianteA.token).
    // También se omite enviarAlAdmin: false porque el campo no afecta la creación
    // pero asegura que res.body.data exista con _id.
    const resNuevo = await request(app)
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${estudianteA.token}`)
      .send({ ...bodyProyectoValido, titulo: 'Proyecto eliminable' });

    expect(resNuevo.status).toBe(201);
    const idEliminable = resNuevo.body.data._id;

    const res = await request(app)
      .delete(`/api/proyectos/${idEliminable}`)
      .set('Authorization', `Bearer ${estudianteB.token}`);

    expect(res.status).toBe(403);

    // El proyecto sigue existiendo
    const proyecto = await Proyecto.findById(idEliminable);
    expect(proyecto).not.toBeNull();
  });

  it('estudianteB no puede publicar el proyecto de estudianteA', async () => {
    const res = await request(app)
      .put(`/api/proyectos/${proyectoId}/publicar`)
      .set('Authorization', `Bearer ${estudianteB.token}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('autor');
  });

  it('estudianteA sí puede editar su propio proyecto', async () => {
    // El proyecto debe crearse con enviarAlAdmin: false para que quede en el
    // camino editable según validarEditable: !enviarAlAdmin + pendiente → ✅
    // Con enviarAlAdmin: true (default de bodyProyectoValido) + pendiente → ❌
    const resNuevo = await request(app)
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${estudianteA.token}`)
      .send({ ...bodyProyectoValido, titulo: 'Proyecto editable', enviarAlAdmin: false });

    expect(resNuevo.status).toBe(201);
    const idEditable = resNuevo.body.data._id;

    const res = await request(app)
      .put(`/api/proyectos/${idEditable}`)
      .set('Authorization', `Bearer ${estudianteA.token}`)
      .send({ descripcion: 'Descripción actualizada por el autor.' });

    expect(res.status).toBe(200);
  });

});


// ══════════════════════════════════════════════════════════════════════════════
// CASO 4 — Sin token no se puede crear ni modificar nada
// ══════════════════════════════════════════════════════════════════════════════
describe('SEGURIDAD 4 — Rutas protegidas sin token', () => {

  it('POST /api/proyectos sin token retorna 401', async () => {
    const res = await request(app)
      .post('/api/proyectos')
      .send(bodyProyectoValido);

    expect(res.status).toBe(401);
  });

  it('PUT /api/proyectos/:id sin token retorna 401', async () => {
    const res = await request(app)
      .put(`/api/proyectos/${proyectoId}`)
      .send({ titulo: 'Intento sin token' });

    expect(res.status).toBe(401);
  });

  it('DELETE /api/proyectos/:id sin token retorna 401', async () => {
    const res = await request(app)
      .delete(`/api/proyectos/${proyectoId}`);

    expect(res.status).toBe(401);
  });

  it('GET /api/auth/perfil sin token retorna 401', async () => {
    const res = await request(app)
      .get('/api/auth/perfil');

    expect(res.status).toBe(401);
  });

  it('PUT /api/auth/password sin token retorna 401', async () => {
    const res = await request(app)
      .put('/api/auth/password')
      .send({
        passwordactual:    'Clave456@',
        passwordnuevo:     'Nueva@123',
        confirmarPassword: 'Nueva@123',
      });

    expect(res.status).toBe(401);
  });

  it('GET /api/dashboard/usuario sin token retorna 401', async () => {
    const res = await request(app)
      .get('/api/dashboard/usuario');

    expect(res.status).toBe(401);
  });

  it('GET /api/admin/proyectos sin token retorna 401', async () => {
    const res = await request(app)
      .get('/api/admin/proyectos');

    expect(res.status).toBe(401);
  });

  it('GET /api/proyectos SÍ funciona sin token (ruta pública)', async () => {
    const res = await request(app)
      .get('/api/proyectos');

    expect(res.status).toBe(200);
  });

});


// ══════════════════════════════════════════════════════════════════════════════
// CASO 5 — Token manipulado o inválido
// ══════════════════════════════════════════════════════════════════════════════
describe('SEGURIDAD 5 — Tokens inválidos o manipulados', () => {

  it('token completamente falso retorna 401', async () => {
    const res = await request(app)
      .get('/api/auth/perfil')
      .set('Authorization', 'Bearer esto.no.es.un.token.real');

    expect(res.status).toBe(401);
  });

  it('token con firma alterada retorna 401', async () => {
    // Tomar un token válido y cambiar el último carácter de la firma
    const tokenValido = estudianteB.token;
    const tokenManipulado = tokenValido.slice(0, -3) + 'xyz';

    const res = await request(app)
      .get('/api/auth/perfil')
      .set('Authorization', `Bearer ${tokenManipulado}`);

    expect(res.status).toBe(401);
  });

  it('header Authorization sin "Bearer" retorna 401', async () => {
    const res = await request(app)
      .get('/api/auth/perfil')
      .set('Authorization', estudianteB.token); // sin "Bearer "

    expect(res.status).toBe(401);
  });

  it('header Authorization vacío retorna 401', async () => {
    const res = await request(app)
      .get('/api/auth/perfil')
      .set('Authorization', '');

    expect(res.status).toBe(401);
  });

});


// ══════════════════════════════════════════════════════════════════════════════
// CASO 6 — Admin no puede hacerse daño a sí mismo
// ══════════════════════════════════════════════════════════════════════════════
describe('SEGURIDAD 6 — Admin no puede modificarse a sí mismo', () => {

  it('admin no puede cambiar su propio rol', async () => {
    const res = await request(app)
      .patch(`/api/auth/usuarios/${admin.userId}/rol`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ rol: 'estudiante' });

    expect(res.status).toBe(403);
  });

  it('admin no puede cambiar su propio estado a inactivo', async () => {
    const res = await request(app)
      .patch(`/api/admin/estudiantes/${admin.userId}/estado`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ estado: 'inactivo' });

    expect(res.status).toBe(400);
  });

  it('el rol del admin sigue siendo admin después de los intentos', async () => {
    const adminEnBD = await Estudiante.findById(admin.userId).select('+estado');
    expect(adminEnBD.rol).toBe('admin');
    expect(adminEnBD.estado).toBe('activo');
  });

});