import express from "express";

const app = express();
const port = 3000;

// Statuses that an experiment can have
const Status = {
  NOT_STARTED: "Not started",
  IN_QUEUE: "In queue",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed"
};

let experiments = []; // All stored experiments (whole JSON-objects)
let experimentIdQueue = []; // Queue of experiment ids of experiments to be executed
let runningExperimentId = undefined; // Id of currently running experiment or undefined if no experiment runs

const getExperimentById = experimentId => {
  return experiments.find(experiment => experiment.experimentId === experimentId);
}

const setExperimentStatus = (experimentId, status) => {
  const experiment = getExperimentById(experimentId);
  if(!experiment) {
    console.log(`Could not find experiment with id ${experimentId}`);
    return;
  }
  experiment.status = status;
}

const runExperiment = experimentId => {
  runningExperimentId = experimentId;
}

const nextExperiment = () => {
  if(runningExperiment) {
    console.log("An experiment is already running... Cannot start another one.");
    return;
  }
  const experimentId = experimentIdQueue.pop();
  if(!experimentId) {
    console.log("There are no experiments in queue...");
    return;
  }
  runExperiment(experimentId);
}

app.use("/", express.static("./public"));

app.listen(port, () => {
  console.log(`Express app listening on port ${port}.`);
});
