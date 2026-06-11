# Informe de Pruebas Automatizadas
## Sistema de Gestión de Proyectos Estudiantiles — EPN

**Total de pruebas ejecutadas:** 134  
**Resultado:** ✅ 134 pasaron — 0 fallaron

---

## ¿Qué son estas pruebas?

Son verificaciones automáticas que comprueban que el sistema se comporte exactamente como debe. Cada prueba simula una acción real de un usuario (registrarse, iniciar sesión, crear un proyecto, etc.) y confirma que el sistema responde de manera correcta. Se organizan en 4 niveles de complejidad.

---

## NIVEL 1 — Reglas de formato y validación de datos
*Estas pruebas verifican que el sistema rechace información incorrecta antes de procesarla.*

---

### Generación de identificadores de proyecto (8 pruebas)

Cada proyecto en el sistema recibe un código único automático con el formato `PREFIJO-AÑO-NÚMERO`, por ejemplo `TSDS-2025-001`. Estas pruebas verifican que ese código se genere correctamente.

| Situación verificada | Resultado esperado |
|---|---|
| Se crea el primer proyecto de Desarrollo de Software en el año actual | El código generado es `TSDS-2025-001` |
| Se crean proyectos de las 6 carreras disponibles | Cada carrera usa su propio prefijo (TSDS, TSASA, TSEM, TSRT, TSIA, TSPIM) |
| Ya existen 5 proyectos registrados este año | El nuevo recibe el número 006 |
| El número siempre tiene 3 dígitos | Un proyecto único genera `001`, nunca `1` |
| Se indica una carrera que no existe en el sistema | El sistema lanza un error en lugar de generar un código inválido |
| Un proyecto tiene una versión previa (versión 001) | La siguiente versión generada es `002` |
| No existe ninguna versión previa de un proyecto | La primera versión generada es `001` |
| El número de versión siempre tiene 3 dígitos | Se genera `002`, nunca `2` |

---

### Validación del formulario de registro (14 pruebas)

Antes de crear una cuenta, el sistema revisa que todos los datos sean correctos. Estas pruebas verifican cada una de esas revisiones.

**Sobre el correo electrónico:**

| Situación verificada | Resultado esperado |
|---|---|
| Se ingresa un correo de Gmail, Hotmail u otro proveedor externo | El sistema lo rechaza exigiendo correo `@epn.edu.ec` |
| Se ingresa un texto que no es un correo válido | El sistema indica que el formato de correo es inválido |
| El correo ya fue usado por otra persona | El sistema indica que ese correo ya está registrado |
| Se escribe `email` en lugar de `correoInstitucional` | El sistema lo acepta igualmente (ambos nombres funcionan) |

**Sobre la cédula:**

| Situación verificada | Resultado esperado |
|---|---|
| La cédula tiene menos de 10 dígitos | El sistema la rechaza |
| La cédula contiene letras | El sistema la rechaza |
| La cédula ya fue registrada por otra persona | El sistema indica que esa cédula ya existe |

**Sobre la contraseña:**

