const appContainerElement = document.querySelector(".app-container");
const experimentsTable = document.querySelector(".experiments-table");
const experimentCounterElement = document.querySelector(".experiment-counter");
const newExperimentButton = document.querySelector(".button-new-experiment");
const newExperimentForm = document.querySelector("#new-experiment-form");
const backButton = document.querySelector(".back-button");
const sortableTableHeaders = experimentsTable.querySelectorAll("th[data-sortable]");
const chartCanvasElements = document.querySelectorAll(".chart");
const countdownElement = document.querySelector(".countdown");

const EXPERIMENTS_KEY = "experiments";
const eventSource = new EventSource("/events"); // Open Server-Sent Events (SSE) connection to server for constant status updates and data transfer
let Status = {};
let experiments = [];
let chartsByMetric = {};
let dataset = {};
let countdownInterval;

/**
 * Saves key/value pair in the browser's local storage.
 * @param {String} key The key to save the value based on
 * @param {Any} value The value to save for the specified key
 */
const saveToLocalStorage = (key, value) => {
  const stringifiedValue = JSON.stringify(value);
  localStorage.setItem(key, stringifiedValue);
}

/**
 * Retrieves a value from local storage based on passed key.
 * Returns the parsed version of the value or an empty array if value is null.
 * @param {String} key The key to retrieve a value based on
 * @returns {Any} The retrieved value
 */
const getFromLocalStorage = key => {
  const stringifiedValue = localStorage.getItem(key);
  const parsedValue = JSON.parse(stringifiedValue);
  return parsedValue === null ? [] : parsedValue;
}

/**
 * Fetches data from passed route with the GET method and returns it in JSON format
 * @param {String} route The route to fetch data from
 * @returns {Object} An object with data properties
 */
const getFromServer = async route => {
  const response = await fetch(route);
  const data = await response.json();
  return data;
}

/**
 * Sends data to the server using a post request
 * @param {Stromg} route The post route to send data to
 * @param {Object} json The JSON object to send
 * @returns {Object} An object with data properties
 */
const postToServer = async (route, json) => {
  const request = new Request(route, {
    method: "POST",
    body: JSON.stringify(json),
    headers: {
      "Content-Type": "application/json; charset=UTF-8"
    }
  });
  const response = await fetch(request);
  const data = await response.json();
  return data;
}

/**
 * Adds an experiment by sending it to the server and using the response experiments array
 * @param {Object} experiment The experiment to add
 */
const addExperiment = async experiment => {
  const data = await postToServer("/add", experiment);
  console.log(data.message);
  if(!data.success) {
    return;
  }
  experiments = data.experiments;
  saveToLocalStorage(EXPERIMENTS_KEY, experiments);
  renderExperimentsTable();
}

/**
 * Deletes an experiment based on experiment id.
 * Saves the new array to local storage and rerenders the table.
 * @param {Number} experimentId The id of the experiment to delete
 */
const deleteExperiment = async experimentId => {
  const data = await postToServer("/delete", { experimentId });
  console.log(data.message);
  if(!data.success) {
    return;
  }
  experiments = data.experiments;
  saveToLocalStorage(EXPERIMENTS_KEY, experiments);
  renderExperimentsTable();
}

/**
 * Switch to management view
 */
const manageExperiment = () => {
  appContainerElement.classList.add("management");
  renderExperimentsTable();
}

/**
 * Puts an experiment in queue for execution by informing the server to queue the experiment id
 * @param {Number} experimentId The id of the experiment to queue
 * @returns {Object} An object with data properties
 */
const queueExperiment = async experimentId => {
  const data = await postToServer("/queue", { experimentId });
  console.log(data.message);
  if(!data.success) {
    return;
  }
  experiments = data.experiments;
  saveToLocalStorage(EXPERIMENTS_KEY, experiments);
  renderExperimentsTable();
}

/**
 * Sends a request to the server to dequeue an experiment based on its id
 * @param {Number} experimentId The id of the experiment to dequeue
 */
const dequeueExperiment = async experimentId => {
  const data = await postToServer("/dequeue", { experimentId });
  console.log(data.message);
  if(!data.success) {
    return;
  }
  experiments = data.experiments;
  saveToLocalStorage(EXPERIMENTS_KEY, experiments);
  renderExperimentsTable();
}

/**
 * Sends a request to the server to stop an experiment based on its id
 * @param {Number} experimentId The id of the experiment to stop
 */
