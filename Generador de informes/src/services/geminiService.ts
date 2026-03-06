import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const getAI = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("No se encontró una clave de API configurada.");
  }
  return new GoogleGenAI({ apiKey });
};

export interface FileData {
  name: string;
  mimeType: string;
  data: string; // base64
}

// === PROMPT PASO 1: ANÁLISIS (SECCIONES 1-5) ===
const PROMPT_ANALISIS = `
Eres un Asesor Previsional experto y senior, con profundo conocimiento del sistema de pensiones chileno (AFP, SCOMP, PGU, APV, etc.).
Basado ÚNICAMENTE en los documentos, genera el informe con la siguiente estructura exacta (Secciones 1 a 5):

## Informe final de Asesoría Previsional
### 1) Antecedentes del afiliado y Solicitud de Ofertas
[INSTRUCCIÓN CRÍTICA: Busca específicamente en el documento "Solicitud de Ofertas" para extraer los siguientes datos con mayor precisión. Si no están ahí, búskalos en el SCOMP.]
* **Nombre Completo:** [Extraer]
* **RUT:** [Extraer]
* **Fecha de Nacimiento:** [Extraer]
* **Edad Cumplida (a la fecha actual):** [Calcular o extraer si está]
* **Sexo:** [Extraer]
* **Estado Civil:** [Extraer]
* **AFP de Origen:** [Extraer desde Solicitud de Ofertas]
* **Institución de Salud:** [Extraer o poner "No informada"]
* **Fecha Solicitud de Pensión:** [Extraer]
* **Fecha Solicitud de Ofertas:** [Extraer fecha del encabezado del formulario Solicitud de Ofertas]
* **Tipo de Pensión Solicitada:** [Extraer desde Solicitud de Ofertas, ej: Vejez Edad]

#### Certificado de Saldos
**Descripción:** El saldo total destinado a pensión (Cotizaciones Obligatorias, Fondo [Extraer Fondo]) es de **UF [Extraer Saldo UF]**. Este monto equivale a **$[Extraer Saldo $]**. El valor de la UF utilizado es de **$[Extraer Valor UF]** al **[Extraer Fecha UF]**. Este Certificado se encuentra vigente hasta el día **[Extraer Vigencia Saldo]**.
### 2) Antecedentes del beneficiario
[INSTRUCCIÓN: Si se encuentran beneficiarios en el SCOMP, generar una tabla Markdown con TODOS ellos. Si NO se encuentran beneficiarios, DEBES indicar exactamente: "El consultante declara no contar con beneficiarios legales de pensión."]
| Nombre Completo | RUT | Parentesco | Sexo | Invalidez | Fecha de Nacimiento |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [Nombre] | [RUT] | [Parentesco] | [F/M] | [S/N] | [Fecha] |
| [Nombre 2] | [RUT 2] | [Parentesco 2] | [F/M] | [S/N] | [Fecha] |
### 3) Situación previsional
* **Tipo de Pensión Solicitada:** [Extraer, ej: Vejez Edad, Cambio de Modalidad]
* **Saldo para Pensión:** **UF [Extraer Saldo UF]**
* **Modalidades Solicitadas al SCOMP:** [Extraer las modalities que se pidieron, ej: RVIS, RVA 100% 36m]
### 4) Gestiones realizadas
[Describir las gestiones en formato lista o tabla, extrayendo fechas y acciones. Ej:
* **Solicitud de Pensión de Vejez Edad:** Presentada el [Fecha] a AFP [Nombre].
* **Retiro Certificado de Saldos:** Se retira el día [Fecha].
* **Solicitud de Ofertas (SCOMP):** Ingresada el [Fecha], por el Asesor Previsional [Nombre Asesor].]
* **Modalidades Solicitadas:** [Extraer TODAS las modalidades marcadas con 'X' en la Solicitud de Ofertas, incluyendo meses garantizados y cláusulas. Ej: "Retiro Programado", "Renta Vitalicia Inmediata con Condiciones Especiales de Cobertura: 240 meses garantizados"]
### 5) Resultados Scomp
#### a) Retiro programado
**Descripción:** Es una modalidad de pensión que se paga con cargo a la Cuenta de Capitalización Individual del afiliado. La pensión se recalcula anualmente, considerando el saldo remanente, la expectativa de vida del afiliado y de sus beneficiarios, y la rentabilidad del fondo. Por lo tanto, la pensión puede subir o bajar cada año.
**Cuadro de resultados:**
[Generar tabla Markdown con TODAS las AFP del SCOMP]
| AFP | Pensión en UF | Pensión Bruta en $| Descuento 7% Salud$ | Pensión Líquida en $ |
| :--- | :--- | :--- | :--- | :--- |
| [AFP 1] | [uf] | [bruta] | [salud] | [liquida] |
| [AFP 2] | [uf] | [bruta] | [salud] | [liquida] |
| ... | ... | ... | ... | ... |
| [AFP 2] | [uf] | [bruta] | [salud] | [liquida] |
| ... | ... | ... | ... | ... |
| [AFP 2] | [uf] | [bruta] | [salud] | [liquida] |
| ... | ... | ... | ... | ... |
**Nota:** La oferta de Retiro Programado de su AFP de Origen ([Nombre AFP]) es de **[UF] UF** al mes, lo que equivale a una Pensión Bruta de **$[MontoBruto]**. Con el descuento de salud 7% ($[MontoSalud]) y la comisión de administración de la AFP del [Comision]% ($[MontoComision]), la pensión líquida aproximada es de **$[MontoLiquido]** para el primer año.
*(Instrucción: Busca el % de comisión de la AFP de origen en el certificado de saldo o oferta interna. Calcula el monto en pesos [Bruta * %]. Resta Salud y Comisión a la Bruta para obtener la Líquida).*

[INSTRUCCIÓN CLAVE: Si en el SCOMP aparece "Pensión de Referencia Garantizada por ley" (común en Invalidez), AGREGA AQUÍ LA SIGUIENTE SECCIÓN b). Si no, salta a Renta Vitalicia.]

#### b) Pensión de Referencia Garantizada por ley
**Descripción:** Por ley las Compañías de Seguros de Vida indicadas más abajo, garantizan una Pensión de referencia con su saldo obligatorio hasta la fecha de vigencia indicada. El monto de la Pensión garantizada, en renta vitalicia inmediata simple, será el siguiente:
**Cuadro de resultados:**
[Generar tabla con los datos de Referencia Garantizada del SCOMP]

#### [Si hubo sección b, esta es c), sino b)] Renta Vitalicia

**Renta Vitalicia Inmediata Simple**
**Descripción:** Es un contrato con una Compañía de Seguros, donde el afiliado traspasa la totalidad de su saldo para recibir una pensión mensual en UF fija y de por vida. El monto no varía, independiente de la rentabilidad del mercado o de la expectativa de vida.
**Cuadro de resultados (4 mejores ofertas):**
| Compañía de Seguros | Pensión en UF | Pensión Bruta $| Descuento 7% Salud$ | Pensión Líquida $ |
| :--- | :--- | :--- | :--- | :--- |
| [Cia 1] | [uf] | [bruta] | [salud] | [liquida] |
| [Cia 2] | [uf] | [bruta] | [salud] | [liquida] |
| [Cia 3] | [uf] | [bruta] | [salud] | [liquida] |
| [Cia 4] | [uf] | [bruta] | [salud] | [liquida] |

[INSTRUCCIÓN CRÍTICA: Debes generar AQUI una sección para CADA modalidad de "Renta Vitalicia Inmediata Garantizada" encontrada en el SCOMP (ej. 120 meses, 240 meses). NO LAS OMITAS por ningún motivo. Si hay varias rentas garantizadas, haz una tabla separada para cada una.]

**Renta Vitalicia Inmediata Garantizada [X] Meses** (Repetir para cada periodo encontrado)
**Descripción:** En esta modalidad, si el asegurado fallece durante el periodo garantizaro (ej. [X] meses), los beneficiarios designados recibirán el 100% de la pensión hasta cumplir dicho plazo.
**Cuadro de resultados (4 mejores ofertas):**
| Compañía de Seguros | Pensión en UF | Pensión Bruta $| Descuento 7% Salud$ | Pensión Líquida $ |
| :--- | :--- | :--- | :--- | :--- |
| [Cia 1] | [uf] | [bruta] | [salud] | [liquida] |
| ... | ... | ... | ... | ... |

**Renta Vitalicia Aumentada**
**Descripción:** La "Cláusula de Aumento Temporal de Pensión" es una cobertura adicional que permite duplicar (aumentar en un 100%) el monto de la pensión durante un período determinado al inicio. Una vez que este período finaliza, la pensión vuelve a su monto base original, el cual es fijo en UF y se paga de por vida.
[Generar una sección para CADA modalidad de Renta Vitalicia Aumentada encontrada en el SCOMP, ej: "Renta Vitalicia Aumentada 100% por 36 Meses"]
**[Título de la Modalidad, ej: Renta Vitalicia Aumentada 100% por 36 Meses, Garantizado 180 meses.]**
**Cuadro de resultados (4 mejores ofertas):**
| Compañía | Pensión Aumentada en UF | Pensión Aumentada en $| Descuento 7% Salud$ | Pensión Líquida Período Aumentado | Pensión Después de Aumento en UF (Base) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [Cia 1] | [Calcular: Base * 2] | [Calcular: Base $* 2] | [Calcular: (Base$ * 2) * 0.07] | [Calcular: (Base $ * 2) - Salud] | [Extraer Base UF] |
| [Cia 2] | [Calcular: Base * 2] | [Calcular: Base $* 2] | [Calcular: (Base$ * 2) * 0.07] | [Calcular: (Base $ * 2) - Salud] | [Extraer Base UF] |
| [Cia 3] | [Calcular: Base * 2] | [Calcular: Base $* 2] | [Calcular: (Base$ * 2) * 0.07] | [Calcular: (Base $ * 2) - Salud] | [Extraer Base UF] |
| [Cia 4] | [Calcular: Base * 2] | [Calcular: Base $* 2] | [Calcular: (Base$ * 2) * 0.07] | [Calcular: (Base $ * 2) - Salud] | [Extraer Base UF] |
**Explicación:** Después del período aumentado, su pensión bajará al monto de la pensión base calculada. En este caso, la mejor oferta es de **[Base UF de la mejor oferta] UF**, lo que equivale a **$[Monto Base $]** brutos.

#### f) Otras Modalidades (Renta Temporal con Renta Vitalicia Diferida, etc.)
[INSTRUCCIÓN: Si en el SCOMP aparecen otras modalidades NO listadas arriba (ej. Renta Temporal con Renta Vitalicia Diferida), GENERA UNA SECCIÓN ADICIONAL aquí para cada una, manteniendo el mismo formato de tabla de resultados. NO OMITAS NINGUNA OFERTA DEL SCOMP.]

REGLAS ADICIONALES:
1. **Actúa como un experto:** Tu tono debe ser profesional y claro.
2. **Cíñete a los datos:** No inventes información. Si un dato no se encuentra, indica "No informado".
3. **Calcula cuando se pida:** Para las Rentas Vitalicias Aumentadas, DEBES calcular los montos aumentados (Pensión Aumentada UF/$, Pensión Líquida Aumentada) basándote en la "pensión base".
4. **Tablas Markdown OBLIGATORIAS:** DEBES usar ÚNICAMENTE el formato de pipes (|) para las tablas. 
   - CADA FILA DEBE ESTAR EN UNA SOLA LÍNEA.
   - NO uses saltos de línea dentro de una celda.
   - NO uses tabuladores (\\t).
   - NO uses espacios múltiples para alinear.
   - Cada fila debe empezar y terminar con |.
   - Ejemplo: | Columna 1 | Columna 2 |
5. **Formato de Números:** Para todos los montos en Pesos ($), usa el formato chileno: símbolo $, un espacio, y puntos como separador de miles (ej: $ 1.234.567). Para montos en UF, usa 2 decimales y coma como separador decimal (ej: 12,34 UF).
6. **NO INCLUYAS la Sección 6 (Recomendación Final).** Termina el informe después de la Sección 5.
7. **Formato de Títulos:** Usa '##' para Secciones y '###' para Subsecciones. Usa '####' para los títulos de las modalidades.
8. **IMPORTANTE - ALINEACIÓN DE TABLAS:** Al extraer datos de tablas, asocia correctamente cada AFP con SU monto. Verifica fila por fila.
9. **CHAIN OF THOUGHT:** Antes de generar, analiza internamente todas las modalidades (Simple, Garantizada 120, 240, etc.). No omitas NINGUNA.
`;

