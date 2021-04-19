import express from "express";
import SSE from "express-sse";
import { execFile } from "child_process";

const app = express();
const port = 3000;

const sse = new SSE();

// Statuses that an experiment can have
const Status = {
  NOT_STARTED: "Not started",
  IN_QUEUE: "In queue",
  STARTING: "Starting...",
  IN_PROGRESS: "In progress",
  STOPPING: "Stopping...",
  COMPLETED: "Completed"
};

let experiments = []; // All stored experiments (whole JSON-objects)
let experimentIdQueue = []; // Queue of experiment ids of experiments to be executed
let runningExperimentId = undefined; // Id of currently running experiment or undefined if no experiment runs

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
 * Parameters for producers and number of minutes are passed to the bash script to determine how many 
 * producer containers that should be spun up and how long the experiment should be running for.
 * @param {String} experimentId The id of the experiment to start
 */
const runExperiment = experimentId => {
  const experiment = getExperimentById(experimentId);
  const { broker, producers, consumers, minutes } = experiment;

  // Update experiment status directly without waiting for the bash script to finish
  experiment.status = Status.STARTING;
  sse.send(experiments, "status-update", undefined);

  runningExperimentId = experimentId;

  const shFilePath = `./sh/${broker.toLowerCase()}-start-experiment.sh`;
  const shArgs = [producers, consumers, minutes];

  console.log(`Starting experiment with id ${experimentId}...`);
  execFile(shFilePath, shArgs, (err, stdout, stderr) => {
    // Update status again once all containers have finished starting
    // Code executing before error checking since errors occur even when all containers started just fine sometimes
    experiment.status = Status.IN_PROGRESS;
    sse.send(experiments, "status-update", undefined);

    console.log(`Experiment with id ${experimentId} is running.`);
    if(err) {
      console.log(`error: ${err.message}`);
      return;
    }
    if(stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout (Docker container ids): ${stdout}`);
  });
}

/**
 * Stops a running experiment, if there is one, by running a bash script that removes all running Docker containers.
 * @param {String} experimentId The id of the experiment to stop 
 * @param {Boolean} isForced True if the experiment was manually stopped and false if completed normally
 */
const stopExperiment = (experimentId, isForced = false) => {
  if(!runningExperimentId) {
    console.log("No experiment is running... Nothing to stop.");
    return;
  }

  const experiment = getExperimentById(experimentId);
  const { broker, producers, consumers } = experiment;

  const shFilePath = `./sh/${broker.toLowerCase()}-stop-experiment.sh`;
  const shArgs = [producers, consumers];

  // Update experiment status directly without waiting for the bash script to finish
  experiment.status = Status.STOPPING;
  sse.send(experiments, "status-update", undefined);

  execFile(shFilePath, shArgs, (err, stdout, stderr) => {
    /**
     * Sometimes Docker gives an error even if everything seems to stop just fine
     * which caused the code below the error if-statements to not execute.
     * Moved the code above to execute it despite any errors
     */
    if(isForced) {
      experiment.status = Status.NOT_STARTED;
    } else {
      experiment.status = Status.COMPLETED;
      sse.send(experiment, "completed", undefined);
    }

    sse.send(experiments, "status-update", undefined);
    
    runningExperimentId = undefined;
    nextExperiment();
    
    if(err) {
      console.log(`error: ${err.message}`);
      return;
    }
    if(stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
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
app.post("/aggregations", (req, res) => {
  sse.send(req.body, "message", undefined);
});

/**
 * This route is used to get requests from the consumer about experiment completions
 */
app.post("/completed", (req, res) => {
  stopExperiment(runningExperimentId, false);
});

/**
 * This route is used to get requests from the consumer about experiment start after established broker connection
 * @todo Probably want to log the time of countdown start on backend to be able to restore it on frontend on possible page refresh
 */
app.post("/start", (req, res) => {
  const experiment = getExperimentById(runningExperimentId);
  if(experiment) {
    sse.send({ minutes: experiment.minutes }, "countdown", undefined);
  }
});

/**
 * This route is used for Server-Sent Events (SSE).
 * A connection with the client will always be open to make it possible to constantly send consumed data and status updates.
 */
app.get("/events", (req, res) => {
  res.flush = () => undefined; // https://github.com/dpskvn/express-sse/pull/38
  sse.init(req, res);
});

app.listen(port, () => {
  console.log(`Express app listening on port ${port}.`);
});
