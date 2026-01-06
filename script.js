// 1. INITIALIZE & PERMISSIONS
window.onload = () => {
    if ("Notification" in window) {
        Notification.requestPermission();
    }
    renderArchives(); 
};

let btCharacteristic; // Store this globally to maintain the connection
let dataHistory = Array(20).fill(0);
let lastAlertTime = 0;

// 2. INITIALIZE CHART
const trendCtx = document.getElementById('trendChart').getContext('2d');
const trendChart = new Chart(trendCtx, {
    type: 'line',
    data: {
        labels: Array(20).fill(''),
        datasets: [{
            data: dataHistory,
            borderColor: '#00f2ff',
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(0, 242, 255, 0.1)',
            pointRadius: 0
        }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { display: false }, x: { display: false } } }
});

// 3. BLUETOOTH FIX (Function name changed to 'connect' to match your HTML)
async function connect() {
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'HC' }], 
            optionalServices: ['00001101-0000-1000-8000-00805f9b34fb'] 
        });
        
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('00001101-0000-1000-8000-00805f9b34fb');
        const characteristic = await service.getCharacteristic('00001101-0000-1000-8000-00805f9b34fb');
        
        btCharacteristic = characteristic;

        // Start listening for data from Arduino
        await btCharacteristic.startNotifications();
        btCharacteristic.addEventListener('characteristicvaluechanged', (event) => {
            const decoder = new TextDecoder();
            const message = decoder.decode(event.target.value);
            handleIncomingData(message);
        });

        document.getElementById("status").innerText = "CORE: ONLINE";
        document.getElementById("status").className = "status-online";
        document.getElementById("status").style.color = "#00f2ff";
        
        console.log("Connected to", device.name);
        
    } catch (err) {
        console.log("BT Error: " + err);
        alert("Bluetooth Connection failed. Ensure Bluetooth is on and device is paired.");
    }
}

// 4. DATA HANDLING & NOTIFICATIONS
function handleIncomingData(msg) {
    msg = msg.toLowerCase().trim();
    let threatFound = false;
    let type = "";
    let alertMsg = "";

    if (msg.includes("fire")) { 
        triggerAlert("fire", "CRITICAL", "Thermal spike detected!"); 
        threatFound = true; type = "FIRE"; alertMsg = "Fire Detected!";
    }
    if (msg.includes("smoke")) { 
        triggerAlert("smoke", "DANGER", "Smoke density high!"); 
        threatFound = true; type = "SMOKE"; alertMsg = "Smoke Detected!";
    }
    if (msg.includes("intruder")) { 
        triggerAlert("laser", "BREACH", "Laser beam cut!"); 
        threatFound = true; type = "INTRUDER"; alertMsg = "Intruder Alert!";
    }
    if (msg.includes("object")) { 
        triggerAlert("motion", "PROXIMITY", "Object detected nearby."); 
        threatFound = true; type = "MOTION"; alertMsg = "Object Detected!";
    }
    if (msg.includes("rain")) { 
        triggerAlert("water", "WET", "Precipitation detected!"); 
        threatFound = true; type = "WATER"; alertMsg = "Rain Detected!";
    }

    if (threatFound) {
        speakAI(alertMsg);
        if (Date.now() - lastAlertTime > 5000) {
            sendPhoneNotification(type, alertMsg);
            saveRecord(type);
            lastAlertTime = Date.now();
        }
    }

    dataHistory.push(threatFound ? 100 : 0);
    dataHistory.shift();
    trendChart.update();
}

// 5. PHONE SYSTEM NOTIFICATION
function sendPhoneNotification(type, message) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("AISMART SYSTEM ALERT", {
            body: `Emergency: ${type} - ${message}`,
            icon: "https://cdn-icons-png.flaticon.com/512/2092/2092218.png",
            vibrate: [200, 100, 200]
        });
    }
}

// 6. UI FUNCTIONS
function triggerAlert(id, status, text) {
    const card = document.getElementById(id);
    if (card) {
        card.classList.add("alarm");
        document.getElementById(`val-${id}`).innerText = status;
        document.getElementById("ai-thought").innerText = text;

        setTimeout(() => {
            card.classList.remove("alarm");
            // Reset logic
            let resetVal = "STABLE";
            if (id === 'smoke') resetVal = "NOMINAL";
            if (id === 'laser') resetVal = "SECURE";
            if (id === 'motion') resetVal = "CLEAR";
            if (id === 'water') resetVal = "DRY";
            
            document.getElementById(`val-${id}`).innerText = resetVal;
        }, 5000);
    }
}

function sendChat() {
    const input = document.getElementById("chatInput");
    if (!input.value.trim()) return;
    addChatMsg(input.value, "user-msg");
    
    setTimeout(() => {
        let response = "Scanning neural nodes. System status nominal.";
        if (input.value.toLowerCase().includes("summary")) response = "AISMART Log: All sensors active and secure.";
        addChatMsg(response, "ai-msg");
        speakAI(response);
    }, 600);
    input.value = "";
}

function addChatMsg(text, className) {
    const body = document.getElementById("chat-body");
    const msg = document.createElement("div");
    msg.className = className;
    msg.innerText = text;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
}

function speakAI(text) {
    if ('speechSynthesis' in window) {
        const speech = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(speech);
    }
}

function saveRecord(type) {
    const grid = document.getElementById("archive-grid");
    if (grid) {
        const el = document.createElement("div");
        el.className = "record-card";
        el.innerHTML = `<strong>${type} ALERT</strong><br>${new Date().toLocaleTimeString()} - Neural event logged.`;
        grid.prepend(el);
    }
}

function stopAlarm() {
    window.speechSynthesis.cancel();
    document.querySelectorAll('.card').forEach(t => t.classList.remove('alarm'));
    document.getElementById("ai-thought").innerText = "Alarms manually silenced.";
}

function handleChatKey(e) { if (e.key === "Enter") sendChat(); }

function renderArchives() {
    // Basic function to prevent errors from window.onload
    console.log("Archive system ready.");
}