| Situación verificada | Resultado esperado |
|---|---|
| La contraseña no tiene ninguna letra mayúscula | El sistema la rechaza |
| La contraseña no tiene ningún símbolo especial (@, #, !) | El sistema la rechaza |
| Se escribe `password` en lugar de `contraseña` | El sistema lo acepta igualmente |

**Sobre el rol:**

| Situación verificada | Resultado esperado |
|---|---|
| Se intenta registrar con rol de administrador | El sistema lo rechaza (nadie puede auto-asignarse ese rol) |

**Caso correcto:**

| Situación verificada | Resultado esperado |
|---|---|
| Todos los datos son correctos y válidos | El sistema acepta el registro sin errores |

---

### Validación del formulario de cambio de contraseña (11 pruebas)

Cuando un usuario quiere cambiar su contraseña, debe proporcionar la actual y la nueva dos veces. Estas pruebas verifican cada posible error.

| Situación verificada | Resultado esperado |
|---|---|
| No se envía la contraseña actual | El error aparece en el campo "contraseña actual", no en otro campo |
| No se envía la contraseña nueva | El sistema lo indica claramente |
| La contraseña nueva y la confirmación no coinciden | El sistema detecta la diferencia |
| La contraseña nueva no tiene mayúsculas | El sistema la rechaza |
| La contraseña nueva no tiene símbolos especiales | El sistema la rechaza |
| La contraseña nueva tiene menos de 8 caracteres | El sistema la rechaza |
| No se envía la confirmación de la nueva contraseña | El sistema lo indica |
| Se envía el formulario completamente vacío | El sistema rechaza todo |
| Todos los campos son correctos | El sistema acepta el cambio |
| Se usa el nombre alternativo `contraseñaActual` | El sistema lo entiende igual |
| Se usa el nombre alternativo `contraseñaNueva` | El sistema lo entiende igual |

---

## NIVEL 2 — Pruebas del sistema funcionando en tiempo real
*Estas pruebas conectan con una base de datos real de prueba y verifican que los procesos completos funcionen de principio a fin.*

---

### Inicio de sesión (10 pruebas)

| Situación verificada | Resultado esperado |
|---|---|
| No se envía ni correo ni contraseña | El sistema pide los datos obligatorios |
| Se envía correo pero no contraseña | El sistema rechaza la solicitud |
| El correo no está registrado en el sistema | El sistema informa que el usuario no existe |
| La contraseña es incorrecta | El sistema informa que la contraseña no coincide |
| El correo nunca fue confirmado tras el registro | El sistema pide confirmarlo antes de entrar |
| La cuenta fue desactivada por un administrador | El sistema informa que la cuenta está suspendida |
| Correo y contraseña son correctos | El sistema entrega un token de acceso con los datos del usuario |
| El inicio de sesión exitoso devuelve la contraseña guardada | La contraseña nunca aparece en la respuesta (es confidencial) |
| Se usa `email` en lugar de `correoInstitucional` | El sistema lo acepta igualmente |
| Se usa `password` en lugar de `contraseña` | El sistema lo acepta igualmente |

---

### Registro de cuenta nueva (15 pruebas)

| Situación verificada | Resultado esperado |
|---|---|
| Falta el nombre | El sistema rechaza el formulario |
| Falta el apellido | El sistema rechaza el formulario |
| Falta la cédula | El sistema rechaza el formulario |
| Falta el correo institucional | El sistema rechaza el formulario |
| Falta la contraseña | El sistema rechaza el formulario |
| El correo no es `@epn.edu.ec` | El sistema rechaza el correo |
| El correo ya existe en el sistema | El sistema rechaza el registro duplicado |
| La cédula tiene menos de 10 dígitos | El sistema la rechaza |
| La cédula tiene letras | El sistema la rechaza |
| La contraseña no tiene mayúsculas | El sistema la rechaza |
| La contraseña no tiene símbolos especiales | El sistema la rechaza |
| La contraseña tiene menos de 8 caracteres | El sistema la rechaza |
| No se indica un rol específico | El sistema asigna automáticamente el rol de estudiante |
| Se intenta registrar como administrador | El sistema no lo permite |
| Todos los datos son correctos | La cuenta se crea y la respuesta no incluye contraseñas ni tokens |
| La cuenta se acaba de crear | El correo aparece como no confirmado (requiere verificación) |
| La respuesta de registro exitoso incluye contraseña o token | La contraseña y el token nunca aparecen en la respuesta |
| Se usa `email` en lugar de `correoInstitucional` | El sistema lo acepta igualmente |
| Se usa `password` en lugar de `contraseña` | El sistema lo acepta igualmente |

---

### Cambio de contraseña (7 pruebas)

| Situación verificada | Resultado esperado |
|---|---|
| Se intenta cambiar contraseña sin estar autenticado | El sistema lo rechaza |
| No se envía la contraseña actual | El error aparece en el campo correcto, no en otro |
| No se envía la contraseña nueva | El sistema lo rechaza |
| La contraseña nueva y la confirmación no coinciden | El sistema lo rechaza |
| Se ingresa una contraseña actual incorrecta | El sistema informa que no coincide |
| Todos los datos son correctos | La contraseña se actualiza exitosamente |
| Se intenta entrar con la contraseña anterior después del cambio | Ya no funciona |
| Se entra con la nueva contraseña | Funciona correctamente |

---

## NIVEL 3 — El ciclo de vida completo de un proyecto
*Estas pruebas verifican el proceso completo desde que un estudiante crea un proyecto hasta que aparece publicado en la plataforma pública.*

---

### Creación de un proyecto (10 pruebas)

| Situación verificada | Resultado esperado |
|---|---|
| Se intenta crear sin haber iniciado sesión | El sistema lo rechaza |
| Falta el título del proyecto | El sistema rechaza la creación |
| Falta la descripción del proyecto | El sistema rechaza la creación |
| Se indica una carrera que no existe | El sistema rechaza la creación |
| Todos los datos son correctos | El proyecto se crea exitosamente |
| El proyecto recién creado | Su estado es "pendiente" (esperando revisión del administrador) |
| El proyecto recién creado | No es visible al público todavía |
| El autor registrado en el proyecto | Es el mismo usuario que lo creó |
| El identificador generado para el proyecto | Sigue el formato correcto (ej. `TSDS-2025-001`) |
| Se busca el nuevo proyecto en la página pública | No aparece aún (falta aprobación) |

---

### El administrador aprueba el proyecto (6 pruebas)

| Situación verificada | Resultado esperado |
|---|---|
| Se intenta aprobar sin haber iniciado sesión | El sistema lo rechaza |
| Un estudiante intenta aprobar un proyecto | El sistema lo rechaza (solo administradores pueden hacerlo) |
| El administrador aprueba el proyecto | El estado cambia a "aprobado" |
| Se revisa el estado en la base de datos | Confirma que dice "aprobado" |
| Se intenta aprobar un proyecto que ya fue aprobado | El sistema lo rechaza con un error |
| Se busca el proyecto aprobado en la página pública | Todavía no aparece (falta que el autor lo publique) |

---

### El estudiante publica su proyecto (5 pruebas)

| Situación verificada | Resultado esperado |
|---|---|
| Se intenta publicar sin haber iniciado sesión | El sistema lo rechaza |
| Otro estudiante intenta publicar el proyecto ajeno | El sistema lo rechaza |
| El propio autor publica su proyecto | El proyecto queda marcado como público |
| Se revisa en la base de datos | Confirma que el campo "público" es verdadero |
| Se intenta publicar un proyecto que ya está publicado | El sistema lo rechaza con un error |

---

### El proyecto aparece en la plataforma pública (3 pruebas)

| Situación verificada | Resultado esperado |
|---|---|
| Se consulta la lista pública de proyectos | El proyecto recién publicado aparece en ella |
| Los datos del proyecto en la página pública incluyen información del autor | La contraseña del autor nunca aparece en los datos |
| Se consulta el proyecto directamente por su identificador sin estar autenticado | Los datos del proyecto se muestran correctamente |

---

### Flujo de rechazo y corrección (5 pruebas)

| Situación verificada | Resultado esperado |
|---|---|
| El administrador rechaza un proyecto indicando el motivo | El estado cambia a "rechazado" y el motivo queda registrado |
| El proyecto rechazado aparece en la página pública | No aparece (los rechazados no son visibles) |
| Se intenta rechazar por segunda vez un proyecto ya rechazado | El sistema lo rechaza con el mensaje: *"El proyecto ya se encuentra rechazado y no puede volver a rechazarse"* |
| El estudiante edita su proyecto rechazado | La edición se guarda correctamente |
| Después de que el estudiante edita el proyecto | El estado vuelve automáticamente a "pendiente" para nueva revisión |

---

### No se puede publicar sin aprobación previa (2 pruebas)

| Situación verificada | Resultado esperado |
|---|---|
| Se crea un proyecto nuevo (queda en estado pendiente) | Se crea correctamente |
| Se intenta publicar ese proyecto pendiente | El sistema lo rechaza indicando que solo se pueden publicar proyectos aprobados |

---

## NIVEL 4 — Seguridad del sistema
*Estas pruebas verifican que el sistema sea seguro y que nadie pueda hacer cosas que no le corresponden.*

---

### Cierre de sesión e invalidación de token (6 pruebas)

Cuando un usuario cierra sesión, su token de acceso queda inutilizable aunque alguien lo tenga guardado.

| Situación verificada | Resultado esperado |
|---|---|
| Se inicia sesión y se obtiene un token | El token llega correctamente |
| Se usa ese token para acceder al perfil | Funciona |
| Se cierra la sesión | El token queda registrado en la lista negra del sistema |
| Se intenta usar ese mismo token después del cierre de sesión | El sistema lo rechaza indicando que la sesión fue cerrada |
| Se intenta crear un proyecto con el token invalidado | El sistema lo rechaza |
| Se intenta cerrar sesión por segunda vez con el mismo token | El sistema lo maneja sin errores (no explota) |

---

### Un estudiante no puede hacer tareas de administrador (7 pruebas)

| Situación verificada | Resultado esperado |
|---|---|
| Un estudiante intenta aprobar su propio proyecto | El sistema lo rechaza |
| Un estudiante intenta aprobar el proyecto de otro estudiante | El sistema lo rechaza |
| Un estudiante intenta rechazar un proyecto | El sistema lo rechaza |
| Un estudiante intenta ver el panel de administración de proyectos | El sistema lo rechaza |
| Un estudiante intenta ver la lista de todos los usuarios | El sistema lo rechaza |
| Un estudiante intenta cambiar el estado (activo/inactivo) de otro usuario | El sistema lo rechaza |
| Un estudiante intenta cambiar el rol de otro usuario | El sistema lo rechaza |

---

### Nadie puede modificar el proyecto de otra persona (5 pruebas)

| Situación verificada | Resultado esperado |
|---|---|
| Un estudiante intenta editar el proyecto de otro | El sistema lo rechaza indicando falta de permisos |
| Se revisa el proyecto después del intento fallido | El título no cambió, quedó intacto |
| Un estudiante intenta eliminar el proyecto de otro | El sistema lo rechaza y el proyecto sigue existiendo |
| Un estudiante intenta publicar el proyecto de otro | El sistema lo rechaza indicando que solo el autor puede publicarlo |
| El autor edita su propio proyecto | Funciona correctamente |

---

### Las rutas protegidas no funcionan sin autenticación (8 pruebas)

| Situación verificada | Resultado esperado |
|---|---|
| Se intenta crear un proyecto sin token | El sistema lo rechaza |
| Se intenta editar un proyecto sin token | El sistema lo rechaza |
| Se intenta eliminar un proyecto sin token | El sistema lo rechaza |
| Se intenta ver el perfil sin token | El sistema lo rechaza |
| Se intenta cambiar la contraseña sin token | El sistema lo rechaza |
| Se intenta ver el panel personal sin token | El sistema lo rechaza |
| Se intenta acceder al panel de admin sin token | El sistema lo rechaza |
| Se consulta la lista pública de proyectos sin token | Funciona correctamente (es una ruta pública) |

---

### Tokens falsos o manipulados son rechazados (4 pruebas)

| Situación verificada | Resultado esperado |
|---|---|
| Se envía un token completamente inventado | El sistema lo rechaza |
| Se toma un token válido y se modifican sus últimos caracteres | El sistema detecta que la firma no es válida y lo rechaza |
| Se envía el token sin la palabra "Bearer" delante | El sistema lo rechaza |
| Se envía el campo de autorización vacío | El sistema lo rechaza |

---

### El administrador no puede dañarse a sí mismo (3 pruebas)

Para evitar que un error deje el sistema sin administrador, hay protecciones especiales.

| Situación verificada | Resultado esperado |
|---|---|
| El administrador intenta quitarse a sí mismo el rol de admin | El sistema lo rechaza |
| El administrador intenta desactivar su propia cuenta | El sistema lo rechaza |
| Se revisa el estado del administrador después de los intentos | Sigue siendo administrador y su cuenta sigue activa |

---

## Resumen por niveles

| Nivel | Área | Pruebas | Resultado |
|---|---|---|---|
| Nivel 1 | Validación de datos y formatos | 33 | ✅ Todas pasaron |
| Nivel 2 | Registro, login y cambio de contraseña | 32 | ✅ Todas pasaron |
| Nivel 3 | Ciclo de vida completo de proyectos | 31 | ✅ Todas pasaron |
| Nivel 4 | Seguridad y control de accesos | 33 | ✅ Todas pasaron |
| **Total** | | **134** | **✅ 134 / 134** |