const stopExperiment = async experimentId => {
  const data = await postToServer("/stop", { experimentId });
  console.log(data.message);
  if(!data.success) {
    return;
  }
  experiments = data.experiments;
  clearInterval(countdownInterval);
  countdownElement.innerText = "00:00:00";
  saveToLocalStorage(EXPERIMENTS_KEY, experiments);
  renderExperimentsTable();
}

/**
 * Renders the available experiments table based on array of experiments loaded from local storage.
 * Updates available experiment counter.
 */
const renderExperimentsTable = () => {
  const tbody = experimentsTable.querySelector("tbody");
  const rowNewExperiment = tbody.querySelector(".row-new-experiment");
  const rows = tbody.querySelectorAll("tr");

  // Remove all table rows
  rows.forEach(row => row.parentNode.removeChild(row));

  // Insert row in table for each experiment
  for(const experiment of experiments) {
    const { 
      experimentId,
      experimentName, 
      broker, 
      producers, 
      minutes, 
      status 
    } = experiment;

    // In management view, do not render experiments in the table that are not starting or in progress
    if(appContainerElement.classList.contains("management")) {
      if(status !== Status.IN_PROGRESS && status !== Status.STARTING) {
        continue;
      }
    }

    const row = document.createElement("tr");
    const tdName = document.createElement("td");
    const tdBroker = document.createElement("td");
    const tdProducers = document.createElement("td");
    const tdMinutes = document.createElement("td");
    const tdStatus = document.createElement("td");
    const buttonContainer = document.createElement("td");
    row.dataset.experimentId = experimentId;
    tdName.innerText = experimentName;
    tdBroker.innerText = broker;
    tdProducers.innerText = producers;
    tdMinutes.innerText = minutes;
    tdStatus.innerText = status;
    buttonContainer.classList.add("button-container");

    row.appendChild(tdName);
    row.appendChild(tdBroker);
    row.appendChild(tdProducers);
    row.appendChild(tdMinutes);
    row.appendChild(tdStatus);
    row.appendChild(buttonContainer);
    tbody.appendChild(row);

    const buttonObjects = [
      {
        text: "M",
        clazz: "manage",
        func: manageExperiment,
        showOnStatuses: [Status.STARTING, Status.IN_PROGRESS]
      },
      {
        text: "Q",
        clazz: "queue",
        func: queueExperiment,
        showOnStatuses: [Status.NOT_STARTED, Status.COMPLETED]
      },
      {
        text: "DQ",
        clazz: "dequeue",
        func: dequeueExperiment,
        showOnStatuses: [Status.IN_QUEUE]
      },
      {
        text: "S",
        clazz: "stop",
        func: stopExperiment,
        showOnStatuses: [Status.IN_PROGRESS]
      },
      {
        text: "D",
        clazz: "delete",
        func: deleteExperiment,
        showOnStatuses: [Status.NOT_STARTED, Status.COMPLETED]
      }
    ];

    for(const { text, clazz, func, showOnStatuses } of buttonObjects) {
      // Directly go to next iteration if the button should not be created for the experiment's current status
      if(!showOnStatuses.includes(status)) {
        continue;
      }

      const buttonElement = document.createElement("div");
      buttonElement.innerText = text;
      buttonElement.classList.add("small-button", clazz);
      buttonElement.addEventListener("click", () => func(experimentId));
      buttonContainer.appendChild(buttonElement);
    }
  }

  // Update available experiments counter
  experimentCounterElement.innerHTML = experiments.length;

  // Rerender removed form elements row as the last table row
  tbody.appendChild(rowNewExperiment);
  rowNewExperiment.querySelector(`[name="experimentName"]`).value = `Experiment ${experiments.length + 1}`;
}

/**
 * Starts a countdown that counts down from passed number of minutes
 * @param {Number} minutes The number of minutes the countdown should count down
 */
const startCountdown = (minutes = 10) => {
  const start = new Date();
  const end = new Date(start.getTime() + minutes * 60 * 1000);
  
  const getTimeRemaining = () => {
    const now = new Date();
    const timeLeft = end.getTime() - now.getTime();
    return {
      timeLeft,
      hours: Math.floor(timeLeft / (1000 * 60 * 60)),
      minutes: Math.floor((timeLeft / 1000 / 60) % 60),
      seconds: Math.floor((timeLeft / 1000) % 60)
    };
  }
  
  const updateCountdown = () => {
    const { timeLeft, hours, minutes, seconds} = getTimeRemaining();
  
    if(timeLeft <= 0) {
      clearInterval(countdownInterval);
      countdownElement.innerText = "00:00:00";
      return;
    }
  
    countdownElement.innerText = `${("0" + hours).slice(-2)}:${("0" + minutes).slice(-2)}:${("0" + seconds).slice(-2)}`;
  }
  
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 500);
}

