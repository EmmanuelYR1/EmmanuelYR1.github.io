const captureBtn = document.getElementById('captureBtn');
const askBtn = document.getElementById('askBtn');
const discardBtn = document.getElementById('discardBtn');
const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement');
const previewContainer = document.getElementById('previewContainer');
const screenshotPreview = document.getElementById('screenshotPreview');
const promptInput = document.getElementById('promptInput');
const responseSection = document.getElementById('responseSection');
const responseContent = document.getElementById('responseContent');
const loadingIndicator = document.getElementById('loadingIndicator');

let currentImageBase64 = null;

captureBtn.addEventListener('click', async () => {
    try {
        // Solicitar permisos para grabar pantalla
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                displaySurface: "monitor" // Preferir monitor completo
            }
        });

        videoElement.srcObject = stream;
        
        // Esperar a que el video cargue su metadata para saber las dimensiones
        videoElement.onloadedmetadata = () => {
            // Ajustar el canvas al tamaño del video
            canvasElement.width = videoElement.videoWidth;
            canvasElement.height = videoElement.videoHeight;
            
            // Dibujar el frame actual en el canvas
            const ctx = canvasElement.getContext('2d');
            ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
            
            // Obtener la imagen en base64
            // Quitamos el prefijo 'data:image/jpeg;base64,' para la API de Gemini
            currentImageBase64 = canvasElement.toDataURL('image/jpeg', 0.8);
            
            // Mostrar la imagen
            screenshotPreview.src = currentImageBase64;
            previewContainer.style.display = 'block';
            captureBtn.style.display = 'none';
            askBtn.disabled = false;

            // Detener todos los tracks de la grabación de pantalla
            stream.getTracks().forEach(track => track.stop());
        };

    } catch (err) {
        console.error("Error al capturar la pantalla: ", err);
        alert("No se pudo capturar la pantalla. Asegúrate de dar los permisos necesarios.");
    }
});

discardBtn.addEventListener('click', () => {
    currentImageBase64 = null;
    screenshotPreview.src = '';
    previewContainer.style.display = 'none';
    captureBtn.style.display = 'block';
    askBtn.disabled = true;
    responseSection.style.display = 'none';
});

askBtn.addEventListener('click', async () => {
    const apiKey = "AIzaSyAqu8pMMwVY9-dXyWNkXAYH1H0NYgQv8QE";
    const prompt = promptInput.value.trim();

    if (!prompt) {
        alert("Por favor, escribe una pregunta para la IA.");
        return;
    }

    if (!currentImageBase64) {
        alert("Por favor, captura tu pantalla primero.");
        return;
    }

    // Preparar UI para la carga
    responseSection.style.display = 'block';
    responseContent.innerHTML = '';
    loadingIndicator.style.display = 'block';
    askBtn.disabled = true;

    try {
        // Extraer solo la parte en base64 (remover el data URI prefix)
        const base64Data = currentImageBase64.split(',')[1];

        // 1. Encontrar un modelo válido dinámicamente consultando qué modelos tiene disponibles tu API Key
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!modelsRes.ok) throw new Error("Error al validar tu API Key con Google.");
        
        const modelsData = await modelsRes.json();
        
        // Buscamos un modelo que sea rápido (flash) o potente (pro) y que podamos estar seguros de que soporta visión en esta era
        let selectedModelEndpoint = "";
        for (const m of modelsData.models) {
            if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                // Buscamos "flash" (los modelos flash desde 1.5 son todos multimodales) o "pro" (omitiendo el viejo 1.0 que es solo texto)
                if (m.name.includes("flash") || m.name.includes("pro-vision") || m.name.includes("gemini-2")) {
                    selectedModelEndpoint = `https://generativelanguage.googleapis.com/v1beta/${m.name}:generateContent?key=${apiKey}`;
                    console.log("✅ Modelo seleccionado automáticamente por tu API Key:", m.name);
                    break;
                }
            }
        }

        if (!selectedModelEndpoint) {
            throw new Error("Tu API Key no tiene habilitado o autorizado ningún modelo actual de Gemini.");
        }

        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: "image/jpeg",
                            data: base64Data
                        }
                    }
                ]
            }]
        };

        const response = await fetch(selectedModelEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `Error status ${response.status}`);
        }

        const data = await response.json();
        const textResponse = data.candidates[0].content.parts[0].text;
        
        // Usar marked para parsear markdown
        responseContent.innerHTML = marked.parse(textResponse);

    } catch (error) {
        console.error("Error en la petición a la IA: ", error);
        responseContent.innerHTML = `<p style="color: #ef4444;"><strong>Error:</strong> ${error.message}</p>`;
    } finally {
        loadingIndicator.style.display = 'none';
        askBtn.disabled = false;
    }
});
