# ── INSTRUCCIONES — Niveles 1, 2, 3 y 4 ─────────────────────────────────────

# ─── PASO 1: Instalar dependencias ───────────────────────────────────────────

    npm install --save-dev jest supertest

# ─── PASO 2: Editar package.json ─────────────────────────────────────────────
#
# "scripts": {
#   "dev":           "node --watch src/index.js",
#   "test":          "node --experimental-vm-modules node_modules/.bin/jest --detectOpenHandles --runInBand",
#   "test:watch":    "node --experimental-vm-modules node_modules/.bin/jest --watch --runInBand",
#   "test:coverage": "node --experimental-vm-modules node_modules/.bin/jest --coverage --runInBand",
#   "vercel-build":  "echo OK"
# },
#
# "jest": {
#   "testEnvironment": "node",
#   "transform": {},
#   "testMatch": ["**/tests/**/*.test.js"],
#   "globalSetup": "./tests/integration/setup.js"
# }

# ─── PASO 3: Crear el archivo .env.test ──────────────────────────────────────
#
# Crea este archivo en la raíz del proyecto. NO lo subas a GitHub.
#
#   MONGODB_URI=mongodb+srv://usuario:pass@cluster.mongodb.net/tesisv1-test
#   JWT_SECRET=cualquier_string_sirve_para_tests
#   NODE_ENV=test
#
# Solo cambia el nombre al final de tu URL de conexión:
#   ...mongodb.net/tesisv1      ← producción
#   ...mongodb.net/tesisv1-test ← tests

# ─── PASO 4: Agregar al .gitignore ───────────────────────────────────────────
#
#   .env.test

# ─── PASO 5: Estructura final completa ───────────────────────────────────────
#
# tesisv1-main/
# ├── src/
# ├── tests/
# │   ├── integration/
# │   │   ├── setup.js
# │   │   ├── helpers.js
# │   │   ├── auth/
# │   │   │   ├── login.test.js
# │   │   │   ├── registro.test.js
# │   │   │   └── cambiarPassword.test.js
# │   │   ├── proyectos/
# │   │   │   └── flujoCompleto.test.js
# │   │   └── seguridad/
# │   │       └── seguridad.test.js        ← NUEVO Nivel 4
# │   └── unit/
# │       ├── validators/
# │       │   ├── cambiarPassword.test.js
# │       │   └── registro.test.js
# │       └── helpers/
# │           └── generarProyectoId.test.js
# ├── .env
# ├── .env.test   ← NO subir a GitHub
# └── package.json

# ─── PASO 6: Correr los tests ────────────────────────────────────────────────

    npm test

# Resultado esperado:
#
#   PASS tests/unit/validators/cambiarPassword.test.js      (~11 tests)
#   PASS tests/unit/validators/registro.test.js             (~10 tests)
#   PASS tests/unit/helpers/generarProyectoId.test.js       (~9 tests)
#   PASS tests/integration/auth/login.test.js               (~9 tests)
#   PASS tests/integration/auth/registro.test.js            (~12 tests)
#   PASS tests/integration/auth/cambiarPassword.test.js     (~10 tests)
#   PASS tests/integration/proyectos/flujoCompleto.test.js  (~30 tests)
#   PASS tests/integration/seguridad/seguridad.test.js      (~27 tests)
#
#   Test Suites: 8 passed, 8 total
#   Tests:       ~118 passed, ~118 total

# ─── Correr solo un archivo ──────────────────────────────────────────────────
#
#   npm test -- tests/integration/seguridad/seguridad.test.js
#
# ─── Ver cobertura ───────────────────────────────────────────────────────────
#
#   npm run test:coverage
