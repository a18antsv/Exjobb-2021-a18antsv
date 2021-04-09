const appContainerElement = document.querySelector(".app-container");
const experimentsTable = document.querySelector(".experiments-table");
const experimentCounterElement = document.querySelector(".experiment-counter");
const newExperimentButton = document.querySelector(".button-new-experiment");
const newExperimentForm = document.querySelector("#new-experiment-form");
const backButton = document.querySelector(".back-button");
const sortableTableHeaders = experimentsTable.querySelectorAll("th[data-sortable]");
const chartCanvasElements = document.querySelectorAll(".chart");

const EXPERIMENTS_KEY = "experiments";
const eventSource = new EventSource("/events"); // Open Server-Sent Events (SSE) connection to server for constant status updates and data transfer
let Status = {};
let experiments = [];
let charts = {};

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
 * Show only experiment row with passed experiment id and open up a new management view for passed experiment.
 * @param {Number} experimentId The id of the experiment to manage
 * @todo Management view
 */
const manageExperiment = experimentId => {
  console.log(`Manage experiment with id ${experimentId}`);
  const experimentRow = experimentsTable.querySelector(`tr[data-experiment-id="${experimentId}"]`);
  experimentRow.classList.add("show-table-row");
  appContainerElement.classList.add("management");
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

const stopExperiment = async experimentId => {
  const data = await postToServer("/stop", { experimentId });
  console.log(data.message);
  if(!data.success) {
    return;
  }
  experiments = data.experiments;
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
  experiments.forEach(experiment => {
    const { 
      experimentId,
      experimentName, 
      broker, 
      producers, 
      minutes, 
      status 
    } = experiment;

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
        showOnStatuses: [Status.IN_PROGRESS, Status.COMPLETED]
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
  });

  // Update available experiments counter
  experimentCounterElement.innerHTML = experiments.length;

  // Rerender removed form elements row as the last table row
  tbody.appendChild(rowNewExperiment);
  rowNewExperiment.querySelector(`[name="experimentName"]`).value = `Experiment ${experiments.length + 1}`;
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
  console.log(JSON.parse(e.data));
  experiments = JSON.parse(e.data);
  renderExperimentsTable();
});

/**
 * SSE event that fires when the server decides to sends consumed messages received from the consumer.
 */
eventSource.addEventListener("message", e => {
  const aggregations = e.data;
  console.log(aggregations);
});

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
  const pollutant = chartCanvasElement.dataset.pollutant;

  const chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: []
    },
    options: {
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

  charts[pollutant] = chart;
});