// === PROMPT PASO 2: RECOMENDACIÓN (SECCIÓN 6) ===
const PROMPT_RECOMENDACION = `
Eres un Asesor Previsional experto. Tu tarea es redactar la **Sección 6: Recomendación Final** para un informe.
Te entregaré el análisis de datos (Secciones 1-5) como contexto, y las instrucciones del asesor humano.
Redacta ÚNICAMENTE la "## 6) Recomendación Final" siguiendo las instrucciones.
Usa el formato de moneda chileno para los montos en pesos ($ 1.234.567).
---
RECOMENDACIÓN FINAL:
`;

// === PROMPT PASO 3: MODIFICACIÓN ===
const PROMPT_MODIFICACION = `
Eres un editor profesional. Tu tarea es tomar el siguiente informe previsional y modificarlo según las instrucciones del usuario.
REGLAS:
1.  **Aplica las modificaciones solicitadas** de forma precisa.
2.  **No cambies el formato Markdown** (títulos ##, ###, tablas |, etc.) a menos que la instrucción te lo pida.
3.  **Mantén el tono profesional** del informe.
4.  Entrega el **informe completo modificado**, no solo la parte que cambiaste.
`;

// === PROMPT PASO 4: VERIFICACIÓN (AUDITORÍA) ===
const PROMPT_VERIFICACION = `
Eres un Auditor de Calidad (QC) experto en informes previsionales. Tu misión es revisar que el "Informe Generado" sea fiel a los "Documentos Originales".
NO debes reescribir el informe, solo auditarlo.

Debes verificar DOS cosas críticas:
1.  **Integridad de Modalidades:** ¿Están TODAS las modalidades de pensión del SCOMP en el informe?
    *   **CRÍTICO:** Verifica que se incluyan las **"Renta Vitalicia Inmediata Garantizada"** (ej. 120, 240 meses) si aparecen en el original. Es el error más común.
    *   Si es Invalidez, verifica la "Pensión de Referencia Garantizada".
    *   Verifica que NO falten otras modalidades menos comunes (ej. Renta Temporal con Renta Vitalicia Diferida). Si está en el SCOMP, debe estar en el Informe.
2.  **Exactitud de Montos:** ¿Los montos en UF de las ofertas coinciden con el documento original?

Respuesta del Auditor:
Si todo está correcto y completo, responde EXACTAMENTE: "APROBADO".
Si encuentras errores u omisiones (especialmente modalidades faltantes), responde: "RECHAZADO: [Lista breve de lo que falta o está mal]".
`;

