/* eslint-disable no-unused-vars */
import * as React from "react";
import { createContext, useState } from "react";
import { saveCode, get_novnc_size_react } from "../helpers/utils";
import { drawCircle } from "../helpers/birdEye.js";
import PropTypes from "prop-types";
import { Typography } from "@mui/material";
const ExerciseContext = createContext();
const websocket_address = "127.0.0.1";
const address_code = "ws://" + websocket_address + ":1905";
const address_gui = "ws://" + websocket_address + ":2303";
let ws_manager, websocket_code, websocket_gui;
let brainFreqAck = 12,
  guiFreqAck = 12;
let simStop = false,
  sendCode = false,
  running = true,
  firstAttempt = true,
  simReset = false,
  simResume = false,
  resetRequested = false,
  firstCodeSent = false,
  swapping = false,
  gazeboOn = false,
  gazeboToggle = false,
  teleOpMode = false;
let animation_id,
  image_data,
  source,
  shape,
  lap_time,
  pose,
  content,
  command_input;
let code = `from GUI import GUI
from HAL import HAL
# Enter sequential code!

while True:
    # Enter iterative code!`;
// Car variables
let v = 0;
let w = 0;
export function ExerciseProvider({ children }) {
  const exercise = "follow_line";
  const editorRef = React.useRef();
  // connectionState - Connect, Connecting, Connected
  const [connectionState, setConnectionState] = useState("Connect");
  // launchState - Launch, Launching, Ready
  const [launchState, setLaunchState] = useState("Launch");
  const [launchLevel, setLaunchLevel] = useState(0);
  const [openInfoModal, setOpenInfoModal] = useState(false);
  const [openErrorModal, setOpenErrorModal] = useState(false);
  const [openLoadModal, setOpenLoadModal] = React.useState(false);
  const [filename, setFilename] = React.useState("follow-line");
  const [alertState, setAlertState] = useState({
    errorAlert: false,
    successAlert: false,
    infoAlert: false,
    warningAlert: false,
  });
  const [alertContent, setAlertContent] = useState("");
  const [openGazebo, setOpenGazebo] = useState(false);
  const [openConsole, setOpenConsole] = useState(false);
  const [initialPosition, setInitialPosition] = useState();
  const [playState, setPlayState] = useState(true);
  const [circuit, setCircuit] = useState("default");
  const [brainFreq, setBrainFreq] = useState(brainFreqAck);
  const [frequencyRows, setFrequencyRows] = useState([
    createData("Brain Frequency (Hz)", 0),
    createData("GUI Frequency (Hz)", 0),
    createData("Simulation Real time factor", 0),
  ]);
  let [errorContentHeading, setErrorContentHeading] =
    useState("Errors detected !");
  let [errorContent, setErrorContent] = useState(
    <Typography> No error detected </Typography>
  );
  const [guiFreq, setGuiFreq] = useState(guiFreqAck);
  const [birdEyeClass, setBirdEyeClass] = React.useState("default");
  const getCircuitValue = () => {
    return circuit;
  };

  const [editorCode, setEditorCode] = useState(`from GUI import GUI
from HAL import HAL
# Enter sequential code!

while True:
    # Enter iterative code!`);

  const startSim = (step) => {
    var level = 0;
    let websockets_connected = false;

    if (step === 0) {
      setConnectionState("Connecting");
      ws_manager = new WebSocket("ws://" + websocket_address + ":8765/");
    } else if (step === 1) {
      connectionUpdate(
        { connection: "exercise", command: "launch_level", level: `${level}` },
        "*"
      );
      var size = get_novnc_size_react();
      ws_manager.send(
        JSON.stringify({
          command: "open",
          exercise: exercise,
          width: size.width.toString(),
          height: size.height.toString(),
          circuit: circuit,
        })
      );
      level++;
      connectionUpdate(
        { connection: "exercise", command: "launch_level", level: `${level}` },
        "*"
      );
      ws_manager.send(JSON.stringify({ command: "Pong" }));
      setAlertState({
        ...alertState,
        errorAlert: false,
        successAlert: true,
        warningAlert: false,
        infoAlert: false,
      });
      setAlertContent("Start the Exercise");
    } else if (step === 2) {
      ws_manager.send(JSON.stringify({ command: "exit", exercise: "" }));
      stopSimulation();
    }

    ws_manager.onopen = function () {
      level++;

      connectionUpdate({ connection: "manager", command: "up" }, "*");
      connectionUpdate({ connection: "exercise", command: "available" }, "*");
    };

    ws_manager.onclose = function () {
      connectionUpdate({ connection: "manager", command: "down" }, "*");
      if (!firstAttempt) {
        setAlertState({
          ...alertState,
          errorAlert: true,
          successAlert: false,
          warningAlert: false,
          infoAlert: false,
        });
        setAlertContent("Connection lost, retrying connection...");
        // alert("Connection lost, retrying connection...");
        startSim(step, circuit, websocket_address);
      } else {
        firstAttempt = false;
        // setFirstAttempt(false);
      }
    };

    ws_manager.onerror = function () {
      connectionUpdate({ connection: "manager", command: "down" }, "*");
    };

    ws_manager.onmessage = function (event) {
      if (event.data.level > level) {
        level = event.data.level;
        connectionUpdate(
          {
            connection: "exercise",
            command: "launch_level",
            level: `${level}`,
          },
          "*"
        );
      }
      if (event.data.includes("Ping")) {
        if (!websockets_connected && event.data === "Ping3") {
          level = 4;

          connectionUpdate(
            {
              connection: "exercise",
              command: "launch_level",
              level: `${level}`,
            },
            "*"
          );
          websockets_connected = true;
          declare_code(address_code);
          declare_gui(address_gui);
        }
        if (gazeboToggle) {
          if (gazeboOn) {
            ws_manager.send(JSON.stringify({ command: "startgz" }));
          } else {
            ws_manager.send(JSON.stringify({ command: "stopgz" }));
          }
          gazeboToggle = false;
          // setGazeboToggle(false);
        } else if (simStop) {
          ws_manager.send(JSON.stringify({ command: "stop" }));
          simStop = false;
          running = false;
          // setRunning(false);
        } else if (simReset) {
          ws_manager.send(JSON.stringify({ command: "reset" }));
          simReset = false;
          // setSimReset(false);
        } else if (sendCode) {
          let python_code = editorRef.current.editor.getValue();
          python_code = "#code\n" + python_code;
          ws_manager.send(
            JSON.stringify({ command: "evaluate", code: python_code })
          );
          sendCode = false;
          // setSendCode(false);
        } else if (simResume) {
          ws_manager.send(JSON.stringify({ command: "resume" }));
          // setSimResume(false);
          simResume = false;
          running = true;
          // setRunning(true);
        } else {
          setTimeout(function () {
            ws_manager.send(JSON.stringify({ command: "Pong" }));
          }, 1000);
        }
      }
      if (event.data.includes("evaluate")) {
        if (event.data.length < 9) {
          // If there is an error it is sent along with "evaluate"
          submitCode();
        } else {
          let error = event.data.substring(10, event.data.length);
          connectionUpdate(
            { connection: "exercise", command: "error", text: error },
            "*"
          );
        }
        setTimeout(function () {
          ws_manager.send(JSON.stringify({ command: "Pong" }));
        }, 1000);
      } else if (event.data.includes("reset")) {
        // ResetEvaluator();
      } else if (event.data.includes("PingDone")) {
        enableSimControls();
        if (resetRequested === true) {
          resetRequested = false;
        }
      } else if (event.data.includes("style")) {
        let error = event.data.substring(5, event.data.length);
        connectionUpdate(
          { connection: "exercise", command: "style", text: error },
          "*"
        );
      }
    };
  };

  function resetSimulation() {
    simReset = true;
    // setSimReset(true);
  }

  function stopSimulation() {
    simStop = true;
  }

  function resumeSimulation() {
    simResume = true;
    // setSimResume(true);
  }

  function connectionUpdate(data) {
    if (data.connection === "manager") {
      if (data.command === "up") {
        setConnectionState("Connected");
        // launchButton.prop("disabled", false);
      } else if (data.command === "down") {
        setConnectionState("Connect");
        if (websocket_code != null) websocket_code.close();
        if (websocket_gui != null) websocket_gui.close();
        setLaunchState("Launch");
      }
    } else if (data.connection === "exercise") {
      if (data.command === "available") {
        // Nothing !
      } else if (data.command === "up") {
        stop();
        swapping = false;
        setLaunchState("Ready");
        togglePlayPause(false);
        let reset_button = document.getElementById("reset");
        reset_button.disabled = false;
        reset_button.style.opacity = "1.0";
        reset_button.style.cursor = "default";
        let load_button = document.getElementById("loadIntoRobot");
        load_button.disabled = false;
        load_button.style.opacity = "1.0";
        load_button.style.cursor = "default";
      } else if (data.command === "down") {
        if (!swapping) {
          setLaunchState("Launch");
        }
      } else if (data.command === "swap") {
        setLaunchState("Launching");
      } else if (data.command === "launch_level") {
        var level = data.level;
        setLaunchLevel(level);
        setLaunchState("Launching");
      } else if (data.command === "error") {
        setErrorContent(<Typography>{data.text}</Typography>);
        handleErrorModalOpen();
        toggleSubmitButton(true);
      } else if (data.command === "style") {
        setErrorContentHeading("Style Evaluation ");
        handleErrorModalOpen();

        if (data.text.replace(/\s/g, "").length)
          setErrorContent(<Typography>{data.text}</Typography>);
        else
          setErrorContent(
            <Typography color={"success"}>Everything is correct !</Typography>
          );
        //
      }
    }
  }

  function enablePlayPause(enable) {
    let playPause_button = document.getElementById("submit");
    if (enable === false) {
      playPause_button.disabled = true;
      playPause_button.style.opacity = "0.4";
      playPause_button.style.cursor = "not-allowed";
    } else if (firstCodeSent === true) {
      playPause_button.disabled = false;
      playPause_button.style.opacity = "1.0";
      playPause_button.style.cursor = "default";
    }
  }

  const changeConsole = (openSnackbar) => {
    if (openSnackbar) {
      setAlertState({
        ...alertState,
        errorAlert: false,
        successAlert: false,
        warningAlert: false,
        infoAlert: true,
      });
      setAlertContent(`Console Opened !!`);
    } else {
      setAlertState({
        ...alertState,
        errorAlert: false,
        successAlert: false,
        warningAlert: true,
        infoAlert: false,
      });
      setAlertContent(`Console Closed !!`);
    }
    setOpenConsole(!openConsole);
  };

  const changeGzWeb = (openSnackbar) => {
    if (openSnackbar) {
      setAlertState({
        ...alertState,
        errorAlert: false,
        successAlert: false,
        warningAlert: true,
        infoAlert: false,
      });
      setAlertContent(`Gazebo Opened !!`);
    } else {
      setAlertState({
        ...alertState,
        errorAlert: false,
        successAlert: false,
        warningAlert: false,
        infoAlert: true,
      });
      setAlertContent(`Gazebo Closed !!`);
    }
    gazeboOn = !gazeboOn;
    setOpenGazebo(gazeboOn);
    gazeboToggle = true;
  };

  const toggleSubmitButton = (toggle) => {
    var loadIntoRobot = document.getElementById("loadIntoRobot");
    if (toggle === false) {
      loadIntoRobot.disabled = true;
      loadIntoRobot.style.opacity = "0.4";
      loadIntoRobot.style.cursor = "not-allowed";
      handleLoadModalOpen();
    } else {
      loadIntoRobot.disabled = false;
      loadIntoRobot.style.opacity = "1.0";
      loadIntoRobot.style.cursor = "default";
      handleLoadModalClose();
    }
  };

  function toggleResetButton(toggle) {
    let reset_button = document.getElementById("reset");
    if (toggle === false) {
      reset_button.disabled = true;
      reset_button.style.opacity = "0.4";
      reset_button.style.cursor = "not-allowed";
    } else {
      reset_button.disabled = false;
      reset_button.style.opacity = "1.0";
      reset_button.style.cursor = "default";
    }
  }

  function togglePlayPause(stop) {
    setPlayState(!stop);
  }

  function enableSimControls() {
    if (resetRequested === true) {
      togglePlayPause(false);
    }
    enablePlayPause(true);
    toggleResetButton(true);
  }

  // Function to resume the simulation
  const start = () => {
    enablePlayPause(false);
    toggleResetButton(false);
    // Manager Websocket
    if (running === false) {
      resumeSimulation();
      // resumeBrain();
      //check(); // should be replaced by resumeBrain() when available
    }

    // GUI Websocket
    unpause_lap();

    // Toggle start/pause
    togglePlayPause(true);
  };

  function editorChanged(toggle) {
    if (firstCodeSent && toggle) {
      setAlertState({
        ...alertState,
        errorAlert: true,
        successAlert: false,
        warningAlert: false,
        infoAlert: false,
      });
      setAlertContent(`Code Changed since last sending`);
    }
  }
  // Function to request to load the student code into the robot
  const check = () => {
    editorChanged(false);
    toggleSubmitButton(false);
    // setSendCode(true);
    sendCode = true;
  };

  // Function to stop the student solution
  const stop = () => {
    enablePlayPause(false);
    toggleResetButton(false);
    //stopCode(); // should be replaced by pauseBrain() when available
    // Manager Websocket
    if (running === true) {
      stopSimulation();
      // stopBrain();
    }

    // GUI Websocket
    pause_lap();

    // Toggle start/pause
    togglePlayPause(false);
  };

  // Function to reset the simulation
  function resetSim() {
    resetRequested = true;
    // setResetRequested(true);
    toggleResetButton(false);
    enablePlayPause(false);

    // Manager Websocket
    resetSimulation();

    // GUI Websocket
    reset_gui();
    running = false;
    // setRunning(false);
  }
  const loadButtonClick = () => {};

  const teleOpButtonClick = () => {
    if (!teleOpMode) {
      if (!running) {
        resetSimulation();
        running = true;
        // setRunning(true);
      }
      teleOpMode = true;
      // setTeleopMode(true);
      document.addEventListener("keydown", keyHandler, false);
      document.addEventListener("keyup", keyHandler, false);
      return;
    }
    teleOpMode = false;
    // setTeleopMode(false);
    submitCode();
    document.removeEventListener("keydown", keyHandler, false);
    document.removeEventListener("keyup", keyHandler, false);
  };

  function createData(key, value) {
    return { key, value };
  }

  function declare_code(websocket_address) {
    websocket_code = new WebSocket(websocket_address);

    websocket_code.onopen = function () {
      connectionUpdate(
        { connection: "exercise", command: "launch_level", level: "5" },
        "*"
      );
      if (websocket_gui.readyState === 1) {
        setAlertState({
          ...alertState,
          errorAlert: false,
          successAlert: true,
          warningAlert: false,
          infoAlert: false,
        });
        setAlertContent(" Connection established! ");
        // alert("[open] Connection established!");
        connectionUpdate({ connection: "exercise", command: "up" }, "*");
      }
      websocket_code.send("#ping");
    };
    websocket_code.onclose = function (event) {
      connectionUpdate({ connection: "exercise", command: "down" }, "*");
      if (websocket_gui.readyState === 1) {
        if (event.wasClean) {
          setAlertState({
            ...alertState,
            errorAlert: false,
            successAlert: false,
            warningAlert: true,
            infoAlert: false,
          });
          setAlertContent(
            `Connection closed cleanly, code=${event.code} reason=${event.reason}`
          );
          // alert(
          //   `[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`
          // );
        } else {
          setAlertState({
            ...alertState,
            errorAlert: false,
            successAlert: false,
            warningAlert: true,
            infoAlert: false,
          });
          setAlertContent(" Connection closed! ");
          // alert("[close] Connection closed!");
        }
      }
    };

    websocket_code.onmessage = function (event) {
      const source_code = event.data;
      let operation = source_code.substring(0, 5);
      if (operation === "#load") {
        code = source_code.substring(5);
        setEditorCode(source_code.substring(5));
      } else if (operation === "#freq") {
        var frequency_message = JSON.parse(source_code.substring(5));

        // Parse GUI and Brain frequencies
        const idealGuiFreqValue = frequency_message.gui;
        const idealBrainFreqValue = frequency_message.brain;
        // Parse real time factor
        const rtfValue = frequency_message.rtf;

        setFrequencyRows([
          createData("Brain Frequency (Hz)", idealBrainFreqValue),
          createData("GUI Frequency (Hz)", idealGuiFreqValue),
          createData("Simulation Real time factor", rtfValue),
        ]);

        // The acknowledgement messages invoke the python server to send further
        // messages to this client (inside the server's handle function)
        // Send the acknowledgment message along with frequency
        let code_frequency = brainFreqAck;
        let gui_frequency = guiFreqAck;
        let real_time_factor = rtfValue;

        frequency_message = {
          brain: code_frequency,
          gui: gui_frequency,
          rtf: real_time_factor,
        };
        websocket_code.send("#freq" + JSON.stringify(frequency_message));
      } else if (operation === "#ping") {
        websocket_code.send("#ping");
      } else if (operation === "#exec") {
        if (firstCodeSent === false) {
          firstCodeSent = true;
          // setFirstCodeSent(true);
          enablePlayPause(true);
        }
        toggleSubmitButton(true);
      } else if (operation === "#stpd") {
        startNewCircuit();
      }

      // Send Teleop message if active
      if (teleOpMode) {
        let teleOpMessage = { v: v, w: w };
        websocket_code.send("#tele" + JSON.stringify(teleOpMessage));
      }
    };
  }

  // To decode the image string we will receive from server
  function decode_utf8(s) {
    return decodeURIComponent(escape(s));
  }
  function declare_gui(websocket_address) {
    websocket_gui = new WebSocket(websocket_address);

    websocket_gui.onopen = function (event) {
      setLaunchLevel(launchLevel + 1);
      connectionUpdate(
        { connection: "exercise", command: "launch_level", level: "5" },
        "*"
      );
      if (websocket_code.readyState === 1) {
        setAlertState({
          ...alertState,
          errorAlert: false,
          successAlert: true,
          warningAlert: false,
          infoAlert: false,
        });
        setAlertContent(" Connection established! ");
        // alert("[open] Connection established!");
        connectionUpdate({ connection: "exercise", command: "up" }, "*");
      }
    };

    websocket_gui.onclose = function (event) {
      connectionUpdate({ connection: "exercise", command: "down" }, "*");
      if (event.wasClean) {
        setAlertState({
          ...alertState,
          errorAlert: false,
          successAlert: false,
          warningAlert: true,
          infoAlert: false,
        });
        setAlertContent(
          `Connection closed cleanly, code=${event.code} reason=${event.reason}`
        );
        // alert(
        //   `[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`
        // );
      } else {
        setAlertState({
          ...alertState,
          errorAlert: false,
          successAlert: false,
          warningAlert: true,
          infoAlert: false,
        });
        setAlertContent(`Connection closed!`);
        // alert("[close] Connection closed!");
      }
    };

    // What to do when a message from server is received
    websocket_gui.onmessage = function (event) {
      let operation = event.data.substring(0, 4);
      let mapCanvas = document.getElementById("birds-eye");
      let canvas = document.getElementById("gui_canvas");
      if (operation === "#gui") {
        // Parse the entire Object
        let data = JSON.parse(event.data.substring(4));

        // Parse the Image Data
        (image_data = JSON.parse(data.image)),
          (source = decode_utf8(image_data.image)),
          (shape = image_data.shape);

        if (source !== "" && running === true) {
          canvas.src = "data:image/jpeg;base64," + source;
        }
        // Parse the Map data
        // Slice off ( and )
        pose = data.map.substring(1, data.map.length - 1);
        content = pose.split(",").map(function (item) {
          return parseFloat(item);
        });
        setInitialPosition(content);
        drawCircle(content[0], content[1], content, mapCanvas);

        // Send the Acknowledgment Message
        websocket_gui.send("#ack");
      }
      // else if (operation === "#cor") {
      // 	// Set the value of command
      // 	command_input = event.data.substring(4,);
      // 	command.value = command_input;
      // 	// Go to next command line
      // 	next_command();
      // 	// Focus on the next line
      // 	command.focus();
      // }
    };
  }

  function pauseLap() {
    websocket_gui.send("#paus");
  }

  function unPauseLap() {
    websocket_gui.send("#resu");
  }

  function resetGui() {
    websocket_gui.send("#rest");
  }
  const editorCodeChange = (e) => {
    console.log(e);
    code = e;
    setEditorCode(e);
  };

  const onClickSave = () => {
    saveCode(filename, code);
  };

  function startNewCircuit() {
    // Kill actual sim
    startSim(2);
    // StartSim
    swapping = true;
    // setSwapping(true);
    startSim(1, circuit);
    connectionUpdate({ connection: "exercise", command: "swap" }, "*");
    toggleSubmitButton(false);
    firstCodeSent = false;
    // setFirstCodeSent(false);
  }

  function handleCircuitChange(e, circuitSelector) {
    let circuit_ = e.target.value;
    circuitSelector.current.value = circuit_;
    setCircuit(circuit_);
    setBirdEyeClass(circuit_);
    gazeboToggle = true;
    // Stop the simulation
    stop();
    // Kill actual sim
    stopBrain();

    startNewCircuit();
    // setAlertState({
    //   ...alertState,
    //   errorAlert: false,
    //   successAlert: false,
    //   warningAlert: false,
    //   infoAlert: true,
    // });
    // setAlertContent(
    //   `Loading circuit. Please wait until the connection is restored.`
    // );
    // connectionUpdate({ connection: "exercise", command: "down" }, "*");
  }

  function scaleToFit(img, ctx, canvas) {
    // get the scale
    const scale = Math.min(
      canvas.width / img.width,
      canvas.height / img.height
    );
    // get the top left position of the image
    const x = canvas.width / 2 - (img.width / 2) * scale;
    const y = canvas.height / 2 - (img.height / 2) * scale;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  }

  const connectionButtonClick = () => {
    if (connectionState === "Connect") {
      setConnectionState("Connecting");
      startSim(0, "default");
    }
  };

  const launchButtonClick = () => {
    if (connectionState === "Connected" && launchState === "Launch") {
      setLaunchState("Launching");
      startSim(1, circuit);
    } else if (connectionState === "Connect") {
      setAlertState({
        ...alertState,
        errorAlert: false,
        successAlert: false,
        warningAlert: true,
        infoAlert: false,
      });
      setAlertContent(
        `A connection with the manager must be established before launching an exercise`
      );
      // alert(
      //   "A connection with the manager must be established before launching an exercise"
      // );
    }
  };

  function deactivateTeleopButton() {
    // setTeleopMode(false);
    teleOpMode = true;
    document.removeEventListener("keydown", keyHandler, false);
    document.removeEventListener("keyup", keyHandler, false);
  }

  const resumeBrain = () => {
    let message = "#play\n";
    console.log("Message sent!");
    websocket_code.send(message);
  };

  const stopBrain = () => {
    let message = "#stop\n";
    console.log("Message sent!");
    websocket_code.send(message);
  };

  const resetBrain = () => {
    let message = "#rest\n";
    console.log("Message sent!");
    websocket_code.send(message);
  };

  // Function that sends/submits the code!
  const submitCode = () => {
    try {
      // Get the code from editor and add headers
      // Debug Code Submission -->

      // var python_code = code;
      // var python_code = editorCode;
      // var python_code = "#code      \n" + code;
      var python_code = "#code\n" + editorRef.current.editor.getValue();
      console.log(`Code submitted --> ${python_code}`);
      websocket_code.send(python_code);
      setAlertState({
        ...alertState,
        errorAlert: false,
        successAlert: false,
        warningAlert: false,
        infoAlert: true,
      });
      setAlertContent(`Code Sent! Check terminal for more information!`);
      // deactivateTeleopButton();
    } catch {
      setAlertState({
        ...alertState,
        errorAlert: false,
        successAlert: false,
        warningAlert: true,
        infoAlert: false,
      });
      setAlertContent(
        `Connection must be established before sending the code.`
      );
      // alert("Connection must be established before sending the code.");
    }
  };

  // Function that send/submits an empty string
  const stopCode = () => {
    var stop_code = "#code\n";
    console.log("Message sent!");
    websocket_code.send(stop_code);
  };

  // Function for range slider
  const codeFrequencyUpdate = (e) => {
    // console.log(e.target.data);
    brainFreqAck = brainFreqAck + 1;
    setBrainFreq(brainFreqAck);
  };

  // Function for range slider
  const guiFrequencyUpdate = (e) => {
    guiFreqAck = guiFreqAck + 1;
    setGuiFreq(guiFreqAck);
  };
  function keyHandler(event) {
    // Right (39), Left (37), Down (40), Up (38)

    // First check if websocket_gui_guest and websocket_code_guest are defined
    if (
      typeof websocket_gui !== "undefined" &&
      typeof websocket_code !== "undefined"
    ) {
      let cmd = "#tele";

      // Prevent using arrow keys to scroll page
      if ([32, 37, 38, 39, 40].indexOf(event.keyCode) > -1) {
        event.preventDefault();
      }

      if (event.keyCode === 39) {
        //console.log('Right');
        w = event.type === "keydown" ? -1 : 0;
      } else if (event.keyCode === 37) {
        //console.log('Left');
        w = event.type === "keydown" ? 1 : 0;
      } else if (event.keyCode === 40) {
        //console.log('Down');
        v = event.type === "keydown" ? -2 : 0;
      } else if (event.keyCode === 38) {
        //console.log('Up');
        v = event.type === "keydown" ? 2 : 0;
      }
      console.log("v: ", v, "w: ", w);
    }
  }

  function pause_lap() {
    websocket_gui.send("#paus");
  }

  function unpause_lap() {
    websocket_gui.send("#resu");
  }

  function reset_gui() {
    websocket_gui.send("#rest");
  }
  const loadFileButton = (event) => {
    event.preventDefault();
    var fr = new FileReader();
    fr.onload = (event) => {
      code = fr.result;
      setEditorCode(fr.result);
    };
    fr.readAsText(event.target.files[0]);
  };
  const handleInfoModalOpen = () => setOpenInfoModal(true);
  const handleInfoModalClose = () => setOpenInfoModal(false);
  const handleErrorModalOpen = () => setOpenErrorModal(true);
  const handleErrorModalClose = () => setOpenErrorModal(false);
  const handleLoadModalOpen = () => setOpenLoadModal(true);
  const handleLoadModalClose = () => setOpenLoadModal(false);
  const handleFilenameChange = (event) => setFilename(event.target.value);

  return (
    <ExerciseContext.Provider
      value={{
        editorCode,
        openLoadModal,
        handleLoadModalOpen,
        handleLoadModalClose,
        check,
        onClickSave,
        editorCodeChange,
        connectionState,
        launchState,
        connectionButtonClick,
        launchButtonClick,
        resetSim,
        start,
        stop,
        loadFileButton,
        startSim,
        circuit,
        // backgroundImage,
        scaleToFit,
        handleCircuitChange,
        getCircuitValue,
        launchLevel,
        loadButtonClick,
        teleOpButtonClick,
        connectionUpdate,
        changeGzWeb,
        changeConsole,
        openGazebo,
        playState,
        birdEyeClass,
        openConsole,
        alertState,
        alertContent,
        brainFreq,
        guiFreq,
        codeFrequencyUpdate,
        guiFrequencyUpdate,
        frequencyRows,
        handleInfoModalOpen,
        handleInfoModalClose,
        openInfoModal,
        openErrorModal,
        handleErrorModalOpen,
        handleErrorModalClose,
        errorContent,
        errorContentHeading,
        filename,
        handleFilenameChange,
        editorRef,
      }}
    >
      {children}
    </ExerciseContext.Provider>
  );
}

ExerciseProvider.propTypes = {
  children: PropTypes.node,
};

export default ExerciseContext;