let song;

let video;
let poseNet;
let pose;
let skeleton;

let brain;
let notes = {
  C: 261.6256,
  D: 293.6648,
  E: 329.6276
};
let env, wave;
let rSlider, gSlider, bSlider;

let state = 'waiting';

function delay(time) {
  return new Promise((resolve, reject) => {
    if (isNaN(time)) {
      reject(new Error('delay requires a valid number.'));
    } else {
      setTimeout(resolve, time);
    }
  });
}

function trainModel() {
  brain.normalizeData();
  let options = {
    epochs: 50
  };
  brain.train(options, finishedTraining);
}

async function keyPressed() {
  if (key == 's') {
    brain.saveData();
  } else if (key == 't') {
    trainModel();
  } else if (key == 'd') {
    let r = rSlider.value();
    let g = gSlider.value();
    let b = bSlider.value();
    targetColor = [r, g, b];

    console.log(r, g, b);

    await delay(3000);
    console.log('collecting');
    state = 'collecting';

    await delay(3000);
    console.log('not collecting');
    state = 'waiting';
  }
}

function setup() {
  createCanvas(640, 480);
  song = loadSound('meditation.mp3');

  env = new p5.Envelope();
  env.setADSR(0.05, 0.1, 0.5, 1);
  env.setRange(1.2, 0);

  wave = new p5.Oscillator();

  wave.setType('sine');
  wave.start();
  wave.freq(440);
  wave.amp(env);
  rSlider = createSlider(0, 255, 0);
  gSlider = createSlider(0, 255, 0);
  bSlider = createSlider(0, 255, 0);

  video = createCapture(VIDEO);
  video.hide();
  poseNet = ml5.poseNet(video, modelLoaded);
  poseNet.on('pose', gotPoses);

  let options = {
    inputs: 34,
    outputs: 3,
    task: 'regression',
    debug: true
  };
  brain = ml5.neuralNetwork(options);

   brain.loadData('color_poses.json', dataReady);

   const modelInfo = {
    model: 'model/model.json',
    metadata: 'model/model_meta.json',
    weights: 'model/model.weights.bin',
   };
   brain.load(modelInfo, brainLoaded);
}

function dataReady() {
  trainModel();
}

function brainLoaded() {
  console.log('pose predicting ready!');
  predictColor();
}

function finishedTraining() {
  brain.save();
  predictColor();
}

function predictColor() {
  if (pose) {
    let inputs = [];
    for (let i = 0; i < pose.keypoints.length; i++) {
      let x = pose.keypoints[i].position.x;
      let y = pose.keypoints[i].position.y;
      inputs.push(x);
      inputs.push(y);
    }
    brain.predict(inputs, gotResult);
  } else {
    setTimeout(predictColor, 100);
  }
}

function gotResult(error, results) {
  let r = results[0].value;
  let g = results[1].value;
  let b = results[2].value;
  rSlider.value(r);
  gSlider.value(g);
  bSlider.value(b);
  predictColor();

  wave.freq(notes[label]);
  env.play();
}

function gotPoses(poses) {
  if (poses.length > 0) {
    pose = poses[0].pose;
    skeleton = poses[0].skeleton;
    if (state == 'collecting') {
      let inputs = [];
      for (let i = 0; i < pose.keypoints.length; i++) {
        let x = pose.keypoints[i].position.x;
        let y = pose.keypoints[i].position.y;
        inputs.push(x);
        inputs.push(y);
      }
      brain.addData(inputs, targetColor);
    }
  }
  // wave.freq(notes[targetLabel]);
  //   env.play();
}

function modelLoaded() {
  console.log('poseNet ready');
}

function mousePressed() {
  if (song.isPlaying()) {
    song.stop();
    background(255, 0, 0);
  } else {
    song.play();
    background(0, 255, 0);
  }
}

function draw() {
  push();
  translate(video.width, 0);
  scale(-1, 1);
  image(video, 0, 0, video.width, video.height);

  if (pose) {
    for (let i = 0; i < skeleton.length; i++) {
      let a = skeleton[i][0];
      let b = skeleton[i][1];
      strokeWeight(2);
      stroke(0);

      line(a.position.x, a.position.y, b.position.x, b.position.y);
    }
    for (let i = 0; i < pose.keypoints.length; i++) {
      let x = pose.keypoints[i].position.x;
      let y = pose.keypoints[i].position.y;
      fill(0);
      stroke(255);
      ellipse(x, y, 16, 16);
    }
  }
  pop();

  let r = rSlider.value();
  let g = gSlider.value();
  let b = bSlider.value();
  background(r, g, b, 100);
  
}
