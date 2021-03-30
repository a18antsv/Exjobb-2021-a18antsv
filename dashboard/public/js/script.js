const experimentsTable = document.querySelector(".experiments-table");
const experimentCounterElement = document.querySelector(".experiment-counter");
const newExperimentButton = document.querySelector(".button-new-experiment");
const newExperimentForm = document.querySelector("#new-experiment-form");

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

const EXPERIMENTS_KEY = "experiments";
const experiments = getFromLocalStorage(EXPERIMENTS_KEY);

/**
 * Renders the available experiments table based on array of experiments loaded from local storage.
 * Updates available experiment counter.
 */
const renderTable = () => {
  if(experiments.length === 0) {
    return;
  }

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

renderTable();

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
    experimentId: experiments.length + 1,
    experimentName,
    broker,
    producers,
    messages,
    status: "Not started"
  };
  experiments.push(experiment);
  saveToLocalStorage(EXPERIMENTS_KEY, experiments);
  renderTable();
});

/**
 * Toggles the existance of the form elements row from the table on button click
 */
newExperimentButton.addEventListener("click", () => {
  const rowNewExperiment = experimentsTable.querySelector(".row-new-experiment");
  rowNewExperiment.toggleAttribute("hidden");
});