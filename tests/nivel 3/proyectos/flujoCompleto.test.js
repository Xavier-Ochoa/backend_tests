/**
 * Tests de integración — Flujo completo de proyectos
 *
 * Prueba el ciclo de vida completo de un proyecto:
 *
 *   Estudiante crea proyecto (pendiente)
 *        ↓
 *   Admin lo aprueba (aprobado)
 *        ↓
 *   Estudiante lo publica (publico = true)
 *        ↓
 *   Aparece en la landing pública
 *
 * También prueba los flujos alternativos:
 * - Admin rechaza → estudiante edita → re-envía al admin
 * - Proyecto no se puede publicar si no está aprobado
 */

import request from 'supertest';
import { conectarBD, desconectarBD } from '../../dbHelper.js';
import Proyecto from '../../../src/models/Proyecto.js';
import Estudiante from '../../../src/models/Estudiante.js';
import app from '../../../src/server.js';
import { crearEstudiante, crearAdmin, bodyProyectoValido } from '../../helpers.js';

// ─── Setup y Teardown ─────────────────────────────────────────────────────────
let estudiante;   // { token, userId }
let admin;        // { token, userId }
let proyectoId;   // se llena al crear el proyecto

beforeAll(async () => {
  await conectarBD();
  estudiante = await crearEstudiante();
  admin      = await crearAdmin();
});

afterAll(async () => {
  await Proyecto.deleteMany({});
  await Estudiante.deleteMany({ email: /\.test@epn\.edu\.ec$/ });
  await desconectarBD();
});
// ─────────────────────────────────────────────────────────────────────────────


// ══════════════════════════════════════════════════════════════════════════════
// PASO 1 — CREAR PROYECTO
// ══════════════════════════════════════════════════════════════════════════════
describe('PASO 1 — Crear proyecto', () => {

  it('retorna 401 si no hay token', async () => {
    const res = await request(app)
      .post('/api/proyectos')
      .send(bodyProyectoValido);

    expect(res.status).toBe(401);
  });

  it('retorna 400 si falta el título', async () => {
    const { titulo, ...sinTitulo } = bodyProyectoValido;
    const res = await request(app)
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${estudiante.token}`)
      .send(sinTitulo);

    expect(res.status).toBe(400);
  });

  it('retorna 400 si falta la descripción', async () => {
    const { descripcion, ...sinDesc } = bodyProyectoValido;
    const res = await request(app)
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${estudiante.token}`)
      .send(sinDesc);

    expect(res.status).toBe(400);
  });

  it('retorna 400 si la carrera no es válida', async () => {
    const res = await request(app)
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${estudiante.token}`)
      .send({ ...bodyProyectoValido, carrera: 'Carrera Inventada' });

    expect(res.status).toBe(400);
  });

  it('crea el proyecto correctamente y retorna 201', async () => {
    const res = await request(app)
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${estudiante.token}`)
      .send(bodyProyectoValido);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();

    // Guardar el ID para los siguientes pasos
    proyectoId = res.body.data._id;
  });

  it('el proyecto recién creado tiene estado pendiente', async () => {
    const proyecto = await Proyecto.findById(proyectoId);
    expect(proyecto.estado).toBe('pendiente');
  });

  it('el proyecto recién creado tiene publico en false', async () => {
    const proyecto = await Proyecto.findById(proyectoId);
    expect(proyecto.publico).toBe(false);
  });

  it('el autor del proyecto es el usuario que lo creó', async () => {
    const proyecto = await Proyecto.findById(proyectoId);
    expect(proyecto.autor.toString()).toBe(estudiante.userId);
  });

  it('el proyecto generó un proyecto_id con formato correcto', async () => {
    const proyecto = await Proyecto.findById(proyectoId);
    expect(proyecto.proyecto_id).toMatch(/^TSDS-\d{4}-\d{3}$/);
  });

  it('el proyecto NO aparece en la landing pública (aún no aprobado)', async () => {
    const res = await request(app)
      .get('/api/proyectos');

    const ids = (res.body.data || []).map(p => p._id.toString());
    expect(ids).not.toContain(proyectoId);
  });

});