/**
 * Background and border colors available for use for different datasets in a graph 
 */
const colors = [
  {
    background: "rgba(255, 99, 132, 0.2)",
    border: "rgb(255, 99, 132)",
  },
  {
    background: "rgba(255, 159, 64, 0.2)",
    border: "rgb(255, 159, 64)",
  },
  {
    background: "rgba(255, 205, 86, 0.2)",
    border: "rgb(255, 205, 86)",
  },
  {
    background: "rgba(75, 192, 192, 0.2)",
    border: "rgb(75, 192, 192)",
  },
  {
    background: "rgba(54, 162, 235, 0.2)",
    border: "rgb(54, 162, 235)",
  },
  {
    background: "rgba(153, 102, 255, 0.2)",
    border: "rgb(153, 102, 255)",
  },
  {
    background: "rgba(201, 203, 207, 0.2)",
    border: "rgb(201, 203, 207)",
  }
];

/**
 * Extracts data from the passed aggregations object (structure presented in aggregations.ts) and appends it 
 * to the local client-side dataset in a way that matches the structure presented in client-dataset-structure.ts.
 * @param {Object} aggregations The aggregations object to extract data from
 */
const appendToDataset = aggregations => {
  for(const stationId in aggregations) {
    const { buckets } = aggregations[stationId];
    for(const timeKey in buckets) {
      if(!dataset[timeKey]) {
        dataset[timeKey] = {};
      }
      const bucket = buckets[timeKey];
      const { co, no2, o3, pm10, pm25, so2, latency, count, sizeMS } = bucket;
      if(!dataset[timeKey][stationId]) {
        dataset[timeKey][stationId] = {
          count,
          sizeMS,
          metrics: {}
        };
      } else {
        dataset[timeKey][stationId].count += count;
      }
      const metrics = { co, no2, o3, pm10, pm25, so2, latency };
      for(const metric in metrics) {
        if(!dataset[timeKey][stationId].metrics[metric]) {
          dataset[timeKey][stationId].metrics[metric] = 0;
        }
        dataset[timeKey][stationId].metrics[metric] += metrics[metric];
      }
    }
  }
}

/**
 * Updates every matric graph with data for every active station to show newly added data and only within the from-to interval
 * @param {Date} from The date and time to start showing the graph from
 * @param {Date} to The date and time to stop showing the graph at
 */
const drawGraph = (from, to) => {
  const buckets = {};

  // Filter the dataset to only include buckets with time keys in the from-to interval
  for(const timeKey in dataset) {
    const date = new Date(timeKey).getTime();
    if(date > from.getTime() && date < to.getTime()) {
      buckets[timeKey] = dataset[timeKey];
    }
  }

  // Iterate through every metric chart to render the data in the interval for the correct chart
  for(const metric in chartsByMetric) {
    const chart = chartsByMetric[metric];
    const data = {};

    // The chart is emptied before rerendering
    chart.data.labels = [];
    chart.data.datasets = [];

    for(const timeKey in buckets) {
      const date = new Date(timeKey);
      chart.data.labels.push(`${("0" + date.getHours()).slice(-2)}:${("0" + date.getMinutes()).slice(-2)}:${("0" + date.getSeconds()).slice(-2)}`);

      const stations = buckets[timeKey];
      for(const stationId in stations) {
        if(!data[stationId]) {
          data[stationId] = [];
        }

        if(metric === "throughput") {
          const throughput = stations[stationId].count / stations[stationId].sizeMS * 1000;
          data[stationId].push(throughput);
        } else {
          const average = stations[stationId].metrics[metric] / stations[stationId].count;
          data[stationId].push(average);
        }
      }
    }
    
    // Sort by station id to prevent dataset labels to shift orders when rerendering
    const stationIds = Object.keys(data).sort();

    for(let i = 0; i < stationIds.length; i++) {
      chart.data.datasets.push({
        label: stationIds[i],
        data: data[stationIds[i]],
        backgroundColor: colors[i % colors.length].background,
        borderColor: colors[i % colors.length].border,
        borderWidth: 1
      });
    }

    chart.update();
  }
}

