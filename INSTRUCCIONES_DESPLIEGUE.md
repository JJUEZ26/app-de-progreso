# Instrucciones de Despliegue Securo - MetaLogic

Para que tu aplicación funcione con la IA de Google de forma segura (sin que nadie te robe la llave), sigue estos pasos:

### 1. Subir a GitHub
1. Crea un nuevo repositorio en tu GitHub (puedes llamarlo `metalogic-app`).
2. Sube todos los archivos de esta carpeta a ese repositorio.
   - *Nota: Verás que el archivo `.gitignore` evitará que se suban archivos innecesarios.*

### 2. Conectar con Vercel
1. Ve a [vercel.com](https://vercel.com) e inicia sesión con tu GitHub.
2. Haz clic en **"Add New"** > **"Project"**.
3. Importa el repositorio `metalogic-app` que acabas de crear.

### 3. Configurar la LLave API (CRITICO)
Antes de darle a "Deploy", o una vez creado el proyecto:
1. Ve a la pestaña **Settings** de tu proyecto en Vercel.
2. En la barra lateral, selecciona **Environment Variables**.
3. Añade una nueva variable:
   - **Key**: `GOOGLE_API_KEY`
   - **Value**: `AIzaSyAmpUpKUhpIFz8HRA7lH5wd8Tb78pJVMO4`
4. Haz clic en **Save** / **Add**.

### 4. ¡Listo!
Vercel desplegará tu app. La dirección que te dé (ej: `metalogic-app.vercel.app`) ya tendrá la IA funcionando de forma totalmente privada y segura.

---

**¿Por qué lo hacemos así?**
Si pusiéramos la llave directamente en el código JavaScript (Frontend), cualquier persona que visite tu web podría abrir la consola y robártela. Al usar una "Serverless Function" en la carpeta `/api`, la llave se queda en el servidor de Vercel y nunca viaja al navegador del usuario.
