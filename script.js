const startBtn = document.getElementById('startBtn');
const snapBtn = document.getElementById('snapBtn');
const videoPreview = document.getElementById('videoPreview');
const statusText = document.getElementById('statusText');
const canvasHidden = document.getElementById('canvasHidden');
const resultContainer = document.getElementById('resultContainer');
const captureResult = document.getElementById('captureResult');
const sendAiBtn = document.getElementById('sendAiBtn');

let mediaStream = null;

startBtn.addEventListener('click', async () => {
    try {
        statusText.style.display = "block";
        statusText.innerText = "Solicitando permisos para capturar pantalla o pestaña...";
        
        // La API getDisplayMedia es la encargada de pedir al navegador web
        // que comparta una pestaña, ventana o toda la pantalla.
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                displaySurface: "browser", // 'browser' le pide sugerir pestañas primero
                cursor: "always"
            },
            audio: false
        });

        // Conectar el flujo de video (stream) al elemento <video> en HTML
        videoPreview.srcObject = mediaStream;
        videoPreview.style.display = "block";
        statusText.style.display = "none";
        
        // Habilitar el botón de tomar foto
        snapBtn.disabled = false;
        startBtn.innerHTML = '<span class="icon">🔄</span> Cambiar Pestaña';

        // Evento que se dispara si el usuario hace clic en "Dejar de compartir" en el navegador
        mediaStream.getVideoTracks()[0].onended = () => {
            detenerCaptura();
        };

    } catch (err) {
        console.error("Error al capturar:", err);
        statusText.style.display = "block";
        if (err.name === "NotAllowedError") {
            statusText.innerText = "Error: El navegador denegó el permiso para capturar la pantalla. Puede que el navegador lo tenga este permiso completamente bloqueado.";
        } else {
            statusText.innerText = "Error al intentar capturar: " + err.message;
        }
    }
});

snapBtn.addEventListener('click', () => {
    if (!mediaStream) return;

    // Obtener las dimensiones reales del flujo de video
    const track = mediaStream.getVideoTracks()[0];
    const settings = track.getSettings();
    canvasHidden.width = settings.width || videoPreview.videoWidth;
    canvasHidden.height = settings.height || videoPreview.videoHeight;

    // Dibujar el fotograma actual del video en un canvas (lienzo) escondido
    const ctx = canvasHidden.getContext('2d');
    ctx.drawImage(videoPreview, 0, 0, canvasHidden.width, canvasHidden.height);

    // Transformar el canvas en una URL de imagen codificada en Base64
    const imageDataUrl = canvasHidden.toDataURL('image/png');
    
    // Mostrar la imagen final renderizada
    captureResult.src = imageDataUrl;
    resultContainer.style.display = "block";
    resultContainer.scrollIntoView({ behavior: 'smooth' });
});

sendAiBtn.addEventListener('click', () => {
    // Aquí es donde en un futuro enviarías la imagen (captureResult.src, que es el Base64) a Gemini/ChatGPT.
    alert("Procesando imagen... \n¡Captura lista para enviarse mediante la API de la IA!");
});

function detenerCaptura() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    videoPreview.style.display = "none";
    statusText.style.display = "block";
    statusText.innerText = "Captura de pantalla detenida/cerrada.";
    snapBtn.disabled = true;
    startBtn.innerHTML = '<span class="icon">📷</span> Seleccionar Pestaña para Capturar';
}
