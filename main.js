document.addEventListener('DOMContentLoaded', () => {
  // Constantes de configuración
  const LOGIN_USER = 'admin';
  const LOGIN_PASS = '1234';
  const MAX_POINTS = 50;

  // Elementos del DOM
  const elements = {
    loginModal: document.getElementById('login-modal'),
    loginShow: document.getElementById('login-show'),
    loginBtn: document.getElementById('login-btn'),
    loginCancel: document.getElementById('login-cancel'),
    loginError: document.getElementById('login-error'),
    logoutBtn: document.getElementById('logout-btn'),
    controlSection: document.getElementById('control-section'),
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    humFill: document.getElementById('hum-fill'),
    humPerc: document.getElementById('hum-perc'),
    tempVal: document.getElementById('temp-value'),
    humVal: document.getElementById('hum-value'),
    presVal: document.getElementById('pres-value'),
    luzVal: document.getElementById('luz-value'),
    mqVal: document.getElementById('mq-value'),
    presCenter: document.getElementById('pres-center')
  };

  // Configuración MQTT
  const mqttOptions = {
    username: 'wzzz1',
    password: 'wesarMDFK21',
    keepalive: 60,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000
  };

  // Estado de la aplicación
  const state = {
    charts: {},
    mqttClient: null
  };

  /* ============================
          AUTENTICACIÓN
  ============================ */
  function isAuthenticated() {
    return sessionStorage.getItem('ms_auth') === '1';
  }

  function setAuthenticated(val) {
    if (val) sessionStorage.setItem('ms_auth', '1');
    else sessionStorage.removeItem('ms_auth');
    updateAuthUI();
  }

  function updateAuthUI() {
    const isAuth = isAuthenticated();
    elements.controlSection.classList.toggle('visible', isAuth);
    elements.controlSection.setAttribute('aria-hidden', !isAuth);
    elements.loginShow.style.display = isAuth ? 'none' : 'inline-block';
    elements.logoutBtn.style.display = isAuth ? 'inline-block' : 'none';
  }

  // Eventos de autenticación
  elements.loginShow.addEventListener('click', () => {
    elements.loginModal.style.display = 'flex';
    elements.loginError.style.display = 'none';
  });

  elements.loginCancel.addEventListener('click', () => {
    elements.loginModal.style.display = 'none';
  });

  elements.loginBtn.addEventListener('click', () => {
    const u = document.getElementById('user').value.trim();
    const p = document.getElementById('pass').value;
    if (u === LOGIN_USER && p === LOGIN_PASS) {
      setAuthenticated(true);
      elements.loginModal.style.display = 'none';
    } else {
      elements.loginError.style.display = 'block';
      elements.loginError.textContent = 'Usuario o contraseña inválidos';
    }
  });

  elements.logoutBtn.addEventListener('click', () => setAuthenticated(false));

  /* ============================
          GRÁFICOS
  ============================ */
  function createLineChart(ctx, label, color) {
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label,
          data: [],
          borderColor: color,
          backgroundColor: color + '20',
          fill: true,
          tension: 0.25,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, 
        animation: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: { display: false },
            grid: { display: false },
          },
          y: {
            ticks: { color: '#cfd8dc' },
            grid: { color: 'rgba(255,255,255,0.03)' }
          }
        }
      }
    });
  }

  function createCircularGauge(ctx, min, max, color) {
    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['value', 'rest'],
        datasets: [{
          data: [0, 1],
          backgroundColor: [color, 'rgba(255,255,255,0.06)'],
          borderWidth: 0,
          circumference: 360,
          rotation: -90
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, 
        animation: false,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
  }

  function addLineData(chart, value) {
    const now = new Date();
    chart.data.labels.push(now);
    chart.data.datasets[0].data.push(value);
    if (chart.data.labels.length > MAX_POINTS) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }
    chart.update();
  }

  function updateCircularGauge(chart, value, min, max) {
    const v = Math.max(min, Math.min(value, max));
    const percent = (v - min) / (max - min);

    chart.data.datasets[0].data[0] = percent;
    chart.data.datasets[0].data[1] = 1 - percent;
    chart.update();
  }

  // Inicializar gráficos
  function initCharts() {
    state.charts.temp = createLineChart(
      document.getElementById('tempChart').getContext('2d'),
      'Temperatura',
      '#FF6B6B'
    );

    state.charts.luz = createLineChart(
      document.getElementById('luzChart').getContext('2d'),
      'Luz',
      '#FFB74D'
    );

    state.charts.mq = createLineChart(
      document.getElementById('mqChart').getContext('2d'),
      'Calidad del Aire',
      '#81c784'  // Verde para calidad de aire
    );

    state.charts.pres = createCircularGauge(
      document.getElementById('presChart').getContext('2d'),
      950,   // mínimo típico
      1050,  // máximo típico
      '#FFD93D'
    );
  }

  /* ============================
          MQTT
  ============================ */
  function connectMQTT() {
    state.mqttClient = mqtt.connect(
      'wss://13c68f6415524cbca32f0d357e1159f6.s1.eu.hivemq.cloud:8884/mqtt',
      mqttOptions
    );

    state.mqttClient.on('connect', () => {
      elements.statusIndicator.classList.replace('disconnected', 'connected');
      elements.statusText.textContent = 'Conectado';
      state.mqttClient.subscribe('sensores/data');
    });

    state.mqttClient.on('close', () => {
      elements.statusIndicator.classList.replace('connected', 'disconnected');
      elements.statusText.textContent = 'Desconectado';
    });

    state.mqttClient.on('message', (topic, message) => {
      if (topic !== 'sensores/data') return;

      try {
        const data = JSON.parse(message.toString());

        // Temperatura
        if (data.temp !== undefined) {
          elements.tempVal.textContent = data.temp + ' °C';
          addLineData(state.charts.temp, data.temp);
        }

        // Humedad
        if (data.hum !== undefined) {
          const h = Number(data.hum).toFixed(2);
          elements.humVal.textContent = h + ' %';
          elements.humPerc.textContent = h + ' %';
          elements.humFill.style.height = data.hum + '%';
        }

        // Presión
        if (data.pres !== undefined) {
          const h = Number(data.pres).toFixed(2);
          elements.presVal.textContent = h + ' hPa';
          elements.presCenter.textContent = h + ' hPa';
          updateCircularGauge(state.charts.pres, data.pres, 950, 1050);
        }

        // Luz
        if (data.luz !== undefined) {
          elements.luzVal.textContent = data.luz + ' %';
          addLineData(state.charts.luz, data.luz);
        }

        // Calidad del aire
        if (data.mq !== undefined) {
          elements.mqVal.textContent = data.mq + ' %';
          addLineData(state.charts.mq, data.mq);
        }

      } catch (e) {
        console.error('JSON inválido:', e);
      }
    });
  }

  /* ============================
          CONTROL DE ACTUADORES
  ============================ */
  function publishCommand(obj) {
    if (!isAuthenticated()) {
      console.warn('Usuario no autenticado — comando no enviado', obj);
      return;
    }
    if (!state.mqttClient || !state.mqttClient.connected) {
      console.warn('MQTT no conectado — comando no enviado', obj);
      return;
    }
    try {
      state.mqttClient.publish('actuadores/control', JSON.stringify(obj));
      console.log('Comando enviado (actuadores/control):', obj);
    } catch (e) {
      console.error('Error publicando comando:', e);
    }
  }

  // Asignar eventos a botones de control
  const controlButtons = {
    'btn-auto': { auto: 1 },
    'btn-auto-off': { auto: 0 },
    'btn-luz-on': { luz: 1 },
    'btn-luz-off': { luz: 0 },
    'btn-alarma-on': { alarma: 1 },
    'btn-alarma-off': { alarma: 0 },
    'btn-buzz-on': { buzzer: 1 },
    'btn-buzz-off': { buzzer: 0 },
    'btn-motor-on': { motor: 1 },
    'btn-motor-off': { motor: 0 }
  };

  Object.keys(controlButtons).forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      publishCommand(controlButtons[id]);
    });
  });

  /* ============================
          INICIALIZACIÓN
  ============================ */
  function init() {
    updateAuthUI();
    initCharts();
    connectMQTT();
  }

  // Iniciar la aplicación
  init();
});