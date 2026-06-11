/**
 * Tests — validarCambiarPassword
 *
 * No necesita base de datos ni servidor.
 * Solo simula el body de la request y verifica que los errores salgan correctos.
 */

import { validationResult } from 'express-validator';
import { validarCambiarPassword } from '../../../src/validators/auth_validators.js';

// ─── Helper ───────────────────────────────────────────────────────────────────
// Simula una request con el body que le pasemos y corre todos los validators
const correrValidadores = async (body) => {
  const req = { body };
  for (const validator of validarCambiarPassword) {
    await validator.run(req);
  }
  return validationResult(req);
};
// ─────────────────────────────────────────────────────────────────────────────

describe('validarCambiarPassword', () => {

  // ── CASOS QUE DEBEN FALLAR ─────────────────────────────────────────────────

  it('falla si no se envía passwordactual', async () => {
    const resultado = await correrValidadores({
      passwordnuevo:     'NuevaPass@123',
      confirmarPassword: 'NuevaPass@123',
    });

    expect(resultado.isEmpty()).toBe(false);

    // El error debe estar en el campo 'passwordactual', NO en 'confirmarPassword'
    // Este es el bug que encontramos — si falla aquí el bug sigue presente
    const error = resultado.array().find(e => e.msg === 'La contraseña actual es obligatoria');
    expect(error).toBeDefined();
    expect(error.path).toBe('passwordactual');
  });

  it('falla si no se envía passwordnuevo ni contraseñaNueva', async () => {
    const resultado = await correrValidadores({
      passwordactual:    'ClaveActual@1',
      confirmarPassword: 'NuevaPass@123',
    });

    expect(resultado.isEmpty()).toBe(false);
    const error = resultado.array().find(e => e.msg === 'La nueva contraseña es obligatoria');
    expect(error).toBeDefined();
  });

  it('falla si passwordnuevo y confirmarPassword no coinciden', async () => {
    const resultado = await correrValidadores({
      passwordactual:    'ClaveActual@1',
      passwordnuevo:     'NuevaPass@123',
      confirmarPassword: 'OtraClave@456',
    });

    expect(resultado.isEmpty()).toBe(false);
    const error = resultado.array().find(e => e.msg === 'Las contraseñas no coinciden');
    expect(error).toBeDefined();
  });

  it('falla si passwordnuevo no tiene mayúsculas', async () => {
    const resultado = await correrValidadores({
      passwordactual:    'ClaveActual@1',
      passwordnuevo:     'nuevapass@123',
      confirmarPassword: 'nuevapass@123',
    });

    expect(resultado.isEmpty()).toBe(false);
    const error = resultado.array().find(e => e.msg === 'La contraseña debe contener al menos una letra mayúscula');
    expect(error).toBeDefined();
  });

  it('falla si passwordnuevo no tiene símbolos', async () => {
    const resultado = await correrValidadores({
      passwordactual:    'ClaveActual@1',
      passwordnuevo:     'NuevaPass123',
      confirmarPassword: 'NuevaPass123',
    });

    expect(resultado.isEmpty()).toBe(false);
    const error = resultado.array().find(e => e.msg === 'La contraseña debe contener al menos un símbolo (ej: @, #, !)');
    expect(error).toBeDefined();
  });

  it('falla si passwordnuevo tiene menos de 8 caracteres', async () => {
    const resultado = await correrValidadores({
      passwordactual:    'ClaveActual@1',
      passwordnuevo:     'Abc@1',
      confirmarPassword: 'Abc@1',
    });

    expect(resultado.isEmpty()).toBe(false);
    const error = resultado.array().find(e => e.msg === 'La contraseña debe tener entre 8 y 64 caracteres');
    expect(error).toBeDefined();
  });

  it('falla si no se envía confirmarPassword', async () => {
    const resultado = await correrValidadores({
      passwordactual: 'ClaveActual@1',
      passwordnuevo:  'NuevaPass@123',
    });

    expect(resultado.isEmpty()).toBe(false);
    const error = resultado.array().find(e => e.msg === 'Debes confirmar la nueva contraseña');
    expect(error).toBeDefined();
  });

  it('falla si se envía el body completamente vacío', async () => {
    const resultado = await correrValidadores({});
    expect(resultado.isEmpty()).toBe(false);
  });

  // ── CASOS QUE DEBEN PASAR ──────────────────────────────────────────────────

  it('pasa con todos los campos correctos usando passwordactual', async () => {
    const resultado = await correrValidadores({
      passwordactual:    'ClaveActual@1',
      passwordnuevo:     'NuevaPass@123',
      confirmarPassword: 'NuevaPass@123',
    });

    expect(resultado.isEmpty()).toBe(true);
  });

  it('pasa usando el alias contraseñaActual en lugar de passwordactual', async () => {
    const resultado = await correrValidadores({
      contraseñaActual:  'ClaveActual@1',
      passwordnuevo:     'NuevaPass@123',
      confirmarPassword: 'NuevaPass@123',
    });

    expect(resultado.isEmpty()).toBe(true);
  });

  it('pasa usando el alias contraseñaNueva en lugar de passwordnuevo', async () => {
    const resultado = await correrValidadores({
      passwordactual:    'ClaveActual@1',
      contraseñaNueva:   'NuevaPass@123',
      confirmarPassword: 'NuevaPass@123',
    });

    expect(resultado.isEmpty()).toBe(true);
  });

});
