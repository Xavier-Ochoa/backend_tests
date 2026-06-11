/**
 * Tests de integración — Registro
 * POST /api/auth/registro
 *
 * Prueba el endpoint real contra la BD de test.
 */

import request from 'supertest';
import { conectarBD, desconectarBD } from '../../dbHelper.js';
import Estudiante from '../../../src/models/Estudiante.js';
import app from '../../../src/server.js';

// ── CONEXIÓN A BD DE TEST ─────────────────────────────────────────────────────

beforeAll(async () => {
  await conectarBD();
});

// ── LIMPIEZA ENTRE TESTS ──────────────────────────────────────────────────────

afterEach(async () => {
  await Estudiante.deleteMany({ email: /\.test@epn\.edu\.ec$/ });
});

// ── CIERRE DE BD ──────────────────────────────────────────────────────────────

afterAll(async () => {
  await desconectarBD();
});

// ── BODY BASE ─────────────────────────────────────────────────────────────────

const bodyValido = {
  nombre:              'María',
  apellido:            'Torres',
  cedula:              '1723456789',
  correoInstitucional: 'maria.test@epn.edu.ec',
  contraseña:          'Clave456@',
  rol:                 'estudiante',
};

// ── TESTS ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/registro', () => {

  // ── CAMPOS OBLIGATORIOS ────────────────────────────────────────────────────

  it('retorna 400 si falta el nombre', async () => {
    const { nombre, ...sinNombre } = bodyValido;
    const res = await request(app).post('/api/auth/registro').send(sinNombre);
    expect(res.status).toBe(400);
  });

  it('retorna 400 si falta el apellido', async () => {
    const { apellido, ...sinApellido } = bodyValido;
    const res = await request(app).post('/api/auth/registro').send(sinApellido);
    expect(res.status).toBe(400);
  });

  it('retorna 400 si falta la cédula', async () => {
    const { cedula, ...sinCedula } = bodyValido;
    const res = await request(app).post('/api/auth/registro').send(sinCedula);
    expect(res.status).toBe(400);
  });

  it('retorna 400 si falta el correo institucional', async () => {
    const { correoInstitucional, ...sinCorreo } = bodyValido;
    const res = await request(app).post('/api/auth/registro').send(sinCorreo);
    expect(res.status).toBe(400);
  });

  it('retorna 400 si falta la contraseña', async () => {
    const { contraseña, ...sinPassword } = bodyValido;
    const res = await request(app).post('/api/auth/registro').send(sinPassword);
    expect(res.status).toBe(400);
  });

  // ── VALIDACIONES DE CORREO ─────────────────────────────────────────────────

  it('retorna 400 si el correo no es @epn.edu.ec', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ ...bodyValido, correoInstitucional: 'maria@gmail.com' });

    expect(res.status).toBe(400);

    const errores = res.body.errors || res.body.errores || [];
    const hayErrorCorreo = errores.some(e =>
      (e.msg || e.mensaje || '').includes('@epn.edu.ec')
    );
    expect(hayErrorCorreo).toBe(true);
  });

  it('retorna 400 si el correo ya está registrado', async () => {
    await request(app).post('/api/auth/registro').send(bodyValido);

    const res = await request(app)
      .post('/api/auth/registro')
      .send({ ...bodyValido, cedula: '1798765432' });

    expect(res.status).toBe(400);
  });

  // ── VALIDACIONES DE CÉDULA ─────────────────────────────────────────────────

  it('retorna 400 si la cédula tiene menos de 10 dígitos', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ ...bodyValido, cedula: '12345' });

    expect(res.status).toBe(400);
  });

  it('retorna 400 si la cédula tiene letras', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ ...bodyValido, cedula: 'AB12345678' });

    expect(res.status).toBe(400);
  });

  // ── VALIDACIONES DE CONTRASEÑA ─────────────────────────────────────────────

  it('retorna 400 si la contraseña no tiene mayúsculas', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ ...bodyValido, contraseña: 'clave456@' });

    expect(res.status).toBe(400);
  });

  it('retorna 400 si la contraseña no tiene símbolos', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ ...bodyValido, contraseña: 'Clave4567' });

    expect(res.status).toBe(400);
  });

  it('retorna 400 si la contraseña tiene menos de 8 caracteres', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ ...bodyValido, contraseña: 'Cl@1' });

    expect(res.status).toBe(400);
  });

  // ── ROL ───────────────────────────────────────────────────────────────────

  it('asigna rol estudiante por defecto si no se envía rol', async () => {
    const { rol, ...sinRol } = bodyValido;
    const res = await request(app).post('/api/auth/registro').send(sinRol);

    expect(res.status).toBe(201);

    const usuario = await Estudiante.findOne({ email: 'maria.test@epn.edu.ec' });
    expect(usuario.rol).toBe('estudiante');
  });

  it('no permite registrarse con rol admin', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ ...bodyValido, rol: 'admin' });

    if (res.status === 201) {
      const usuario = await Estudiante.findOne({ email: 'maria.test@epn.edu.ec' });
      expect(usuario.rol).not.toBe('admin');
    } else {
      expect(res.status).toBe(400);
    }
  });

  // ── CASO FELIZ ────────────────────────────────────────────────────────────

  it('retorna 201 y crea el usuario correctamente', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send(bodyValido);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
    expect(res.body.data.correoInstitucional).toBe('maria.test@epn.edu.ec');
  });

  it('la cuenta queda con confirmEmail en false al registrarse', async () => {
    await request(app).post('/api/auth/registro').send(bodyValido);

    const usuario = await Estudiante.findOne({ email: 'maria.test@epn.edu.ec' })
      .select('+confirmEmail');
    expect(usuario.confirmEmail).toBe(false);
  });

  it('la respuesta NO incluye el campo password ni token', async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send(bodyValido);

    expect(res.status).toBe(201);
    expect(res.body.data.password).toBeUndefined();
    expect(res.body.data.token).toBeUndefined();
  });

  it('acepta el alias email en lugar de correoInstitucional', async () => {
    const { correoInstitucional, ...resto } = bodyValido;
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ ...resto, email: 'maria.test@epn.edu.ec' });

    expect(res.status).toBe(201);
  });

  it('acepta el alias password en lugar de contraseña', async () => {
    const { contraseña, ...resto } = bodyValido;
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ ...resto, password: 'Clave456@' });

    expect(res.status).toBe(201);
  });

});