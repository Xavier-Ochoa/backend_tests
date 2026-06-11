/**
 * Tests — validarRegistro (Nivel 1)
 *
 * Usa MongoDB en memoria — sin jest.mock().
 * Los tests de "ya registrado" insertan un usuario real antes de correr.
 */

import { validationResult } from 'express-validator';
import { validarRegistro } from '../../../src/validators/auth_validators.js';
import Estudiante from '../../../src/models/Estudiante.js';
import { conectarBD, desconectarBD, limpiarBD } from '../../dbHelper.js';

// ─── Conexión BD en memoria ───────────────────────────────────────────────────
beforeAll(conectarBD);
afterAll(desconectarBD);
afterEach(limpiarBD); // limpia entre cada test
// ─────────────────────────────────────────────────────────────────────────────

const correrValidadores = async (body) => {
  const req = { body };
  for (const validator of validarRegistro) {
    await validator.run(req);
  }
  return validationResult(req);
};

describe('validarRegistro', () => {

  // ── CORREO INSTITUCIONAL ───────────────────────────────────────────────────

  it('falla si el correo no es @epn.edu.ec', async () => {
    const resultado = await correrValidadores({
      nombre: 'Juan', apellido: 'Pérez', cedula: '1716236641',
      correoInstitucional: 'juan@gmail.com', contraseña: 'Clave456@',
    });
    expect(resultado.isEmpty()).toBe(false);
    const error = resultado.array().find(e => e.msg === 'El correo debe ser institucional (@epn.edu.ec)');
    expect(error).toBeDefined();
  });

  it('falla si el correo no es válido', async () => {
    const resultado = await correrValidadores({
      nombre: 'Juan', apellido: 'Pérez', cedula: '1716236641',
      correoInstitucional: 'esto-no-es-un-correo', contraseña: 'Clave456@',
    });
    expect(resultado.isEmpty()).toBe(false);
    const error = resultado.array().find(e => e.msg === 'Debe ser un correo válido');
    expect(error).toBeDefined();
  });

  it('falla si el correo ya está registrado', async () => {
    // Insertar usuario real en BD en memoria
    await Estudiante.create({
      nombre: 'Existente', apellido: 'Usuario', cedula: '9999999999',
      email: 'juan@epn.edu.ec', password: 'hash', rol: 'estudiante',
    });

    const resultado = await correrValidadores({
      nombre: 'Juan', apellido: 'Pérez', cedula: '1716236641',
      correoInstitucional: 'juan@epn.edu.ec', contraseña: 'Clave456@',
    });
    expect(resultado.isEmpty()).toBe(false);
    const error = resultado.array().find(e => e.msg === 'Este correo ya está registrado');
    expect(error).toBeDefined();
  });

  it('acepta el alias email en lugar de correoInstitucional', async () => {
    const resultado = await correrValidadores({
      nombre: 'Juan', apellido: 'Pérez', cedula: '1716236641',
      email: 'juan@epn.edu.ec', contraseña: 'Clave456@',
    });
    const errorCorreo = resultado.array().find(e => e.msg === 'El correo debe ser institucional (@epn.edu.ec)');
    expect(errorCorreo).toBeUndefined();
  });

  // ── CÉDULA ────────────────────────────────────────────────────────────────

  it('falla si la cédula tiene menos de 10 dígitos', async () => {
    const resultado = await correrValidadores({
      nombre: 'Juan', apellido: 'Pérez', cedula: '12345',
      correoInstitucional: 'juan@epn.edu.ec', contraseña: 'Clave456@',
    });
    expect(resultado.isEmpty()).toBe(false);
    const error = resultado.array().find(e => e.msg === 'La cédula debe tener exactamente 10 dígitos numéricos');
    expect(error).toBeDefined();
  });

  it('falla si la cédula tiene letras', async () => {
    const resultado = await correrValidadores({
      nombre: 'Juan', apellido: 'Pérez', cedula: 'AB12345678',
      correoInstitucional: 'juan@epn.edu.ec', contraseña: 'Clave456@',
    });
    expect(resultado.isEmpty()).toBe(false);
    const error = resultado.array().find(e => e.msg === 'La cédula debe tener exactamente 10 dígitos numéricos');
    expect(error).toBeDefined();
  });

  it('falla si la cédula ya está registrada', async () => {
    // Insertar usuario con esa cédula
    await Estudiante.create({
      nombre: 'Existente', apellido: 'Usuario', cedula: '1716236641',
      email: 'otro@epn.edu.ec', password: 'hash', rol: 'estudiante',
    });

    const resultado = await correrValidadores({
      nombre: 'Juan', apellido: 'Pérez', cedula: '1716236641',
      correoInstitucional: 'juan@epn.edu.ec', contraseña: 'Clave456@',
    });
    expect(resultado.isEmpty()).toBe(false);
    const error = resultado.array().find(e => e.msg === 'Esta cédula ya está registrada');
    expect(error).toBeDefined();
  });

  // ── CONTRASEÑA ────────────────────────────────────────────────────────────

  it('falla si la contraseña no tiene mayúsculas', async () => {
    const resultado = await correrValidadores({
      nombre: 'Juan', apellido: 'Pérez', cedula: '1716236641',
      correoInstitucional: 'juan@epn.edu.ec', contraseña: 'clave456@',
    });
    expect(resultado.isEmpty()).toBe(false);
    const error = resultado.array().find(e => e.msg === 'La contraseña debe contener al menos una letra mayúscula');
    expect(error).toBeDefined();
  });

  it('falla si la contraseña no tiene símbolos', async () => {
    const resultado = await correrValidadores({
      nombre: 'Juan', apellido: 'Pérez', cedula: '1716236641',
      correoInstitucional: 'juan@epn.edu.ec', contraseña: 'Clave4567',
    });
    expect(resultado.isEmpty()).toBe(false);
    const error = resultado.array().find(e => e.msg === 'La contraseña debe contener al menos un símbolo (ej: @, #, !)');
    expect(error).toBeDefined();
  });

  it('acepta el alias password en lugar de contraseña', async () => {
    const resultado = await correrValidadores({
      nombre: 'Juan', apellido: 'Pérez', cedula: '1716236641',
      correoInstitucional: 'juan@epn.edu.ec', password: 'Clave456@',
    });
    const errorPassword = resultado.array().find(e => e.msg === 'La contraseña es obligatoria');
    expect(errorPassword).toBeUndefined();
  });

  // ── ROL ───────────────────────────────────────────────────────────────────

  it('falla si el rol no es estudiante ni docente', async () => {
    const resultado = await correrValidadores({
      nombre: 'Juan', apellido: 'Pérez', cedula: '1716236641',
      correoInstitucional: 'juan@epn.edu.ec', contraseña: 'Clave456@', rol: 'admin',
    });
    expect(resultado.isEmpty()).toBe(false);
    const error = resultado.array().find(e => e.msg === 'El rol debe ser "estudiante" o "docente"');
    expect(error).toBeDefined();
  });

  // ── CASO FELIZ ────────────────────────────────────────────────────────────

  it('pasa con todos los campos correctos', async () => {
    const resultado = await correrValidadores({
      nombre: 'Juan', apellido: 'Pérez', cedula: '1716236641',
      correoInstitucional: 'juan@epn.edu.ec', contraseña: 'Clave456@', rol: 'estudiante',
    });
    expect(resultado.isEmpty()).toBe(true);
  });

});
