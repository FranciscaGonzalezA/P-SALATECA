INSERT INTO sources (name, source_type, base_url)
VALUES ('Salateca de Cine', 'website', 'https://salatecadecine.cl')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  source_type = VALUES(source_type);

INSERT INTO posts (
  source_id,
  title,
  body,
  image_url,
  source_url,
  keywords
)
SELECT
  sources.id,
  'RESEÑA – La Vida que Vendrá dir. Karin Cuyul',
  'Al parecer, casi-siempre hay un álbum mental de postales de lugares que se conocen a través de historias, sean propias o ajenas. Otros que se reconocen por una nostalgia de ojalá haberles habitado, y unos pocos incluso, que se distinguen por las ansias de revivirlos a través de algo-que-no-se-sabe-bien-qué-es, pero que se espera arrastre también emociones que parecen ajenas al ahora.

Ahí, precisamente en esa mezcla de emociones y procesos sociales removiéndose entre archivos, es que el documental «La Vida que Vendrá» se enmarca como una bitácora sobre la esperanza, el miedo, la frustración y el compromiso de un Chile que ya existió. Pero que aún siendo lejano, todavía comparte como rasgo la búsqueda de un sueño colectivo, los discursos fraccionados y el desencanto de proyectos inconclusos.

Esa dualidad que complementa archivos con grabaciones amateur y la experiencia propia hecha voz en off, consigue establecer ese juego cíclico donde la mirada se sumerge en imágenes que bien son la restauración de cintas antiguas, la baja calidad de alguna imagen captada a principios del 2000 o podrían teñirse en el filtro de un video actual queriendo disfrazarse de algo antiguo.

Todo esto con la intención de hacer morisquetas gritando cómo las preguntas sobre nuestra realidad país, se repiten y mantienen vigentes.

¿Qué pasa, entonces, si esas preguntas se reiteran en supuestos fracasos?

Karin Cuyul, más que buscar una respuesta rígida, revive memorias subterráneas y discursos inconclusos del país para plantear cuestionamientos en cómo el resultado de los procesos sociales no borran la posibilidad de las quimeras; de los sueños como fuerza que impulsa, y da atisbos de futuro cuando éstos se trenzan a la conciencia y la memoria hecha acción.

Indicios que se hacen fundamentales cuando pareciera que colectivamente, la búsqueda de explicaciones o la tristeza grabada en la boca de lo-que-casi-fue, sigue siendo la (justificada) única emoción dominante. Es ahí, donde este documental consigue otorgar un trazo de recomposición a la esperanza, sabiéndola digna de paciencia, incisión e insistencia.

Maira Escobar Riveros',
  'https://salatecadecine.cl/wp-content/uploads/2026/05/image-819x1024.png',
  'https://salatecadecine.cl/resena-la-vida-que-vendra-dir-karin-cuyul/',
  JSON_ARRAY('cine chileno', 'documental', 'memoria', 'movimientos sociales', 'esperanza colectiva', 'archivos audiovisuales', 'Chile', 'Karin Cuyul', 'procesos sociales')
FROM sources
WHERE sources.base_url = 'https://salatecadecine.cl'
ON DUPLICATE KEY UPDATE
  source_id = VALUES(source_id),
  title = VALUES(title),
  body = VALUES(body),
  image_url = VALUES(image_url),
  keywords = VALUES(keywords);

INSERT INTO posts (
  source_id,
  title,
  body,
  image_url,
  source_url,
  keywords
)
SELECT
  sources.id,
  'RESEÑA- AL SUR DEL INVIERNO ESTÁ LA NIEVE',
  'Hace un par de meses vi Al Sur del Invierno está la Nieve, documental que retrata el paso del invierno en la inhóspita Patagonia chilena. El director, Sebastián Vidal, ya ha residido por diferentes períodos de su vida en el extremo sur del país, yo por mi parte, he sido santiaguina casi toda mi vida. Con ese trasfondo, salí de la sala sin saber bien qué sentir ni qué pensar, acongojada por imágenes de heladas y muerte.

La película es un documental observacional, uno en que la cámara toma su distancia mientras permite que la escena hable por sí misma, sin narración en off ni intervención otra de parte del director salvo una particular excepción.

Este tipo de documental usualmente se problematiza por sus pretensiones de realidad, se asume que como la cámara toma su distancia, evita la reacción y el movimiento, los cineastas no intervienen en escena, ni el montaje entorpece el paso del tiempo con sus cortes; entonces lo presentado es un captura fidedigna del momento.

