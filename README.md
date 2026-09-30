# Grilli IA

Prototipo web educativo del Instituto Grilli. Usa React, TypeScript, Vite, Express y Gemini. No incluye cuentas, base de datos ni almacenamiento de conversaciones.

## Requisitos

- Windows 10/11
- Node.js LTS (incluye npm): <https://nodejs.org/>. Descargá la versión **LTS**, instalala y volvé a abrir la terminal.
- Una clave de Gemini API creada en Google AI Studio: <https://aistudio.google.com/app/apikey>

## Preparación (solo la primera vez)

1. Descargá o descomprimí la carpeta del proyecto.
2. Abrí la carpeta `grilli-ia` en el Explorador.
3. En la barra de dirección del Explorador escribí `cmd` y presioná Enter. Se abrirá la consola en esa carpeta.
4. Instalá las dependencias:

   ```bat
   npm install
   ```

5. En la carpeta principal, copiá `.env.example` y llamá a la copia `.env`.
6. Abrí `.env` con el Bloc de notas y pegá tu clave después del signo igual:

   ```env
   GEMINI_API_KEY=PEGA_ACA_TU_CLAVE
   ```

   Guardalo. **La clave va únicamente en este `.env`**. No la pegues en `src`, en el navegador, en un mensaje, ni compartas el `.env`. El archivo está excluido de Git.

## Iniciar Grilli IA

Se usan dos ventanas de consola, ambas abiertas dentro de la carpeta del proyecto.

1. En la primera, iniciá el backend:

   ```bat
   npm run dev:server
   ```

   Debe mostrar `Backend Grilli IA listo en http://localhost:3001`.

2. Abrí una segunda ventana de CMD en la carpeta y ejecutá el frontend:

   ```bat
   npm run dev:client
   ```

3. Abrí la dirección que Vite muestre, normalmente <http://localhost:5173>.
4. Para detener cada proceso, volvé a su ventana y presioná `Ctrl + C`.

## Probar y compilar

```bat
npm test
npm run build
```

`npm test` prueba el flujo de conversación, rechazo de consultas fuera de tema, turnos consecutivos, anonimización básica de datos y errores del proveedor, sin consumir llamadas de Gemini.

## Ajustes sencillos

- Modelo Gemini: `server/config.js` y `server/index.js` (la variable opcional `GEMINI_MODEL` permite cambiarlo desde `.env`).
- Instrucciones y filtro de alcance: `server/prompt.js`.
- Diseño y sugerencias: `src/App.tsx` y `src/styles.css`.
- Gemini recibe hasta 12 mensajes recientes por petición. La clave solo se lee en el backend.

El modelo predeterminado es `gemini-2.5-flash-lite`. Google indica disponibilidad del modelo y opciones gratuitas sujetas a límites y condiciones vigentes de la cuenta: <https://ai.google.dev/gemini-api/docs/pricing>.
