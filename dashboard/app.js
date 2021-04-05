import express from "express";
import { execFile } from "child_process";

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
  const experiment = getExperimentById(experimentId);
  const { broker, producers, messages, status } = experiment;
  const shFilePath = `./sh/${broker.toLowerCase()}-start-experiment.sh`;
  const shArgs = [producers, messages];

  console.log(`Starting experiment with id ${experimentId}...`);
  execFile(shFilePath, shArgs, (err, stdout, stderr) => {
    if(err) {
      console.log(`error: ${err.message}`);
      return;
    }
    if(stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout (Docker container ids): ${stdout}`);
    console.log(`Experiment with id ${experimentId} is running.`);
    runningExperimentId = experimentId;
    experiment.status = Status.IN_PROGRESS;
  });
}

const stopExperiment = experimentId => {
  const experiment = getExperimentById(experimentId);
  const { broker, producers, status } = experiment;
  const shFilePath = `./sh/${broker.toLowerCase()}-stop-experiment.sh`;
  const shArgs = [producers];

  execFile(shFilePath, shArgs, (err, stdout, stderr) => {
    if(err) {
      console.log(`error: ${err.message}`);
      return;
    }
    if(stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    runningExperimentId = undefined;

    // Here we need to have a way to determine if the experiment was successfully finished (Status.Completed)
    // or if it was stopped during execution (Status.NOT_STARTED)
    status = Status.COMPLETED;
    nextExperiment();
  });
}

const nextExperiment = () => {
  if(runningExperimentId) {
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
app.use(express.json());

/**
 * Route that sends the server's experiments to the client to keep the front-end up to date
 */
app.get("/experiments", (req, res) => {
  res.json(experiments);
});

/**
 * Route that requires a message body of a single experiment object in JSON-format.
 * The experiment object is added to the experiments array. 
 */
app.post("/add", (req, res) => {
  const experiment = req.body;
  experiment.status = Status.NOT_STARTED;
  experiments.push(experiment);
  res.json({
    "message": `Added experiment with id ${experiment.experimentId} to server experiments array.`,
    "success": true,
    "experiments": experiments
  });
});

app.post("/delete", (req, res) => {
  const { experimentId } = req.body;
  const indexToDelete = experiments.findIndex(experiment => {
    return experiment.experimentId === experimentId;
  });

  if(indexToDelete === -1) {
    res.json({ 
      "message": `Could not find experiment with id ${experimentId}... Nothing deleted.`,
      "success": false
    });
    return;
  }

  experiments.splice(indexToDelete, 1);

  res.json({
    "message": `Deleted experiment with id ${experimentId} from experiments array.`,
    "success": true,
    "experiments": experiments
  });
});

app.post("/queue", (req, res) => {
  const { experimentId } = req.body;
  const experiment = getExperimentById(experimentId);

  if(!experiment) {
    res.json({ 
      "message": `Could not find experiment with id ${experimentId}... Nothing added to queue.`,
      "success": false
    });
    return;
  }

  if(experimentIdQueue.includes(experimentId)) {
    res.json({
      "message": `Experiment with id ${experimentId} is already in queue. Nothing added to queue.`,
      "success": false  
    });
    return;
  }

  experiment.status = Status.IN_QUEUE;

  // Add experiment id to the beginning of array to be able to use pop() to take from the end to simulate a queue
  experimentIdQueue.unshift(experimentId);

  res.json({
    "message": `Added experiment with id ${experimentId} to queue.`,
    "success": true,
    "experiments": experiments
  });

  nextExperiment();
});

app.listen(port, () => {
  console.log(`Express app listening on port ${port}.`);
});