De allí la problemática, de la apariencia de realidad, porque la cámara siempre es una intervención, siempre tiene presencia, y lo que se elige entre lo que se muestra o no, revela una voz. ¿Cómo podemos decir que la cámara es objetiva cuando esta asume un tiempo y un lugar en el mundo? ¿cuando asume una posición, una perspectiva?

La técnica del documental observacional, entonces, más que aparentar verdad, pareciera fría e indiferente. La cámara, en Al Sur del Invierno está la Nieve, permanece quieta, distante desde sus planos generales, contenta en mostrar los aconteceres de un territorio marcado por la naturalidad de la muerte.

Pareciera gracioso, calificar a la muerte de natural como si fuera algo fuera de ese mundo. Pero en la ciudad, Santiago por lo menos, la muerte está desnaturalizada, es ocultada bajo la alfombra porque esta es un abrupto fin a procesos que demandan continuar para permanecer funcionales.

Nuestra vida, nuestra producción y convivencia, es en cierto grado dependiente de la explotación de otros, de la muerte también: al construir una nueva carretera se entiende un costo de vidas asociado a ello, un número de accidentes necesarios para que las personas puedan continuar en su camino. Pero para muchos, incluyéndome, esta relación permanece oculta, bajo la superficie de las cosas.

A Sebastián Vidal y su equipo no le podrían importar menos estas pretensiones, este falso decoro. Su película utiliza las maneras frías y distantes del documental observacional, para realzar el atributo natural de un paisaje gélido, inhóspito e impasible.

La cámara se detiene en la acción de un matadero, el cuerpo degollado de los animales, con el mismo nivel de detención que le presta a un grupo de personas tomando desayuno. Personas relatan la muerte de sus conocidos a garras de pumas o a la crueldad del invierno con la cotidianidad propia con la que en la ciudad conversamos de una mala jornada de trabajo. Porque es parte evidente del día a día.

La cámara, siempre detenida, permanece en un territorio sublime, pero a la vez espectral. Los pocos momentos que la película se permite adentrar en poéticas más aparentes, corresponden a pequeños intersticios en que palabras se funden sobre el plano, contando relatos sobre el paso del tiempo y los pequeños rituales que le acompañan.

La voz de sus habitantes introduciéndose de forma más directa en el entretejido de la película, en un espacio que permanece imperturbable, en que lo humano es por sobre todas las cosas… transitorio.

Entonces esa fue mi experiencia. Quedé incómoda, adolorida e impotente; esa es mi reacción como una santiaguina culiá, como alguien que puede olvidarse de la muerte sin mayor problema. ¿Cómo la verían en la Región de Magallanes? yo no puedo decir, pero puedo creer que la verían como algo real.

Eleonor Figueroa, salatecóloga.',
  'https://salatecadecine.cl/wp-content/uploads/2026/01/Al-sur-del-invierno-esta-la-nieve-1-930x620.jpg',
  'https://salatecadecine.cl/resena-al-sur-del-invierno-esta-la-nieve/',
  JSON_ARRAY('documental observacional', 'Patagonia chilena', 'invierno', 'muerte', 'naturaleza', 'Magallanes', 'Sebastián Vidal', 'territorio austral', 'paisaje')
FROM sources
WHERE sources.base_url = 'https://salatecadecine.cl'
ON DUPLICATE KEY UPDATE
  source_id = VALUES(source_id),
  title = VALUES(title),
  body = VALUES(body),
  image_url = VALUES(image_url),
  keywords = VALUES(keywords);

INSERT INTO posts (
  source_id,
  title,
  body,
  image_url,
  source_url,
  keywords
)
SELECT
  sources.id,
  'SALATECA WRAPPED',
  'Para cumplir nuestro rol de difusión dedicamos largas horas a levantar y sistematizar información de más de 50 espacios de exhibición de cine. Después de un semestre compartiéndoles la cartelera de cine independiente más completa de la Región Metropolitana ¿Qué podemos sacar en limpio? Descúbrelo más en profundidad en nuestro informe Cartelera en datos: Análisis estadístico de la programación cinematográfica de las salas de cine independiente de la Región Metropolitana Primer Semestre 2024

El presente informe constituye el análisis de la proyección de películas en las salas de cine independiente de Santiago de Chile, durante el primer semestre de 2024. El objetivo principal es describir la programación en estos espacios, identificando patrones y posibles brechas, particularmente, en la representación de género y en la diversidad de directores y géneros cinematográficos.