// ══════════════════════════════════════════════════════════════════════════════
// PASO 2 — ADMIN APRUEBA EL PROYECTO
// ══════════════════════════════════════════════════════════════════════════════
describe('PASO 2 — Admin aprueba el proyecto', () => {

  it('retorna 401 si no hay token al intentar aprobar', async () => {
    const res = await request(app)
      .put(`/api/admin/proyectos/${proyectoId}/aprobar`);

    expect(res.status).toBe(401);
  });

  it('retorna 403 si un estudiante intenta aprobar (no es admin)', async () => {
    const res = await request(app)
      .put(`/api/admin/proyectos/${proyectoId}/aprobar`)
      .set('Authorization', `Bearer ${estudiante.token}`);

    expect(res.status).toBe(403);
  });

  it('el admin aprueba el proyecto correctamente', async () => {
    const res = await request(app)
      .put(`/api/admin/proyectos/${proyectoId}/aprobar`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.estado).toBe('aprobado');
  });

  it('después de aprobar el estado en BD es aprobado', async () => {
    const proyecto = await Proyecto.findById(proyectoId);
    expect(proyecto.estado).toBe('aprobado');
  });

  it('retorna 400 si se intenta aprobar un proyecto ya aprobado', async () => {
    const res = await request(app)
      .put(`/api/admin/proyectos/${proyectoId}/aprobar`)
      .set('Authorization', `Bearer ${admin.token}`);

    expect(res.status).toBe(400);
  });

  it('el proyecto aprobado todavía NO aparece en la landing (publico sigue en false)', async () => {
    const res = await request(app).get('/api/proyectos');
    const ids = (res.body.data || []).map(p => p._id.toString());
    expect(ids).not.toContain(proyectoId);
  });

});


// ══════════════════════════════════════════════════════════════════════════════
// PASO 3 — ESTUDIANTE PUBLICA EL PROYECTO
// ══════════════════════════════════════════════════════════════════════════════
describe('PASO 3 — Estudiante publica el proyecto', () => {

  it('retorna 401 si no hay token al intentar publicar', async () => {
    const res = await request(app)
      .put(`/api/proyectos/${proyectoId}/publicar`);

    expect(res.status).toBe(401);
  });

  it('retorna 403 si otro usuario intenta publicar el proyecto ajeno', async () => {
    const otro = await crearEstudiante();

    const res = await request(app)
      .put(`/api/proyectos/${proyectoId}/publicar`)
      .set('Authorization', `Bearer ${otro.token}`);

    expect(res.status).toBe(403);
  });

  it('el autor publica el proyecto correctamente', async () => {
    const res = await request(app)
      .put(`/api/proyectos/${proyectoId}/publicar`)
      .set('Authorization', `Bearer ${estudiante.token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.publico).toBe(true);
  });

  it('después de publicar, publico en BD es true', async () => {
    const proyecto = await Proyecto.findById(proyectoId);
    expect(proyecto.publico).toBe(true);
  });

  it('retorna 400 si se intenta publicar un proyecto ya publicado', async () => {
    const res = await request(app)
      .put(`/api/proyectos/${proyectoId}/publicar`)
      .set('Authorization', `Bearer ${estudiante.token}`);

    expect(res.status).toBe(400);
  });

});


// ══════════════════════════════════════════════════════════════════════════════
// PASO 4 — APARECE EN LA LANDING PÚBLICA
// ══════════════════════════════════════════════════════════════════════════════
describe('PASO 4 — El proyecto publicado aparece en la landing', () => {

  it('aparece en GET /api/proyectos después de publicarse', async () => {
    const res = await request(app).get('/api/proyectos');

    expect(res.status).toBe(200);
    const ids = (res.body.data || []).map(p => p._id.toString());
    expect(ids).toContain(proyectoId);
  });

  it('la respuesta de la landing NO incluye campos sensibles', async () => {
    const res = await request(app).get('/api/proyectos');
    const proyecto = res.body.data.find(p => p._id.toString() === proyectoId);

    expect(proyecto).toBeDefined();
    // No debe exponer el password del autor
    expect(proyecto.autor?.password).toBeUndefined();
  });

  it('GET /api/proyectos/:id retorna el proyecto correctamente sin token', async () => {
    const res = await request(app)
      .get(`/api/proyectos/${proyectoId}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id.toString()).toBe(proyectoId);
  });

});