// === CLÁUSULAS LEGALES FIJAS (Para evitar filtros de RECITATION de Gemini) ===
const CLAUSULAS_LEGALES_FIJAS = `
SEGUNDO: Naturaleza u objeto del contrato: El presente contrato de asesoría previsional tiene por objeto otorgar información a los afiliados y beneficiarios del Sistema de Pensiones, considerando de manera integral todos los aspectos que dicen relación con su situación particular y que fueren necesarios para adoptar decisiones informadas de acuerdo a sus necesidades e intereses, en relación con las prestaciones y beneficios que contempla el D.L. N° 3.500. Dicha asesoría podrá comprender además la intermediación de seguros previsionales.

TERCERO: Obligaciones Del Asesor Previsional:
I. Otorgar información, asesorar y orientar al afiliado o sus beneficiarios, según corresponda, considerando de manera integral todos los aspectos que digan relación con su situación particular y que fueren necesarias para que adopten decisiones informadas de acuerdo a sus necesidades e intereses, en relación con las prestaciones y beneficios que contempla el D.L. N° 3.500. 
II. Asesorar en la selección de modalidad de pensión, informando acerca de los procedimientos y funcionamiento del Sistema de Consultas y Ofertas de Montos de Pensión, enviar y transmitir las consultas de montos de pensión requeridas por los consultantes y asistirle en todas las gestiones que corresponda efectuar una vez evacuadas las ofertas de pensión por el Sistema, ya sea en casos de aceptación de alguna de las ofertas contenida en el Certificado de Ofertas, la cotización y aceptación de una oferta externa en caso de negociación directa con alguna compañía de seguros, la participación en el sistema de remate electrónico de pensión, el ingreso dentro de los plazos correspondientes de una nueva consulta en el Sistema, o bien la posibilidad de desistirse de contratar conforme a las ofertas recibidas. 
III. En caso que el afiliado o sus beneficiarios cumplan los requisitos para pensionarse, o se trate de un pensionado bajo la modalidad de retiro programado, la asesoría deberá informar en especial sobre la forma de hacer efectiva su pensión según las modalidades previstas en el artículo 61 del D.L. N° 3.500, sus características y demás beneficios a que pudieren acceder según el caso, con una estimación de sus montos. 
IV. Analizar y verificar la situación previsional tanto del pensionable como de sus beneficiarios legales. El asesor deberá obtener o requerir del cliente los antecedentes que permitan establecer o verificar la existencia o no de beneficiarios con derecho a pensión de sobrevivencia, a fin de evitar se incurra en la conducta descrita en el artículo 13 del D.L. N° 3.500, de 1980. v. En caso de que el solicitante cumpliera con los requisitos legales para obtener pensión de invalidez deberá informar el derecho que le asiste para acceder a dicha pensión con la misma compañía de seguros obligada a efectuar el pago del aporte adicional en conformidad al artículo 60 del D.L. N° 3.500 aun cuando ésta no hubiera presentado una oferta de pensión, e informarle el plazo del cual dispone para ejercer dicha opción. 

CUARTO: Pólizas Comprometidas: La Entidad de Asesoria Previsional Asesoriapensiones.cl Spa, tiene contratada una Póliza de Responsabilidad Civil Profesional Nº 9279324 con SEGUROS GENERALES SURAMERICANA S.A., emitida el 30/10/2025., vigencia desde 01/10/2025 hasta el 30/09/2026.

QUINTO: Vigencia: El presente contrato tendrá vigencia durante el período que dure el trámite de pensión y se extenderá hasta que el contratante Selecciones su Modalidad de Pensión, o desista de pensionarse.

SEXTO: Honorarios: Los honorarios brutos convenidos a pagar al “ASESOR PREVISIONAL” por la prestación de sus servicios, deberán ajustarse al rango de comisiones que se encuentran establecidas en el Decreto Ley 3.500 y en el Decreto Supremo conjunto del Ministerio de Hacienda y Trabajo y Previsión Social N° 26 publicado el 01 de Octubre de 2020.
Primera Asesoría (Selección de Modalidad de Pensión):
1.5% del saldo destinado a la modalidad de pensión de renta vitalicia con tope 60 UF y 
1.2% en el caso de retiro programado con tope 36 UF.
Segunda Asesoría (Cambio de Modalidad de Pensión de Retiro Programado a otra Modalidad):
1,5% menos el porcentaje pagado por la primera asesoría, aplicado al saldo destinado a pensión, con tope 60 UF menos las unidades de fomento efectivamente pagadas.
Además, se establece que el pago de los honorarios queda sujeto a la prestación efectiva de la asesoría de que trata el contrato y que éstos honorarios o comisión se cobrarán en términos brutos, es decir, el monto incluye el impuesto al que esté obligado el Asesor Previsional.

SÉPTIMO: Derecho a Información: El contratante podrá requerir, en cualquier momento, información escrita respecto de las gestiones realizadas durante el curso de la asesoría. Asimismo, el asesor o entidad de asesoría se compromete a la entrega de un INFORME FINAL, en el cual explicita la recomendación o sugerencia entregada, indicando los antecedentes, escenarios o los considerandos que sirvieron de base para la recomendación.  
Este Informe Final, deberá explicitar claramente la fecha en que se extendió y las firmas de las partes, las que podrán ser electrónicas.

OCTAVO: Voluntariedad del contrato de Asesoría Previsional y efectos de la recomendación del asesor: El presente contrato se suscribe libre y voluntariamente toda vez que para ejercer derechos previsionales no es requisito la contratación de asesoría previsional. La recomendación escrita que se otorgue por el Asesor Previsional o por la Entidad de Asesoría Previsional, esto es por medio del Informe Final, no es obligatoria para el afiliado o sus beneficiarios, pudiendo éstos optar por cualquier alternativa que les parezca conveniente. Cualquier disposición de este contrato que pudiere constituir una limitación a la libertad contractual y al derecho del afiliado a elegir AFP, tipo de fondo, cuándo pensionarse, la modalidad de pensión y la entidad que otorgue su pensión, se tendrá por no escrita.

NOVENO: Privacidad de la información: El Asesor Previsional se obliga a resguardar la privacidad de toda la información a la que acceda producto del contrato.

DÉCIMO: Independencia del Asesor Previsional: El asesor previsional declara no ser directores, accionistas, ejecutivos principales, gerentes, apoderados o dependientes de una AFP, Compañía de Seguros, Sociedad Administradora de Fondos de Cesantía, aseguradora, reaseguradora, liquidadora de siniestros o entidades que conformen el grupo empresarial de esas sociedades. Asimismo, se compromete a otorgar la asesoría previsional con absoluta independencia, no pudiendo condicionarla a otros productos o servicios propios o de una persona relacionada.

DÉCIMO PRIMERO: Prohibiciones: Se encuentra prohibido limitar en forma alguna la libre elección del contratante respecto de tomar o no la recomendación del Asesor. El Asesor no podrá entregar al contratante incentivos o beneficios adicionales al objeto de la Asesoría.

DÉCIMO SEGUNDO: Término del contrato: El afiliado podrá poner término en cualquier momento al presente contrato sin que se establezca el pago de una multa o algún otro tipo de penalización por dicha terminación, bastando para ello la comunicación de esta decisión por escrito al Asesor o a la Entidad de Asesoría Previsional, la que deberá remitirse por escrito al domicilio o correo electrónico de éste que figura en el contrato. El Asesor o la Entidad de Asesoría Previsional podrán poner término al contrato de igual forma, debiendo siempre remitir la comunicación escrita al domicilio del afiliado vía correo certificado. Con todo, se entenderá terminada la vigencia del contrato transcurrido el plazo de 3 días contado desde el envío de la comunicación.

El presente contrato de Asesoría Previsional, se firma en dos ejemplares quedando un ejemplar en poder de cada una de las partes.
`;

