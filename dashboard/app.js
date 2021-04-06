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
let experimentsVersionGlobal = 0; // Incremented after experiment status change to detect when to send SSE update to client
let consumedMessages = [];

/**
 * Gets an experiment from the experiments array based on its id.
 * @param {String} experimentId The id of the experiment to find
 * @returns {Object} The experiment with the passed id or undefined
 */
const getExperimentById = experimentId => {
  return experiments.find(experiment => experiment.experimentId === experimentId);
}

/**
 * Runs a new experiment by running a bash script that starts all neccessary Docker containers for the experiment's broker.
 * Parameters for producers and number of messages are passed to the bash script to determine how many 
 * producer containers that should be spun up and how many messages each container should produce.
 * @param {String} experimentId The id of the experiment to start
 */
const runExperiment = experimentId => {
  const experiment = getExperimentById(experimentId);
  const { broker, producers, messages } = experiment;
  experiment.status = Status.IN_PROGRESS;
  experimentsVersionGlobal++;
  runningExperimentId = experimentId;

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
  });
}

/**
 * Stops a running experiment, if there is one, by running a bash script that removes all running Docker containers
 * @param {String} experimentId The id of the experiment to stop 
 */
const stopExperiment = (experimentId, isForced = false) => {
  if(!runningExperimentId) {
    console.log("No experiment is running... Nothing to stop.");
    return;
  }

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

    if(isForced) {
      experiment.status = Status.NOT_STARTED;
    } else {
      experiment.status = Status.COMPLETED;
    }
    runningExperimentId = undefined;
    experimentsVersionGlobal++;
    nextExperiment();
  });
}

/**
 * Runs the next experiment in the queue if there is no experiment currently running
 * and if there is an experiment available in the queue.
 */
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

app.get("/status", (req, res) => {
  res.json(Status);
});

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

app.post("/dequeue", (req, res) => {
  const { experimentId } = req.body;
  const experiment = getExperimentById(experimentId);

  if(!experiment) {
    res.json({ 
      "message": `Could not find experiment with id ${experimentId}... No experiment dequeued.`,
      "success": false
    });
    return;
  }

  if(!experimentIdQueue.includes(experimentId)) {
    res.json({
      "message": `Experiment with id ${experimentId} is not in queue... No experiment dequeued.`,
      "success": false  
    });
    return;
  }

  // Remove experiment from queue
  experimentIdQueue.splice(experimentIdQueue.indexOf(experimentId), 1);
  experiment.status = Status.NOT_STARTED;

  res.json({
    "message": `Removed experiment with id ${experimentId} from queue.`,
    "success": true,
    "experiments": experiments
  });
});

app.post("/stop", (req, res) => {
  const { experimentId } = req.body;
  const experiment = getExperimentById(experimentId);

  if(!experiment) {
    res.json({ 
      "message": `Could not find experiment with id ${experimentId}... No experiment stopped.`,
      "success": false
    });
    return;
  }

  if(!runningExperimentId) {
    res.json({
      "message": `There is currently no experiment running... No experiment stopped.`,
      "success": false  
    });
    return;
  }

  if(runningExperimentId !== experimentId) {
    res.json({
      "message": `Experiment id ${experimentId} does not match with the currently running experiment... Could not stop.`,
      "success": false  
    });
    return;
  }

  // Remove experiment from queue
  stopExperiment(experimentId, true);
  experiment.status = Status.NOT_STARTED;

  res.json({
    "message": `Stopped running experiment with id ${experimentId}.`,
    "success": true,
    "experiments": experiments
  });
});

/**
 * This route is used to receive consumed messages from consumer services.
 */
app.post("/consumed", (req, res) => {
  consumedMessages.push(req.body);
});

app.post("/completed", (req, res) => {
  stopExperiment(runningExperimentId, false);
});

/**
 * This route is used for Server-Sent Events (SSE).
 * A connection with the client will always be open to make it possible to constantly send consumed data and status updates.
 */
app.get("/events", (req, res) => {
  let experimentsVersionLocal = 0; // Compared with global experiments version to determine if there is a newer version to send or not

  res.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Connection": "keep-alive",
    "Cache-Control": "no-cache"
  });

  setInterval(() => {
    if(experimentsVersionLocal < experimentsVersionGlobal) {
      res.write(`event: status-update\ndata: ${JSON.stringify(experiments)}\n\n`);
      experimentsVersionLocal = experimentsVersionGlobal;
    }
  }, 1000);

  setInterval(() => {
    res.write(`event: message\ndata: ${JSON.stringify(consumedMessages)}\n\n`);
  }, 3000);
});

app.listen(port, () => {
  console.log(`Express app listening on port ${port}.`);
});
