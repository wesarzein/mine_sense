document.addEventListener('DOMContentLoaded', () => {

  /* ============================
        LOGIN
  ============================ */
  const LOGIN_USER = 'admin';
  const LOGIN_PASS = '1234';

  const loginModal = document.getElementById('login-modal');
  const loginShow = document.getElementById('login-show');
  const loginBtn = document.getElementById('login-btn');
  const loginCancel = document.getElementById('login-cancel');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');
  const controlSection = document.getElementById('control-section');

  function isAuthenticated() {
    return sessionStorage.getItem('ms_auth') === '1';
  }

  function setAuthenticated(val) {
    if (val) sessionStorage.setItem('ms_auth', '1');
    else sessionStorage.removeItem('ms_auth');
    updateAuthUI();
  }

  function updateAuthUI() {
    if (isAuthenticated()) {
      controlSection.classList.add('visible');
      controlSection.setAttribute('aria-hidden', 'false');
      loginShow.style.display = 'none';
      logoutBtn.style.display = 'inline-block';
    } else {
      controlSection.classList.remove('visible');
      controlSection.setAttribute('aria-hidden', 'true');
      loginShow.style.display = 'inline-block';
      logoutBtn.style.display = 'none';
    }
  }

  loginShow.addEventListener('click', () => {
    loginModal.style.display = 'flex';
    loginError.style.display = 'none';
  });

  loginCancel.addEventListener('click', () => {
    loginModal.style.display = 'none';
  });

  loginBtn.addEventListener('click', () => {
    const u = document.getElementById('user').value.trim();
    const p = document.getElementById('pass').value;
    if (u === LOGIN_USER && p === LOGIN_PASS) {
      setAuthenticated(true);
      loginModal.style.display = 'none';
    } else {
      loginError.style.display = 'block';
      loginError.textContent = 'Usuario o contraseña inválidos';
    }
  });

  logoutBtn.addEventListener('click', () => setAuthenticated(false));

  updateAuthUI();


  /* ============================
        CHARTS
  ============================ */
  const maxPoints = 50;

  const createLine = (ctx, label, color) => new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label,
        data: [],
        borderColor: color,
        backgroundColor: color,
        fill: false,
        tension: 0.25,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      animation: false,
      plugins: { legend: { display: false } },
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

  /* ============================
      GAUGES SEMICIRCULARES
  ============================ */

  const createGauge = (ctx, max, color) => {
    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['value', 'rest'],
        datasets: [{
          data: [0, max],
          backgroundColor: [color, 'rgba(255,255,255,0.06)'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        animation: { duration: 300 },
        rotation: -Math.PI,
        circumference: Math.PI,
        cutout: '75%',
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      }
    });
  };


  const createCircularGauge = (ctx, min, max, color) => {
    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['value', 'rest'],
        datasets: [{
          data: [0, 1], // se actualiza luego
          backgroundColor: [color, 'rgba(255,255,255,0.06)'],
          borderWidth: 0,
          circumference: 360,
          rotation: -90
        }]
      },
      options: {
        responsive: true,
        animation: false,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
  };

  /* ============================
        CREAR GRÁFICAS
  ============================ */
  const tempChart = createLine(document.getElementById('tempChart').getContext('2d'), 'Temperatura', '#FF6B6B');
  const luzChart = createLine(document.getElementById('luzChart').getContext('2d'), 'Luz', '#FFB74D');
  const presChart = createCircularGauge(
    document.getElementById('presChart').getContext('2d'),
    950,   // mínimo típico
    1050,  // máximo típico
    '#FFD93D'
  );
  const mqChart = createGauge(document.getElementById('mqChart').getContext('2d'), 500, '#81C784');


  /* ============================
        ACTUALIZADORES
  ============================ */

  const addLineData = (chart, value) => {
    const now = new Date();
    chart.data.labels.push(now);
    chart.data.datasets[0].data.push(value);
    if (chart.data.labels.length > maxPoints) {
      chart.data.labels.shift();
      chart.data.datasets[0].data.shift();
    }
    chart.update();
  };

  const updateGauge = (chart, value, max) => {
    const v = Math.max(0, Math.min(value, max));
    chart.data.datasets[0].data[0] = v;
    chart.data.datasets[0].data[1] = max - v;
    chart.update();
  };

  const updateCircularGauge = (chart, value, min, max) => {
    const v = Math.max(min, Math.min(value, max));
    const percent = (v - min) / (max - min);

    chart.data.datasets[0].data[0] = percent;
    chart.data.datasets[0].data[1] = 1 - percent;
    chart.update();
  };

  /* ============================
        ELEMENTOS DEL DOM
  ============================ */
  const humFill = document.getElementById('hum-fill');
  const humPerc = document.getElementById('hum-perc');

  const tempVal = document.getElementById('temp-value');
  const humVal = document.getElementById('hum-value');
  const presVal = document.getElementById('pres-value');
  const luzVal = document.getElementById('luz-value');
  const mqVal = document.getElementById('mq-value');

  const presCenter = document.getElementById('pres-center');
  const mqCenter = document.getElementById('mq-center');


  /* ============================
        MQTT
  ============================ */

  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');

  const optionsMQTT = {
    username: 'wzzz1',
    password: 'wesarMDFK21',
    keepalive: 60,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000
  };

  const client = mqtt.connect(
    'wss://13c68f6415524cbca32f0d357e1159f6.s1.eu.hivemq.cloud:8884/mqtt',
    optionsMQTT
  );

  client.on('connect', () => {
    statusIndicator.classList.replace('disconnected', 'connected');
    statusText.textContent = 'Conectado';
    client.subscribe('sensores/data');
  });

  client.on('close', () => {
    statusIndicator.classList.replace('connected', 'disconnected');
    statusText.textContent = 'Desconectado';
  });


  /* ============================
        LLEGADA DE DATOS
  ============================ */
  client.on('message', (topic, message) => {
    if (topic !== 'sensores/data') return;

    try {
      const d = JSON.parse(message.toString());

      /* === TEMPERATURA === */
      if (d.temp !== undefined) {
        tempVal.textContent = d.temp + ' °C';
        addLineData(tempChart, d.temp);
      }

      /* === HUMEDAD === */
      if (d.hum !== undefined) {
        const h = Number(d.hum).toFixed(2);
        humVal.textContent = h + ' %';
        humPerc.textContent = h + ' %';
        humFill.style.height = d.hum + '%';
      }

      /* === PRESIÓN (GAUGE SEMICIRCULAR) === */
      if (d.pres !== undefined) {
        const h = Number(d.pres).toFixed(2);
        presVal.textContent = h + ' hPa';
        presCenter.textContent = h + ' hPa';
        updateCircularGauge(presChart, d.pres, 950, 1050);
      }

      /* === LUZ === */
      if (d.luz !== undefined) {
        luzVal.textContent = d.luz + ' %';
        addLineData(luzChart, d.luz);
      }

      /* === MQ-135 (CALIDAD DE AIRE) === */
      if (d.mq !== undefined) {
        mqVal.textContent = d.mq + ' %';
        mqCenter.textContent = d.mq;
        updateGauge(mqChart, d.mq, 500);
      }

    } catch (e) {
      console.error('JSON inválido:', e);
    }

  });

  /* ============================
    PUBLICAR COMANDOS (RESTORE)
    ============================ */

  function publishCommand(obj) {
    if (!isAuthenticated()) {
      console.warn('Usuario no autenticado — comando no enviado', obj);
      return;
    }
    if (!client || !client.connected) {
      console.warn('MQTT no conectado — comando no enviado', obj);
      return;
    }
    try {
      client.publish('actuadores/control', JSON.stringify(obj));
      console.log('Comando enviado (actuadores/control):', obj);
    } catch (e) {
      console.error('Error publicando comando:', e);
    }
  }

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