// ══════════════════════════════════════════════════════════════════════════════
// FLUJO ALTERNATIVO — Admin rechaza → Estudiante edita → Re-envía
// ══════════════════════════════════════════════════════════════════════════════
describe('FLUJO ALTERNATIVO — Rechazo y re-envío', () => {

  let proyectoRechazadoId;

  it('crea un segundo proyecto para probar el rechazo', async () => {
    const res = await request(app)
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${estudiante.token}`)
      .send({
        ...bodyProyectoValido,
        titulo: 'Proyecto para rechazar',
      });

    expect(res.status).toBe(201);
    proyectoRechazadoId = res.body.data._id;
  });

  it('el admin rechaza el proyecto con un motivo', async () => {
    const res = await request(app)
      .put(`/api/admin/proyectos/${proyectoRechazadoId}/rechazar`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ motivo: 'Falta documentación técnica completa.' });

    expect(res.status).toBe(200);
    expect(res.body.data.estado).toBe('rechazado');
    expect(res.body.data.motivoRechazo).toBe('Falta documentación técnica completa.');
  });

  it('el proyecto rechazado NO aparece en la landing', async () => {
    const res = await request(app).get('/api/proyectos');
    const ids = (res.body.data || []).map(p => p._id.toString());
    expect(ids).not.toContain(proyectoRechazadoId);
  });

  // FIX: el test anterior intentaba rechazar un proyecto que ya había sido
  // editado (estado = pendiente), por lo que el rechazo prosperaba y retornaba
  // 200 en vez de 400. El escenario correcto es intentar rechazar el mismo
  // proyecto inmediatamente después del primer rechazo, mientras sigue en
  // estado RECHAZADO, para verificar que el backend bloquea la operación.
  it('retorna 400 si se intenta rechazar un proyecto ya rechazado', async () => {
    const res = await request(app)
      .put(`/api/admin/proyectos/${proyectoRechazadoId}/rechazar`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ motivo: 'Segundo rechazo.' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      'El proyecto ya se encuentra rechazado y no puede volver a rechazarse'
    );
  });

  it('el estudiante puede editar el proyecto rechazado', async () => {
    const res = await request(app)
      .put(`/api/proyectos/${proyectoRechazadoId}`)
      .set('Authorization', `Bearer ${estudiante.token}`)
      .send({ descripcion: 'Descripción mejorada con toda la documentación técnica requerida.' });

    expect(res.status).toBe(200);
  });

  it('después de editar el proyecto vuelve a estado pendiente', async () => {
    const proyecto = await Proyecto.findById(proyectoRechazadoId);
    expect(proyecto.estado).toBe('pendiente');
  });

});


// ══════════════════════════════════════════════════════════════════════════════
// FLUJO ALTERNATIVO — No se puede publicar sin estar aprobado
// ══════════════════════════════════════════════════════════════════════════════
describe('FLUJO ALTERNATIVO — No publicar sin aprobación', () => {

  let proyectoPendienteId;

  it('crea un proyecto en estado pendiente', async () => {
    const res = await request(app)
      .post('/api/proyectos')
      .set('Authorization', `Bearer ${estudiante.token}`)
      .send({ ...bodyProyectoValido, titulo: 'Proyecto pendiente sin aprobar' });

    expect(res.status).toBe(201);
    proyectoPendienteId = res.body.data._id;
  });

  it('retorna 400 al intentar publicar un proyecto pendiente', async () => {
    const res = await request(app)
      .put(`/api/proyectos/${proyectoPendienteId}/publicar`)
      .set('Authorization', `Bearer ${estudiante.token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('aprobados');
  });

});