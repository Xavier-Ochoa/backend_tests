# Tests — Backend Sistema de Gestión de Proyectos Estudiantiles

Suite de pruebas automatizadas para el backend de la plataforma de gestión de proyectos de la **Escuela Politécnica Nacional**. Cubre validaciones de datos, autenticación, el ciclo de vida completo de un proyecto y seguridad de accesos.

---

## Resultado actual

```
Test Suites: 8 passed, 8 total
Tests:       134 passed, 134 total
```

---

## Requisitos previos

- Node.js 18 o superior
- El backend del proyecto configurado y funcionando localmente

> **No se necesita ninguna base de datos externa.** Los tests usan `mongodb-memory-server`, que levanta una base de datos MongoDB temporal en memoria durante la ejecución y la destruye al terminar. Todo ocurre localmente y de forma aislada, sin tocar los datos reales en ningún momento.

Asegúrate de que tu `package.json` tenga estos scripts y esta configuración de Jest:

```json
"scripts": {
  "test":          "cross-env NODE_ENV=test node --experimental-vm-modules node_modules/jest/bin/jest.js --detectOpenHandles --runInBand --forceExit",
  "test:watch":    "cross-env NODE_ENV=test node --experimental-vm-modules node_modules/jest/bin/jest.js --watch --runInBand",
  "test:coverage": "cross-env NODE_ENV=test node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage --runInBand"
},
"jest": {
  "testEnvironment": "node",
  "transform": {},
  "testMatch": ["**/tests/**/*.test.js"]
}
```

---

## Cómo ejecutar los tests

```bash
# Ejecutar todos los tests
npm test

# Ejecutar solo un nivel específico
npm test -- "nivel 1"
npm test -- "nivel 2"
npm test -- "nivel 3"
npm test -- "nivel 4"

# Ejecutar un archivo específico
npm test -- "flujoCompleto"
npm test -- "seguridad"

# Ver cobertura de código
npm run test:coverage
```

---

## Estructura de archivos

```
tests/
├── helpers.js                          # Funciones compartidas (crearEstudiante, crearAdmin...)
├── dbHelper.js                         # Conexión y desconexión de BD para tests
├── setup.js                            # Configuración global de Jest
│
├── nivel 1/                            # Pruebas unitarias (sin servidor)
│   ├── helpers/
│   │   └── generarProyectoId.test.js
│   └── validators/
│       ├── registro.test.js
│       └── cambiarPassword.test.js
│
├── nivel 2/                            # Pruebas de integración — Autenticación
│   └── auth/
│       ├── login.test.js
│       ├── registro.test.js
│       └── cambiarPassword.test.js
│
├── nivel 3/                            # Pruebas de integración — Proyectos
│   └── proyectos/
│       └── flujoCompleto.test.js
│
└── nivel 4/                            # Pruebas de seguridad
    └── seguridad/
        └── seguridad.test.js
```

---

## Qué verifica cada nivel

### Nivel 1 · Validaciones y lógica interna `(33 pruebas)`

Pruebas unitarias que no necesitan servidor ni base de datos activa. Verifican que las reglas de negocio funcionen correctamente de forma aislada.

**Generación de códigos de proyecto** — Comprueba que el sistema genere identificadores únicos con el formato correcto (`TSDS-2025-001`), que cada carrera use su prefijo correspondiente, que el contador incremente bien cuando ya existen proyectos y que se rechacen las carreras no reconocidas.

**Validación del formulario de registro** — Verifica que el sistema rechace correos que no sean `@epn.edu.ec`, cédulas con formato incorrecto, contraseñas débiles (sin mayúsculas, sin símbolos, menos de 8 caracteres), correos o cédulas ya registrados, y que no se pueda crear una cuenta con rol de administrador.

**Validación del cambio de contraseña** — Comprueba que se detecten todos los errores posibles: campo vacío, contraseñas que no coinciden, contraseña nueva que no cumple los requisitos de seguridad, y que los errores aparezcan en el campo correcto del formulario.

---

### Nivel 2 · Autenticación en tiempo real `(32 pruebas)`

Pruebas de integración que levantan el servidor completo y se conectan a una base de datos real de test.

**Inicio de sesión** — Verifica los distintos escenarios: correo no registrado, contraseña incorrecta, cuenta no confirmada, cuenta suspendida, y que un login exitoso entregue un token válido sin exponer la contraseña en la respuesta.

**Registro de cuenta nueva** — Prueba que falten campos obligatorios, que se rechacen datos inválidos, que no se pueda registrar un correo ya existente, y que al crear la cuenta correctamente el usuario quede pendiente de confirmar su correo.

**Cambio de contraseña** — Verifica el flujo completo: que no funcione sin token, que detecte la contraseña actual incorrecta, y que después del cambio exitoso la contraseña anterior deje de funcionar y la nueva sí funcione.

---

### Nivel 3 · Ciclo de vida de un proyecto `(31 pruebas)`

Prueba el recorrido completo de un proyecto desde su creación hasta su publicación pública, incluyendo los flujos alternativos de rechazo.

**Flujo principal:**

```
Estudiante crea proyecto  →  Admin lo aprueba  →  Estudiante lo publica  →  Aparece en la plataforma
     (pendiente)                 (aprobado)            (público: true)           (visible para todos)
```

Cada paso verifica que solo las personas autorizadas puedan ejecutar cada acción, que el estado del proyecto cambie correctamente en la base de datos, y que la información visible al público no exponga datos sensibles.

**Flujo de rechazo:**

```
Admin rechaza con motivo  →  Estudiante edita  →  Vuelve a pendiente  →  Admin revisa de nuevo
```

También verifica que un proyecto ya rechazado no pueda volver a rechazarse, y que un proyecto pendiente no pueda publicarse sin aprobación previa.

---

### Nivel 4 · Seguridad `(33 pruebas)`

Verifica que el sistema sea seguro ante los ataques y usos indebidos más comunes.

**Invalidación de tokens tras el logout** — Comprueba que al cerrar sesión el token quede en una lista negra y ya no pueda usarse para ninguna operación, aunque alguien lo haya guardado.

**Control de roles** — Un estudiante no puede realizar acciones de administrador: aprobar proyectos, rechazarlos, ver el panel de administración, listar usuarios ni cambiar roles o estados de otras cuentas.

**Propiedad de los proyectos** — Ningún usuario puede editar, eliminar ni publicar el proyecto de otra persona. Solo el autor tiene esos permisos.

**Rutas protegidas** — Todas las operaciones que modifican datos requieren autenticación. Se prueba que sin token ninguna de estas rutas responda con éxito. La única ruta pública (consultar proyectos publicados) sí funciona sin token.

**Tokens manipulados** — El sistema rechaza tokens falsos, tokens con la firma alterada, y tokens enviados sin el formato correcto.

**Protección del administrador** — Un administrador no puede quitarse a sí mismo el rol ni desactivar su propia cuenta, evitando que el sistema quede sin administrador por error.

---

## Tecnologías utilizadas

| Herramienta | Uso |
|---|---|
| [Jest](https://jestjs.io/) | Framework de testing |
| [Supertest](https://github.com/ladjs/supertest) | Pruebas HTTP sobre el servidor Express |
| [MongoDB Atlas](https://www.mongodb.com/atlas) | Base de datos separada para el entorno de tests |
| [cross-env](https://github.com/kentcdodds/cross-env) | Variables de entorno multiplataforma |
