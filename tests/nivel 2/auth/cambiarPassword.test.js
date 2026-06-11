/**
 * Tests de integración — Cambiar Contraseña
 * PUT /api/auth/password
 *
 * Este test cubre el bug exacto que encontramos:
 * el error de "contraseña actual obligatoria" debe aparecer
 * bajo el campo 'passwordactual', no bajo 'confirmarPassword'.
 */

import request from 'supertest';
import { conectarBD, desconectarBD } from '../../dbHelper.js';
import Estudiante from '../../../src/models/Estudiante.js';
import app from '../../../src/server.js';

// ─── Setup ────────────────────────────────────────────────────────────────────
let token;
let usuarioPrueba;

beforeAll(async () => {
  await conectarBD();

  // Crear usuario activo y confirmado
  usuarioPrueba = new Estudiante({
    nombre:       'Carlos',
    apellido:     'Mendoza',
    cedula:       '1756789012',
    email:        'carlos.test@epn.edu.ec',
    rol:          'estudiante',
    confirmEmail: true,
    estado:       'activo',
  });

  usuarioPrueba.password = await usuarioPrueba.encryptPassword('ClaveActual@1');
  await usuarioPrueba.save();

  // Login para obtener token
  const res = await request(app)
    .post('/api/auth/login')
    .send({
      correoInstitucional: 'carlos.test@epn.edu.ec',
      contraseña:          'ClaveActual@1',
    });

  token = res.body.token;
});

afterAll(async () => {
  // ✅ PRIMERO limpiar la BD
  await Estudiante.deleteOne({ email: 'carlos.test@epn.edu.ec' });

  // ✅ LUEGO cerrar la conexión
  await desconectarBD();
});
// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/auth/password', () => {

  // ── SIN TOKEN ─────────────────────────────────────────────────────────────

  it('retorna 401 si no se envía token', async () => {
    const res = await request(app)
      .put('/api/auth/password')
      .send({
        passwordactual:    'ClaveActual@1',
        passwordnuevo:     'NuevaClave@2',
        confirmarPassword: 'NuevaClave@2',
      });

    expect(res.status).toBe(401);
  });

  // ── EL BUG QUE ENCONTRAMOS ────────────────────────────────────────────────

  it('BUG: el error de contraseña actual debe estar en campo passwordactual, NO en confirmarPassword', async () => {
    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        passwordnuevo:     'NuevaClave@2',
        confirmarPassword: 'NuevaClave@2',
      });

    expect(res.status).toBe(400);

    const errores = res.body.errores || res.body.errors || [];
    const errorActual = errores.find(e =>
      (e.mensaje || e.msg || '').includes('contraseña actual es obligatoria')
    );

    expect(errorActual).toBeDefined();
    expect(errorActual.campo || errorActual.path).toBe('passwordactual');
    expect(errorActual.campo || errorActual.path).not.toBe('confirmarPassword');
  });

  // ── VALIDACIONES ──────────────────────────────────────────────────────────

  it('retorna 400 si no se envía passwordnuevo', async () => {
    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        passwordactual:    'ClaveActual@1',
        confirmarPassword: 'NuevaClave@2',
      });

    expect(res.status).toBe(400);
  });

  it('retorna 400 si passwordnuevo y confirmarPassword no coinciden', async () => {
    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        passwordactual:    'ClaveActual@1',
        passwordnuevo:     'NuevaClave@2',
        confirmarPassword: 'OtraClave@3',
      });

    expect(res.status).toBe(400);
  });

  it('retorna 400 si la contraseña actual es incorrecta', async () => {
    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        passwordactual:    'ClaveEquivocada@9',
        passwordnuevo:     'NuevaClave@2',
        confirmarPassword: 'NuevaClave@2',
      });

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe('La contraseña actual no es correcta');
  });

  // ── CASO FELIZ ────────────────────────────────────────────────────────────

  it('retorna 200 y cambia la contraseña correctamente', async () => {
    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        passwordactual:    'ClaveActual@1',
        passwordnuevo:     'NuevaClave@2',
        confirmarPassword: 'NuevaClave@2',
      });

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe('Contraseña actualizada correctamente');
  });

  it('la contraseña vieja ya no funciona', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        correoInstitucional: 'carlos.test@epn.edu.ec',
        contraseña:          'ClaveActual@1',
      });

    expect(res.status).toBe(401);
  });

  it('la contraseña nueva sí funciona', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        correoInstitucional: 'carlos.test@epn.edu.ec',
        contraseña:          'NuevaClave@2',
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

});