// Self invoking async function to be able to use top-level await
(async () => {
  // Get available experiment status codes from the server to be able to recognize statuses and render different things based on them.
  Status = await getFromServer("/status"); 

  // If the client application has been closed while the server has worked, experiment statuses will be obsolete.
  // So when starting the client application, experiments are fetched from the server.
  // But if the server is newly started and there are no experiments, experiments stored in local storage will be used.
  experiments = await getFromServer("/experiments");
  if (experiments.length === 0) {
    experiments = getFromLocalStorage(EXPERIMENTS_KEY);
    if(experiments.length !== 0) {
      for(const experiment of experiments) {
        await addExperiment(experiment);
      }
    }
  }

  // Render table on page refresh
  renderExperimentsTable();
})();

/**
 * SSE event that fires when an experiment's status has been changed and not yet been
 * updated on the client side from another server response on a direct request (e.g. addExperiment, deleteExperiment, queueExperiment)
 */
eventSource.addEventListener("status-update", e => {
  experiments = JSON.parse(e.data);
  renderExperimentsTable();
});

/**
 * SSE event that fires when the server decides to sends consumed messages received from the consumer.
 */
eventSource.addEventListener("message", e => {
  const aggregations = JSON.parse(e.data);
  appendToDataset(aggregations);

  // Sliding window for the graph (how far back in time should the graph show max)
  const now = new Date();
  const from = new Date(now.getTime() - 15 * 1000);
  const to = now;

  // Draw graph and filter by time (from - to)
  drawGraph(from, to);
});

/**
 * SSE event that fires when a new experiment countdown is supposed to be started.
 * This is based on consumer service acknowledgement of broker connection.
 * The received data contains the number of minutes to countdown for.
 */
eventSource.addEventListener("countdown", e => {
  const minutes = parseInt(e.data);
  clearInterval(countdownInterval);
  startCountdown(minutes);
})

/**
 * Executes when adding a new experiment to the table.
 * Creates a new experiment object, adds it to the experiments array and saves the array to local storage.
 * Rerenders table.
 */
newExperimentForm.addEventListener("submit", async e => {
  e.preventDefault();
  
  const experimentName = document.querySelector(`[name="experimentName"]`).value;
  const broker = document.querySelector(`[name="broker"]`).value;
  const producers = document.querySelector(`[name="producers"]`).value;
  const minutes = document.querySelector(`[name="minutes"]`).value;

  const experiment = {
    experimentId: Date.now(),
    experimentName,
    broker,
    producers,
    minutes,
    status: ""
  };

  await addExperiment(experiment);

  renderExperimentsTable();
});

/**
 * Toggles the existance of the form elements row from the table on button click
 */
newExperimentButton.addEventListener("click", () => {
  const rowNewExperiment = experimentsTable.querySelector(".row-new-experiment");
  rowNewExperiment.classList.toggle("hidden");
});

/**
 * Go back from management view to full experiment table view when clicking the back button
 */
backButton.addEventListener("click", () => {
  appContainerElement.classList.remove("management");
  renderExperimentsTable();
});

/**
 * Sorting the experiments table by clicked column header cell.
 * First click will sort by the clicked column in ascending order and second click will sort in descending order and so on.
 */
let asc = false;
sortableTableHeaders.forEach((th, i) => {
  th.addEventListener("click", () => {
    const tbody = experimentsTable.querySelector("tbody");
    const rows = [...tbody.querySelectorAll("tr")];
    const rowNewExperiment = rows.pop();
    rows.sort((a, b) => {
      let aVal = a.querySelector(`td:nth-child(${i+1})`).innerText;
      let bVal = b.querySelector(`td:nth-child(${i+1})`).innerText;
      if(th.hasAttribute("data-integer")) {
        aVal = parseInt(aVal);
        bVal = parseInt(bVal);
      }
      if(asc) {
        return (aVal < bVal) ? 1 : -1;
      } else {
        return (aVal > bVal) ? 1 : -1;
      }
    });
    asc = !asc;
    tbody.innerHTML = "";
    for(row of rows) {
      tbody.appendChild(row);
    }
    tbody.appendChild(rowNewExperiment);
  });
});

chartCanvasElements.forEach(chartCanvasElement => {
  const ctx = chartCanvasElement.getContext("2d");
  const metric = chartCanvasElement.dataset.metric;

  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [],
      datasets: []
    },
    options: {
      animation: false,
      scales: {
        y: {
          beginAtZero: true
        },
        x: {
          beginAtZero: true
        }
      }
    }
  });

  chartsByMetric[metric] = chart;
});
