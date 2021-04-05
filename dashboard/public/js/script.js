const appContainerElement = document.querySelector(".app-container");
const experimentsTable = document.querySelector(".experiments-table");
const experimentCounterElement = document.querySelector(".experiment-counter");
const newExperimentButton = document.querySelector(".button-new-experiment");
const newExperimentForm = document.querySelector("#new-experiment-form");
const backButton = document.querySelector(".back-button");

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

const EXPERIMENTS_KEY = "experiments";
let experiments = getFromLocalStorage(EXPERIMENTS_KEY);

/**
 * Deletes an experiment from the experiments array based on experiment id.
 * Saves the new array to local storage and rerenders the table.
 * @param {Number} experimentId The id of the experiment to delete
 */
const deleteExperiment = experimentId => {
  experiments = experiments.filter(experiment => {
    return experiment.experimentId !== experimentId;
  });
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
 * Puts an experiment in queue for execution (status="In queue").
 * The first experiment in queue will automatically execute (status="In progress").
 * @param {Number} experimentId The id of the experiment to queue
 * @todo ALL
 */
const queueExperiment = experimentId => {
  console.log(`Queue experiment with id ${experimentId}`);
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
      messages, 
      status 
    } = experiment;

    tbody.innerHTML += `
      <tr data-experiment-id="${experimentId}">
        <td>${experimentName}</td>
        <td>${broker}</td>
        <td>${producers}</td>
        <td>${messages}</td>
        <td>${status}</td>
        <td class="button-container">
          <div class="small-button manage" onclick="manageExperiment(${experimentId});">M</div>
          <div class="small-button queue" onclick="queueExperiment(${experimentId});">Q</div>
          <div class="small-button delete" onclick="deleteExperiment(${experimentId});">D</div>
        </td>
      </tr>
    `;
  });

  // Update available experiments counter
  experimentCounterElement.innerHTML = experiments.length;

  // Rerender removed form elements row as the last table row
  tbody.appendChild(rowNewExperiment);
  rowNewExperiment.querySelector(`[name="experimentName"]`).value = `Experiment ${experiments.length + 1}`;
}

renderExperimentsTable(); // Render the table on page refresh

/**
 * Executes when adding a new experiment to the table.
 * Creates a new experiment object, adds it to the experiments array and saves the array to local storage.
 * Rerenders table.
 */
newExperimentForm.addEventListener("submit", e => {
  e.preventDefault();
  
  const experimentName = document.querySelector(`[name="experimentName"]`).value;
  const broker = document.querySelector(`[name="broker"]`).value;
  const producers = document.querySelector(`[name="producers"]`).value;
  const messages = document.querySelector(`[name="messages"]`).value;

  const experiment = {
    experimentId: Date.now(),
    experimentName,
    broker,
    producers,
    messages,
    status: "Not started"
  };
  experiments.push(experiment);
  saveToLocalStorage(EXPERIMENTS_KEY, experiments);
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
experimentsTable.querySelectorAll("th[data-sortable]").forEach((th, i) => {
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