Los datos utilizados en este análisis fueron recopilados por Salateca de Cine, una organización dedicada a la difusión, investigación y preservación de la memoria en torno a los espacios de exhibición de cine independiente en Santiago. A través de este estudio, se busca ofrecer una visión respecto a la programación actual de estas salas, resaltando tanto las tendencias dominantes.

El informe se estructura en varias secciones. Primero, se describe el proceso de recopilación y procesamiento de datos. En segundo lugar, se presentan los resultados del análisis, divididos en categorías que incluyen películas exhibidas, directores, y un enfoque especial en la representación de mujeres en la dirección cinematográfica.

Finalmente, se ofrecen conclusiones y se proponen posibles líneas de estudios futuras, para profundizar en el entendimiento de las dinámicas que rigen la programación en los ciness independientes y cineclubs de Santiago.

Te invitamos a mirarlo y a descargarlo abajo!!

Cartelera en datos — Descarga',
  NULL,
  'https://salatecadecine.cl/salateca-wrapped/',
  JSON_ARRAY('cartelera de cine', 'cine independiente', 'Santiago', 'programación cinematográfica', 'análisis estadístico', 'representación de género', 'diversidad', 'Salateca de Cine', 'primer semestre 2024')
FROM sources
WHERE sources.base_url = 'https://salatecadecine.cl'
ON DUPLICATE KEY UPDATE
  source_id = VALUES(source_id),
  title = VALUES(title),
  body = VALUES(body),
  image_url = VALUES(image_url),
  keywords = VALUES(keywords);

INSERT INTO posts (
  source_id,
  title,
  body,
  image_url,
  source_url,
  keywords
)
SELECT
  sources.id,
  'Cine insurgente – No son 30 pesos: Chile, genealogía de una insurrección',
  'Hace sólo un par de días, tuvimos la oportunidad de ver «No son 30 pesos, Chile genealogía de una insurrección», un documental que desde sus primeras escenas nos introduce al Chile previo al estallido social, en agosto del 2019. Nos muestra imágenes del Metro de Santiago, con especial énfasis en la intervenida estación Baquedano, que en 2019 destapó acusaciones ciudadanas sobre torturas en este espacio, más decantó en un caso sobreseído el 2020.

Por esa y otras razones todavía palpables, resulta ser un Chile del que todavía es difícil hablar, aunque existen espacios de reflexión como el propio documental.

Parece muy impresionante que ya hayan pasado cinco años desde el estallido social. Debido a este contexto, se gesta este proyecto de Salateca, aunque suene extraño… Y es que, desde hace varios años, en Santiago existe un circuito cultural muy variado y en crecimiento en torno al cine, que posterior al estallido social, y al confinamiento por el virus del COVID-2019, se vio puesto en pausa de forma brusca.

Por ello, una vez pasada la reclusión de la pandemia, surgió la necesidad imperiosa de hacer memoria de esos espacios expuestos a incendios, cierres, itinerancia y auto-organización, buscando rescatar y destacar el fecundo panorama cultural de todo el cine que es exhibido en espacios independendientes en Santiago. Así, este documental nos moviliza y conecta con el afán de contar una historia siempre amenazada al olvido o peor, a desestimarla.

Este relato vinculado a querer ser “un film de intervención”, ante el olvido tanto de acontecimientos, como figuras relevantes en el enfrentamiento a la dictadura, utiliza diversas formas de representar la memoria, como archivos televisivos, cartas, fotografías, entrevistas, música de protesta, representaciones de testimonios y espacios en los que se desarrolla la narración e igualmente se exhibe.

Incluso, en esa misma línea, destaca especialmente en el metraje cómo introducen el rol del Museo de la Memoria y los Derechos Humanos, como un protagonista especial en la película que no es sólo una fuente de archivo o un espacio físico, sino que enfatiza la labor pedagógica del traspaso de memoria al enfocar a niñes y adolescentes escuchando, por ejemplo, sobre el atentado a Pinochet en voz del guía, que igualmente a nosotrxs como espectadorxs nos contextualiza.

Haciendo del mismo espacio un relato audiovisual, y lo mismo audiovisual como un intento de situarnos en el espacio y tiempo histórico de forma diferida.

Aunque, es diferido sólo desde lo cronológico, puesto que el filme nacido en el alero del grupo Cine Insurgente, narra los hechos evidenciando un cierto “caldo de cultivo” como mencionan casi al final de éste. Aquello nos recuerda que los procesos funcionan como un espejo que nos muestra su reflejo años después, uno que tiene sus propios bastiones y sus inherentes luchas, pero que aún así nos recuerdan que la raíz común sigue levantando motivos por los que manifestarse.