// === PROMPT PASO 5: CONTRATO DE ASESORÍA ===
const PROMPT_CONTRATO = `
Eres un experto legal y previsional chileno. Tu tarea es redactar las partes VARIABLES de un "Contrato de Prestación de Servicios de Asesoría Previsional".

REGLAS:
1. **RELLENO DE DATOS:** Rellena el ENCABEZADO y la cláusula PRIMERO con la información del ANÁLISIS o de los DATOS MANUALES.
2. **DATOS DEL ASESOR:** Usa siempre los datos de LUIS MAURICIO BARRÍA CHODIL.
3. **BENEFICIARIOS:** En la cláusula PRIMERO, genera la lista de beneficiarios. Si no hay, pon: "El consultante declara no contar con beneficiarios legales de pensión".
4. **CAMPOS FALTANTES:** Si faltan datos, deja el espacio en blanco subrayado (ej: __________).
5. **SALIDA:** Devuelve el contrato estructurado así:
   - El texto del ENCABEZADO directamente (NO escribas la palabra "ENCABEZADO").
   - PRIMERO: (Lista de Beneficiarios)
   - [CLAUSULAS_LEGALES_ESTANDAR] (Escribe exactamente esta etiqueta)
   - El bloque de firmas al final (NO escribas la palabra "PIE DE FIRMA" ni "FIRMAS").

---
PLANTILLA ENCABEZADO (VEJEZ/INVALIDEZ):
En TEMUCO, a {{FECHA}} suscriben el presente contrato, por una parte {{NOMBRE AFILIADO}} RUT: {{RUT AFILIADO}}, estado civil: {{ESTADO CIVIL AFILIADO}}, Fecha de Nacimiento: {{FECHA DE NACIMIENTO AFILIADO}}, profesión u oficio: {{OFICIO AFILIADO}}, Domiciliados en: {{DIRECCIÓN}}, Ciudad: {{CIUDAD}}, Comuna: {{COMUNA}} Celular N° {{CELULAR}} Correo electrónico: {{CORREO ELECTRÓNICO}}; AFP {{AFP DE ORIGEN}} , Sistema de Salud: {{SISTEMA DE SALUD}} en adelante el "Consultante" y por la otra LUIS MAURICIO BARRÍA CHODIL de Profesión u oficio ASESOR PREVISIONAL, nacido el 23-06-1979, domiciliado en AV. SAN MARTIN 924 OF 311, Ciudad, TEMUCO, Comuna, TEMUCO, Celular: 9 51698189. e-mail: luisbarria.pensiones@gmail.com,. Rep. Legal de ENTIDAD DE ASESORIA PREVISIONAL ASESORIAPENSIONES.CL SPA RUT: 78.263.233-7 inscrito en el Registro de Asesores Previsionales con el N° 1360 de la Superintendencia de Pensiones, mismo domicilio, en adelante "La Entidad de Asesoría Previsional", han suscrito el siguiente Contrato de Prestación de Servicios de Asesoría Previsional para tramitar Pensión de {{TIPO DE PENSIÓN}}.

---
PLANTILLA ENCABEZADO (SOBREVIVENCIA):
En TEMUCO, a {{FECHA}} suscriben el presente contrato, por una parte {{NOMBRE CONSULTANTE}}, RUT {{RUT CONSULTANTE}}, estado civil: {{ESTADO CIVIL CONSULTANTE}}, Nacida el {{FECHA DE NACIMIENTO CONSULTANTE}}, profesión u oficio: {{PROFESIÓN CONSULTANTE}}, Madre de hijos con derecho a pensión.,Beneficiaria de Pensión de sobrevivencia de {{NOMBRE CAUSANTE}}, RUT {{RUT CAUSANTE}}, Causante, Afiliado a AFP {{AFP DE ORIGEN}} y por la otra.,LUIS MAURICIO BARRÍA CHODIL de Profesión u oficio ASESOR PREVISIONAL, nacido el 23-06-1979, domiciliado en AV. SAN MARTIN 924 OF 311, Ciudad, TEMUCO, Comuna, TEMUCO, Celular: 9 51698189. e-mail: luisbarria.pensiones@gmail.com,. Rep. Legal de ENTIDAD DE ASESORIA PREVISIONAL ASESORIAPENSIONES.CL SPA RUT: 78.263.233-7 inscrito en el Registro de Asesores Previsionales con el N° 1360 de la Superintendencia de Pensiones, mismo domicilio, en adelante "La Entidad de Asesoría Previsional", han suscrito el siguiente Contrato de Prestación de Servicios de Asesoría Previsional para tramitar Pensión de {{TIPO DE PENSIÓN}}.

---
FIRMAS:
| LUIS MAURICIO BARRÍA CHODIL | {{NOMBRE AFILIADO/CONSULTANTE}} |
| 9.319.028-9 | RUT: {{RUT AFILIADO/CONSULTANTE}} |
| ASESOR PREVISIONAL | CONSULTANTE |
| Rep. Legal Entidad de Asesoria Previsional Asesoriapensiones.cl SPA | |
`;

