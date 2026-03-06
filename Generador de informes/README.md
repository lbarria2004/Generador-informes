# Asesor IA - Sistema Previsional Chileno

Esta es una aplicación avanzada diseñada para asesores previsionales en Chile. Utiliza inteligencia artificial (Google Gemini) para analizar documentos SCOMP, certificados de saldos y otros antecedentes, generando informes técnicos y contratos de asesoría de forma automatizada.

## Características

- 📄 **Análisis Multimodal:** Carga de PDFs e imágenes de documentos previsionales.
- 🤖 **Inteligencia Artificial:** Generación de informes técnicos detallados basados en la normativa chilena.
- ⚖️ **Contratos Legales:** Redacción automática de contratos de asesoría con cláusulas legales actualizadas (D.L. 3.500).
- 📱 **Diseño Responsivo:** Optimizado para uso en computadores y dispositivos móviles.
- 📥 **Exportación a Word:** Descarga de informes y contratos en formato .docx con formato profesional.

## Requisitos Previos

- [Node.js](https://nodejs.org/) (versión 18 o superior)
- Una API Key de [Google AI Studio](https://aistudio.google.com/) (Gemini API)

## Instalación Local

1. **Clonar o descargar el proyecto:**
   ```bash
   # Si usas git
   git clone <url-del-repositorio>
   cd asesor-ia
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Crea un archivo `.env` en la raíz del proyecto basándote en `.env.example`:
   ```env
   GEMINI_API_KEY=tu_api_key_aqui
   ```

4. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:3000`.

## Despliegue (Publicación)

La forma más sencilla de publicar esta aplicación es usando **Vercel** o **Netlify**:

### Opción 1: Vercel (Recomendado)

1. Sube tu código a un repositorio en **GitHub**.
2. Ve a [Vercel](https://vercel.com/) y conecta tu cuenta de GitHub.
3. Selecciona el repositorio de "Asesor IA".
4. En la configuración del proyecto, añade la variable de entorno:
   - `GEMINI_API_KEY`: Tu llave de la API de Gemini.
5. Haz clic en **Deploy**.

### Opción 2: Netlify

1. Sube tu código a **GitHub**.
2. Ve a [Netlify](https://www.netlify.com/) y selecciona "Add new site" -> "Import from git".
3. Configura la variable de entorno `GEMINI_API_KEY` en "Site settings" -> "Environment variables".
4. El comando de build es `npm run build` y el directorio de salida es `dist`.

## Estructura del Proyecto

- `src/App.tsx`: Componente principal y lógica de la interfaz.
- `src/services/geminiService.ts`: Integración con la API de Google Gemini y prompts especializados.
- `src/utils/docxExport.ts`: Lógica para generar archivos Word profesionales.
- `src/index.css`: Estilos globales y configuración de Tailwind CSS.

## Notas de Seguridad

Esta aplicación maneja datos sensibles. Asegúrate de:
- No subir tu archivo `.env` al repositorio público (ya está incluido en `.gitignore`).
- Configurar correctamente las políticas de privacidad en tu plataforma de despliegue.

---
Desarrollado para el Sistema Previsional Chileno.
