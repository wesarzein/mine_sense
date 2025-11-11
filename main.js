document.addEventListener('DOMContentLoaded', () => {
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const maxPoints = 50;

  // ==== Función para crear gráfico ====
  const createChart = (ctx, label, color) => new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [{ label, data: [], borderColor: color, fill: false, tension: 0.3 }] },
    options: {
      responsive: true,
      animation: false,
      plugins: { legend: { labels: { color: '#e0e0e0' } } },
      scales: {
        x: {
          type: 'time',
          time: { unit: 'minute', tooltipFormat: 'HH:mm:ss' },
          ticks: { color: '#e0e0e0' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#e0e0e0' },
          grid: { color: 'rgba(255,255,255,0.1)' }
        }
      }
    }
  });

  // ==== Gráficos ====
  const tempChart = createChart(document.getElementById('tempChart'), 'Temperatura (°C)', '#FF6B6B');
  const humChart = createChart(document.getElementById('humChart'), 'Humedad (%)', '#4D96FF');
  const presChart = createChart(document.getElementById('presChart'), 'Presión (hPa)', '#FFD93D');
  const luzChart = createChart(document.getElementById('luzChart'), 'Luz (%)', '#FFB74D');
  const mqChart = createChart(document.getElementById('mqChart'), 'Calidad del Aire (%)', '#81C784');

  // ==== Función para agregar puntos ====
  const addData = (chart, value) => {
    const now = new Date();
    chart.data.labels.push(now);
    chart.data.datasets[0].data.push(value);
    if (chart.data.labels.length > maxPoints) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }
    chart.update();
  };

  // ==== Configuración MQTT ====
  const optionsMQTT = {
    username: 'wzzz1',
    password: 'wesarMDFK21',
    keepalive: 60,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000
  };

  const client = mqtt.connect('wss://13c68f6415524cbca32f0d357e1159f6.s1.eu.hivemq.cloud:8884/mqtt', optionsMQTT);

  // ==== Conexión ====
  client.on('connect', () => {
    console.log('Conectado a HiveMQ Cloud');
    statusIndicator.classList.replace('disconnected', 'connected');
    statusText.textContent = 'Conectado';
    client.subscribe('sensores/data');
  });

  client.on('error', (err) => console.error('Error MQTT:', err));
  client.on('close', () => {
    console.log('Conexión cerrada');
    statusIndicator.classList.replace('connected', 'disconnected');
    statusText.textContent = 'Desconectado';
  });

  // ==== Mensajes entrantes ====
  client.on('message', (topic, message) => {
    if (topic === 'sensores/data') {
      try {
        const data = JSON.parse(message.toString());
        if (data.temp !== undefined) { addData(tempChart, data.temp); document.getElementById('temp-value').textContent = `${data.temp.toFixed(2)} °C`; }
        if (data.hum !== undefined) { addData(humChart, data.hum); document.getElementById('hum-value').textContent = `${data.hum.toFixed(2)} %`; }
        if (data.pres !== undefined) { addData(presChart, data.pres); document.getElementById('pres-value').textContent = `${data.pres.toFixed(2)} hPa`; }
        if (data.luz !== undefined) { addData(luzChart, data.luz); document.getElementById('luz-value').textContent = `${data.luz} %`; }
        if (data.mq !== undefined) { addData(mqChart, data.mq); document.getElementById('mq-value').textContent = `${data.mq} %`; }
      } catch (e) { console.error('Error parseando JSON:', e); }
    }
  });

  // ==== Envío de comandos ====
  const publishCommand = (payload) => {
    client.publish('actuadores/control', JSON.stringify(payload));
    console.log('Comando enviado:', payload);
  };

  // ==== Botones de control ====
  document.getElementById('btn-auto').addEventListener('click', () => publishCommand({ auto: 1 }));
  document.getElementById('btn-auto-off').addEventListener('click', () => publishCommand({ auto: 0 }));
  document.getElementById('btn-luz-on').addEventListener('click', () => publishCommand({ luz: 1 }));
  document.getElementById('btn-luz-off').addEventListener('click', () => publishCommand({ luz: 0 }));
  document.getElementById('btn-alarma-on').addEventListener('click', () => publishCommand({ alarma: 1 }));
  document.getElementById('btn-alarma-off').addEventListener('click', () => publishCommand({ alarma: 0 }));
  document.getElementById('btn-buzz-on').addEventListener('click', () => publishCommand({ buzzer: 1 }));
  document.getElementById('btn-buzz-off').addEventListener('click', () => publishCommand({ buzzer: 0 }));
  document.getElementById('btn-motor-on').addEventListener('click', () => publishCommand({ motor: 1 }));
  document.getElementById('btn-motor-off').addEventListener('click', () => publishCommand({ motor: 0 }));
});
