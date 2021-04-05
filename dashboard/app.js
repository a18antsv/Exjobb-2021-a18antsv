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

let experiments = []; // All created experiments (whole JSON-objects)

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
app.use("/", express.static("./public"));

app.listen(port, () => {
  console.log(`Express app listening on port ${port}.`);
});