Quizá el ejemplo más evidente sea pensar en cómo letras de Jorge González que habían tenido su movida en 1986, funcionaban de canto conjunto en 2019, evidenciando que las cosas no habían cambiado verdaderamente y que, además se hacían parte de un cancionero consciente en otras generaciones.

Lo mismo ocurre con Fernando Krichmar (director de la película, de origen argentino), que narra el recitar la Cantata de Santa María de Iquique a los ocho años al otro lado de la cordillera o mi experiencia, que renació de un recordar borroso donde mi papá cantaba «este animal tira todo, si le agarra bien el modo, con usted va a charchalear…», evocando emociones tan profundas como resonantes.

Haciendo que desde historia y biografía, la música sea otro personaje más en la narración del documental, junto a los mencionados espacios; canciones de lucha e ilusión acompañan escenas de protestas y reuniones clandestinas, actuando como un puente entre prosa-acción y herramientas de narración-resistencia.

En este puente, que también es uno constante entre pasado y presente, lo cíclico de los hechos y la relatividad del tiempo, existe una idea que trasciende el tiempo y espacio, que es el tomar una posición no pasiva como sujeto.

El «¿Qué hubieses hecho tú?» es por lejos una pregunta compleja, con su correspondiente carga moral, valórica e ideológica, pero que tras todo el daño emocional y humano cometido en dictadura y perpetrados bajo el estallido social, la historia del FPMR nos invita a hacerle “frente” a quiénes somos como sociedad, qué hemos construido y qué queremos.

Así, el metraje logra armarse como un viaje emocional que invita a la reflexión y la comprensión de una historia de resistencia que sigue viva. Nos recuerda que la memoria no son sólo hechos, sino los cimientos de lo que somos. Pero ante todo, la resignificación de este pasado es lo que permite dar pasos distintos que den pie a esa trenza necesaria entre justicia, memoria no pasiva y reconocimiento.

Es por eso que, nuestra invitación es a ser parte de estas reflexiones, cuestionamientos, posicionamientos y mantener presente nuestra memoria como sociedad.

El documental se exhibirá el 29, 30 y 31 de agosto en el Teatro Camilo Henríquez ubicado en Amunátegui #31, en pleno Santiago Centro. Lo que da pie a una oportunidad que también nos importa destacar; la de no sólo ver porciones de historia de este país en la proyección, sino también caminarla entre butacas.

Historia que alberga desde 1954, año de inauguración de este teatro en el que cuatro años después se haría “Esta Señorita Trini”, la primera obra musical de Chile que contó con Carmen Barros como protagonista, quién luego también interpretaría a Carmela en “La Pérgola de la Flores” de Isidora Aguirre, junto a otros íconos como Ana González (nuestra queridísima Desideria en P’al otro Lao) y Héctor Noguera (que quizás se sienta pecado asociar en primera instancia a su rol como Ángel Mercader).

Aunque en este lugar también se oyeron voces como las de Víctor Jara, quien en 1962 logró dirigir “Animas de Día Claro”, escrita por Alejandro Sieveking… más aún con todo aquel repertorio a la espalda, para 1991 ya no habría más teatro o actividad en general pública en este espacio, hasta recién sesenta años después de su inauguración para el año 2014.

Así, ya con diez años pasados de aquella recuperación gracias a un adjudicado Proyecto Fondart por parte del Círculo de Periodistas, este lugar se mueve en representaciones teatrales tanto como en conciertos, musicales y cine, con disposición para 213 personas.',
  'https://salatecadecine.cl/wp-content/uploads/2024/08/banner-cine-insurgente-pagina-web.png',
  'https://salatecadecine.cl/cine-insurgente-no-son-30-pesos-chile-genealogia-de-una-insurreccion/',
  JSON_ARRAY('estallido social', 'memoria histórica', 'derechos humanos', 'FPMR', 'dictadura chilena', 'cine documental', 'resistencia', 'Teatro Camilo Henríquez', 'Fernando Krichmar', 'Cine Insurgente')
FROM sources
WHERE sources.base_url = 'https://salatecadecine.cl'
ON DUPLICATE KEY UPDATE
  source_id = VALUES(source_id),
  title = VALUES(title),
  body = VALUES(body),
  image_url = VALUES(image_url),
  keywords = VALUES(keywords);