export async function detectPensionType(analysis: string): Promise<'vejez-invalidez' | 'sobrevivencia'> {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Basado en el siguiente análisis previsional, determina si el tipo de pensión es "vejez-invalidez" o "sobrevivencia". Responde ÚNICAMENTE con una de esas dos opciones en minúsculas.\n\nAnálisis:\n${analysis}`,
    config: { temperature: 0 }
  });
  const type = response.text?.trim().toLowerCase();
  return type === 'sobrevivencia' ? 'sobrevivencia' : 'vejez-invalidez';
}

export async function detectMissingContractData(analysis: string, type: 'vejez-invalidez' | 'sobrevivencia'): Promise<string[]> {
  try {
    const ai = getAI();
    const model = "gemini-3-flash-preview";
    const response = await ai.models.generateContent({
      model,
      contents: `Analiza el informe previsional y la plantilla de contrato para ${type}.
      Identifica qué datos del CONSULTANTE faltan para completar el contrato (ej: Domicilio, Profesión u Oficio, Celular, Estado Civil, Correo electrónico, Sistema de Salud, AFP de Origen).
      
      NOTA: Los Honorarios NO deben ser solicitados ya que son fijos según la plantilla (1.5% RV / 1.2% RP).
      
      Responde ÚNICAMENTE con una lista de los nombres de los campos faltantes separados por comas. Si no falta nada, responde "NINGUNO".
      
      Informe:\n${analysis}`,
      config: { temperature: 0 }
    });
    
    const text = response.text?.trim() || "";
    if (text === "NINGUNO" || !text) return [];
    return text.split(',').map(s => s.trim()).filter(s => s.length > 0);
  } catch (err) {
    console.error("Error en detectMissingContractData:", err);
    return [];
  }
}

export async function generateContract(analysis: string, type: 'vejez-invalidez' | 'sobrevivencia', manualData?: string): Promise<string> {
  try {
    const ai = getAI();
    const model = "gemini-3-flash-preview";
    
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [{
            text: `
              Genera las partes VARIABLES de un Contrato de Asesoría Previsional para un caso de ${type.toUpperCase()}.
              
              INSTRUCCIONES:
              1. Rellena el ENCABEZADO y la cláusula PRIMERO.
              2. Incluye la etiqueta [CLAUSULAS_LEGALES_ESTANDAR] después de la cláusula PRIMERO.
              3. Finaliza con el PIE DE FIRMA.
              
              DATOS ADICIONALES MANUALES:
              ${manualData || "Ninguno"}
              
              CONTEXTO DEL CASO (ANÁLISIS PREVIO):
              ${analysis}
            `
          }]
        }
      ],
      config: {
        systemInstruction: PROMPT_CONTRATO,
        temperature: 0.1,
      }
    });

    let text = response.text;
    if (!text || text.length < 50) {
      throw new Error("La IA no generó el contenido del contrato.");
    }

    // Limpieza de etiquetas no deseadas que la IA podría incluir por error
    text = text.replace(/ENCABEZADO:?/gi, "");
    text = text.replace(/PIE DE FIRMA:?/gi, "");
    text = text.replace(/FIRMAS:?/gi, "");

    // Inyectamos las cláusulas legales fijas para evitar el filtro de RECITATION
    if (text.includes("[CLAUSULAS_LEGALES_ESTANDAR]")) {
      text = text.replace("[CLAUSULAS_LEGALES_ESTANDAR]", CLAUSULAS_LEGALES_FIJAS);
    } else {
      // Si por alguna razón no incluyó la etiqueta, intentamos insertarla después de PRIMERO
      const splitPoint = text.indexOf("PRIMERO:");
      if (splitPoint !== -1) {
        const nextLine = text.indexOf("\n", splitPoint + 10);
        if (nextLine !== -1) {
          text = text.slice(0, nextLine) + "\n" + CLAUSULAS_LEGALES_FIJAS + "\n" + text.slice(nextLine);
        }
      }
    }

    return text;
  } catch (err: any) {
    console.error("Error detallado en generateContract:", err);
    throw new Error(err.message || "Error al conectar con el servicio de generación.");
  }
}

export async function generateAnalysis(files: FileData[]): Promise<string> {
  try {
    const ai = getAI();
    const model = "gemini-3-flash-preview";
    const parts = files.map(file => ({
      inlineData: { data: file.data, mimeType: file.mimeType }
    }));

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [...parts, { text: "Genera el análisis previsional (Secciones 1-5) basado en estos documentos." }] },
      config: {
        systemInstruction: PROMPT_ANALISIS,
        temperature: 0.1,
      }
    });

    if (!response || !response.text) {
      throw new Error("La IA no devolvió una respuesta válida.");
    }

    return response.text;
  } catch (err: any) {
    console.error("Error en generateAnalysis:", err);
    if (err.message?.includes("API_KEY_INVALID")) {
      throw new Error("La clave de API es inválida. Por favor, selecciona una clave válida.");
    }
    if (err.message?.includes("quota")) {
      throw new Error("Se ha excedido la cuota de la API. Por favor, intenta más tarde.");
    }
    throw new Error(err.message || "Error al conectar con la IA.");
  }
}

export async function generateRecommendation(analysis: string, instructions: string): Promise<string> {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `
      INSTRUCCIONES DEL ASESOR: "${instructions}"
      ---
      CONTEXTO (ANÁLISIS 1-5):
      ${analysis}
      ---
      Genera la Sección 6: Recomendación Final.
    `,
    config: {
      systemInstruction: PROMPT_RECOMENDACION,
      temperature: 0.2,
    }
  });

  return response.text || "No se pudo generar la recomendación.";
}

export async function modifyReport(currentReport: string, instructions: string): Promise<string> {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `
      INFORME ACTUAL:
      ${currentReport}
      ---
      INSTRUCCIONES DE MODIFICACIÓN:
      "${instructions}"
      ---
      Devuelve el informe completo modificado.
    `,
    config: {
      systemInstruction: PROMPT_MODIFICACION,
      temperature: 0.2,
    }
  });

  return response.text || currentReport;
}

export async function extractClientName(report: string): Promise<string> {
  const ai = getAI();
  const model = "gemini-3-flash-preview";
  const response = await ai.models.generateContent({
    model,
    contents: `Extrae ÚNICAMENTE el nombre completo del afiliado de este informe. Si no lo encuentras, responde "Desconocido".\n\nInforme:\n${report}`,
    config: { temperature: 0 }
  });
  return response.text?.trim() || "Desconocido";
}
