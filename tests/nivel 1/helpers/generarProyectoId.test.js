/**
 * Tests — generarProyectoId y siguienteVersion (Nivel 1)
 *
 * Usa MongoDB en memoria — sin jest.mock().
 * Inserta documentos reales de Proyecto para simular IDs existentes.
 */

import { generarProyectoId, siguienteVersion } from '../../../src/helpers/generarProyectoId.js';
import Proyecto from '../../../src/models/Proyecto.js';
import Estudiante from '../../../src/models/Estudiante.js';
import { conectarBD, desconectarBD, limpiarBD } from '../../dbHelper.js';

beforeAll(conectarBD);
afterAll(desconectarBD);
afterEach(limpiarBD);

const AÑO_ACTUAL = new Date().getFullYear().toString();

// ─── Helper: crea un proyecto mínimo en BD para simular IDs existentes ────────
const crearProyectoFake = async (proyecto_id, carrera = 'Desarrollo de Software') => {
  let autor = await Estudiante.findOne({ email: 'fake@epn.edu.ec' });
  if (!autor) {
    autor = await Estudiante.create({
      nombre: 'Fake', apellido: 'Autor', cedula: '0000000001',
      email: 'fake@epn.edu.ec', password: 'hash', rol: 'estudiante',
    });
  }
  return Proyecto.create({
    proyecto_id,
    titulo:       'Proyecto fake',
    descripcion:  'Para tests',
    categoria:    'academico',
    carrera,
    autor:        autor._id,
    version:      '001',
    fechaInicio:  new Date('2024-01-01'),   // ← línea agregada
  });
};
// ─────────────────────────────────────────────────────────────────────────────

describe('generarProyectoId', () => {

  // ── FORMATO ───────────────────────────────────────────────────────────────

  it('genera ID con formato PREFIJO-AÑO-SECUENCIAL para Desarrollo de Software', async () => {
    const id = await generarProyectoId('Desarrollo de Software');
    expect(id).toMatch(/^TSDS-\d{4}-\d{3}$/);
  });

  it('usa el prefijo correcto para cada carrera', async () => {
    const casos = [
      { carrera: 'Agua y Saneamiento Ambiental',          prefijo: 'TSASA' },
      { carrera: 'Desarrollo de Software',                prefijo: 'TSDS'  },
      { carrera: 'Electromecánica',                       prefijo: 'TSEM'  },
      { carrera: 'Redes y Telecomunicaciones',            prefijo: 'TSRT'  },
      { carrera: 'Procesamiento de Alimentos',            prefijo: 'TSIA'  },
      { carrera: 'Procesamiento Industrial de la Madera', prefijo: 'TSPIM' },
    ];
    for (const { carrera, prefijo } of casos) {
      const id = await generarProyectoId(carrera);
      expect(id.startsWith(`${prefijo}-${AÑO_ACTUAL}-`)).toBe(true);
    }
  });

  // ── PRIMER PROYECTO ───────────────────────────────────────────────────────

  it('genera el secuencial 001 si no hay proyectos este año', async () => {
    const id = await generarProyectoId('Desarrollo de Software');
    expect(id).toBe(`TSDS-${AÑO_ACTUAL}-001`);
  });

  it('el secuencial siempre tiene 3 dígitos con ceros a la izquierda', async () => {
    const id = await generarProyectoId('Desarrollo de Software');
    const secuencial = id.split('-')[2];
    expect(secuencial).toHaveLength(3);
    expect(secuencial).toBe('001');
  });

  // ── INCREMENTO ────────────────────────────────────────────────────────────

  it('incrementa el secuencial al máximo existente + 1', async () => {
    // Simular que ya existen 5 proyectos este año
    await crearProyectoFake(`TSDS-${AÑO_ACTUAL}-001`);
    await crearProyectoFake(`TSDS-${AÑO_ACTUAL}-002`);
    await crearProyectoFake(`TSDS-${AÑO_ACTUAL}-003`);
    await crearProyectoFake(`TSDS-${AÑO_ACTUAL}-004`);
    await crearProyectoFake(`TSDS-${AÑO_ACTUAL}-005`);

    const id = await generarProyectoId('Desarrollo de Software');
    expect(id).toBe(`TSDS-${AÑO_ACTUAL}-006`);
  });

  // ── CARRERA INVÁLIDA ──────────────────────────────────────────────────────

  it('lanza error si la carrera no está reconocida', async () => {
    await expect(
      generarProyectoId('Carrera Inventada')
    ).rejects.toThrow();
  });

});

// ─────────────────────────────────────────────────────────────────────────────

describe('siguienteVersion', () => {

  it('retorna 002 si la última versión es 001', async () => {
    await crearProyectoFake(`TSDS-${AÑO_ACTUAL}-001`);
    const version = await siguienteVersion(`TSDS-${AÑO_ACTUAL}-001`);
    expect(version).toBe('002');
  });

  it('retorna 001 si no existe ninguna versión previa', async () => {
    const version = await siguienteVersion(`TSDS-${AÑO_ACTUAL}-099`);
    expect(version).toBe('001');
  });

  it('la versión siempre tiene 3 dígitos', async () => {
    await crearProyectoFake(`TSDS-${AÑO_ACTUAL}-001`);
    const version = await siguienteVersion(`TSDS-${AÑO_ACTUAL}-001`);
    expect(version).toHaveLength(3);
  });

});
