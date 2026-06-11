/**
 * Tests de integración — Login
 * POST /api/auth/login
 *
 * Prueba el endpoint real contra una BD de test.
 * Antes de correr estos tests asegúrate de tener el .env.test configurado.
 */

import request from 'supertest';
import { conectarBD, desconectarBD } from '../../dbHelper.js';
import app from '../../../src/server.js';
import Estudiante from '../../../src/models/Estudiante.js';

// ─── Setup y Teardown ─────────────────────────────────────────────────────────
let usuarioPrueba;

beforeAll(async () => {
  await conectarBD();

  // Usuario base para los tests
  usuarioPrueba = new Estudiante({
    nombre:       'Juan',
    apellido:     'Pérez',
    cedula:       '1716236641',
    email:        'juan.test@epn.edu.ec',
    rol:          'estudiante',
    confirmEmail: true,
    estado:       'activo',
  });

  usuarioPrueba.password = await usuarioPrueba.encryptPassword('Clave456@');
  await usuarioPrueba.save();
});

afterAll(async () => {
  // ✅ PRIMERO borrar datos
  await Estudiante.deleteMany({ email: /\.test@epn\.edu\.ec$/ });

  // ✅ LUEGO desconectar
  await desconectarBD();
});
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {

  it('retorna 400 si no se envía correo ni contraseña', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.msg).toBeDefined();
  });

  it('retorna 400 si falta la contraseña', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ correoInstitucional: 'juan.test@epn.edu.ec' });

    expect(res.status).toBe(400);
  });

  it('retorna 404 si el correo no está registrado', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        correoInstitucional: 'noexiste@epn.edu.ec',
        contraseña:          'Clave456@',
      });

    expect(res.status).toBe(404);
    expect(res.body.msg).toBe('El usuario no se encuentra registrado');
  });

  it('retorna 401 si la contraseña es incorrecta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        correoInstitucional: 'juan.test@epn.edu.ec',
        contraseña:          'ClaveIncorrecta@1',
      });

    expect(res.status).toBe(401);
    expect(res.body.msg).toBe('La contraseña no es correcta');
  });

  it('retorna 403 si el email no está confirmado', async () => {
    const sinConfirmar = new Estudiante({
      nombre:       'Pedro',
      apellido:     'López',
      cedula:       '1234567890',
      email:        'pedro.test@epn.edu.ec',
      rol:          'estudiante',
      confirmEmail: false,
      estado:       'activo',
    });

    sinConfirmar.password = await sinConfirmar.encryptPassword('Clave456@');
    await sinConfirmar.save();

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        correoInstitucional: 'pedro.test@epn.edu.ec',
        contraseña:          'Clave456@',
      });

    expect(res.status).toBe(403);
    expect(res.body.msg).toContain('confirmar tu correo');
  });

  it('retorna 403 si la cuenta está inactiva', async () => {
    const inactivo = new Estudiante({
      nombre:       'Ana',
      apellido:     'García',
      cedula:       '0987654321',
      email:        'ana.test@epn.edu.ec',
      rol:          'estudiante',
      confirmEmail: true,
      estado:       'inactivo',
    });

    inactivo.password = await inactivo.encryptPassword('Clave456@');
    await inactivo.save();

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        correoInstitucional: 'ana.test@epn.edu.ec',
        contraseña:          'Clave456@',
      });

    expect(res.status).toBe(403);
    expect(res.body.msg).toContain('suspendida');
  });

  it('retorna 200 con token y datos del usuario', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        correoInstitucional: 'juan.test@epn.edu.ec',
        contraseña:          'Clave456@',
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.nombre).toBe('Juan');
    expect(res.body.rol).toBe('estudiante');
  });

  it('la respuesta NO incluye el campo password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        correoInstitucional: 'juan.test@epn.edu.ec',
        contraseña:          'Clave456@',
      });

    expect(res.body.password).toBeUndefined();
  });

  it('acepta el alias email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email:      'juan.test@epn.edu.ec',
        contraseña: 'Clave456@',
      });

    expect(res.status).toBe(200);
  });

  it('acepta el alias password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        correoInstitucional: 'juan.test@epn.edu.ec',
        password:            'Clave456@',
      });

    expect(res.status).toBe(200);
  });

});