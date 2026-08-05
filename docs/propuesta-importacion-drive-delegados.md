# Importación de casos desde Google Drive  
## Usuarios y Consumidores Unidos (UCU)

**Para:** Delegados y estudios que colaboran con UCU  
**Asunto:** Cómo volcar al sistema los casos que hoy existen fuera de él — y mejorar fuerte la estadística

---

### El problema

En la red de **Usuarios y Consumidores Unidos** se atienden muchos reclamos de consumo: en la ONG, en cada delegación y en los estudios de los delegados.

La mayor parte de ese trabajo vive en **Google Drive**: cartas, consultas, demandas, escritos.  
En el **sistema de UCU**, en cambio, figuran **muy pocos** de esos casos.

Eso genera un desfasaje serio:

- Hay **mucha actividad real** y **poca carga formal**.
- La **estadística nacional** no refleja lo que la red realmente hace.
- Cargar a mano, caso por caso, es inviable: el volumen ya está y el tiempo no alcanza.

Sin esos datos en el sistema, UCU no puede mostrar con fuerza el mapa del conflicto de consumo ni el aporte de cada delegación.

---

### La solución

El sistema de UCU puede **leer las carpetas de Drive** que cada delegado comparta y:

1. **Importar en un acto** el historial ya existente (sin carga manual uno por uno).
2. **Correr una vez al mes** para detectar casos nuevos y actualizar lo que cambió.
3. **Sumar todo a la estadística**: reclamos recibidos por UCU **y** los que ingresan por el estudio de cada delegado.

Drive sigue siendo el lugar de trabajo del expediente.  
El sistema UCU **indexa, registra y contabiliza**.

> Pasamos de “muchos casos en Drive / pocos en el sistema” a “el sistema se alimenta del Drive de cada delegación”.

---

### Cómo funciona

| Momento | Qué pasa |
|--------|----------|
| **Importación inicial** | Se recorre la carpeta compartida y se dan de alta los casos detectados. |
| **Corrida mensual** | El sistema mira lo nuevo o modificado: carga casos nuevos y actualiza; **no duplica** lo ya importado. |
| **Casos del sitio web** | El consumidor carga el reclamo; UCU lo asigna. Si el delegado guarda el archivo en Drive con el código del caso, se vincula y no se duplica. |
| **Casos solo del estudio** | Si el reclamo nunca pasó por el formulario web, el archivo en Drive es el alta: entra a la base y a la estadística. |

Todos los casos aportan a la misma estadística. Cuanto más completa sea la red de carpetas compartidas, más sólida es la foto nacional.

---

### Qué pedimos a cada delegado

1. **Una carpeta en Google Drive** dedicada a casos UCU / consumo (puede ser la que ya usan).
2. **Compartir esa carpeta** con esta dirección del sistema (permiso de **Lector**):

   `firebase-adminsdk-fbsvc@ucuweb-2887d.iam.gserviceaccount.com`

   En Drive: clic derecho en la carpeta → Compartir → pegar esa dirección → rol Lector → Enviar.  
   (Es una cuenta técnica de Google, no un Gmail personal; Drive la acepta igual.)
3. **Un archivo principal por caso** (Word o PDF): la consulta, la carta documento, la demanda o el escrito que define el reclamo.
4. Que el **nombre del archivo** identifique el caso de forma clara, por ejemplo:
   - `Pérez Juan c Empresa X.docx`
   - o, si el caso ya tiene número en el sistema: `UCU-12345 Pérez c Empresa X.docx`

No es obligatorio usar subcarpetas. Si trabajan con una sola carpeta y muchos archivos, alcanza con la regla: **un caso = un archivo principal**.

Si más adelante agregan movimientos del mismo expediente, conviene el mismo nombre base o el mismo código UCU, para que la corrida mensual los tome como novedades del mismo caso y no como un reclamo nuevo.

---

### Qué gana cada uno

**Usuarios y Consumidores Unidos**

- Estadística mucho más representativa (más casos, más delegaciones, más rubros).
- Visión unificada: reclamos web + reclamos de estudio.
- Fin de la carga manual masiva del historial.

**El delegado / estudio**

- Siguen trabajando como hasta ahora (en su Drive, con sus Word).
- Solo comparten la carpeta y cuidan “un archivo por caso”.
- Sus casos quedan reflejados en la estadística nacional a la que aportan.

---

### Alcance

Se contemplan documentos habituales del reclamo: Word, Google Docs y PDF.  
El sistema usa el contenido para completar datos (consumidor, empresa, motivo, etc.). Cuanto más claro esté el escrito, mejor el registro y la estadística.

---

### Próximos pasos

1. Confirmar la carpeta de Drive que usarán como raíz de casos.
2. Compartirla con `firebase-adminsdk-fbsvc@ucuweb-2887d.iam.gserviceaccount.com` (Lector).
3. Avisar a UCU el enlace de esa carpeta, para registrarla a su delegación.
4. Hacer juntos la **primera importación** (puede ser en modo prueba).
5. A partir de ahí, el sistema corre **una vez al mes** para cargar nuevos y actualizar.

---

### Mensaje central

> Hoy tenemos **muchos casos atendidos** y **muy pocos cargados** en el sistema.  
> La solución es simple: cada delegación comparte su carpeta de Drive; UCU **importa todo en un acto** y, **cada mes**, toma lo nuevo.  
> Así cada reclamo —recibido por UCU o en el estudio— **suma a la estadística** y la fortalece de verdad.

Para dudas o para coordinar el acceso a la carpeta, escribir a la administración de UCU.

---

*Documento de trabajo — Usuarios y Consumidores Unidos (UCU)*  
*Para comunicación con delegados*
