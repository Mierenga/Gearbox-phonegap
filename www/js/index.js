/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
class BoundInput {

  constructor(inputName, data) {
    this.data = data;
    if (typeof inputName !== 'string') {
      console.log('BoundInput construction failed: non-string inputName');
      return;
    }
    console.log('Binding ');
      console.log('Binding ' + inputName);
      this.name = inputName;
      let elements = document.getElementsByName(inputName);
      if (elements.length === 0) {
        console.log('BoundInput construction failed: element with inputName "' + inputName + '" not found');
        return;
      }
      if (elements.length > 1) {
        console.log('BoundInput construction warning: found multiple elements with inputName "' + inputName + '". Defaulting to first result.');
      }
      // take the first result
      this.element = elements[0];
      this.element.value = data;
      this.element.addEventListener('click', this, true);
      this.element.addEventListener('change', this, true);
  }

  handleEvent(event) {
    switch(event.type) {
      case "change": this.change(this.element.value);break;
      case "click": this.click(this.element.value);break;
    }
  }

  change(value) {
    this.data = value;
    this.element.value = value;
    BoundInput._callGlobalChangeListener(this.name);
  }

  click(value) {
    this.element.select();
  }

  static set globalChangeListener(listener) {
    BoundInput._globalChangeListener = listener;
  }

  static _callGlobalChangeListener(name) {
    if (typeof BoundInput._globalChangeListener === 'function') {
      BoundInput._globalChangeListener(name);
    }
  }

}

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() {

        app.receivedEvent('deviceready');

        app.inputs = {
          motorRPM: new BoundInput('motor-rpm', 1750),
          motorKW: new BoundInput('motor-kw', 37.3),
          motorPulley: new BoundInput('motor-pulley', 7.5),
          gearboxPulley: new BoundInput('gearbox-pulley', 9.75),
          iex: new BoundInput('ratio-iex', 40.781),
          t2n: new BoundInput('t2n', 31),
          p1n: new BoundInput('p1n', 115),
          n1: new BoundInput('n1', 1450),
          pg1: new BoundInput('pg1', 37),
          ambientTemp: new BoundInput('ambient-temp', 30),
          opCycle: new BoundInput('op-cycle', 20),
        };

        app.outputs = {
          safetyFactor: new BoundOutput('safety-factor', 4),
          thermal: new BoundOutput('thermal', 5),
          gearboxInputRPM: new BoundOutput('gearbox-input-rpm', 6),
          gearboxOutputRPM: new BoundOutput('gearbox-output-rpm', 7),
          gearboxOutputTorque: new BoundOutput('gearbox-output-torque', 8),
        }

        app.calc = new Calc(app.inputs, app.outputs);

        BoundInput.globalChangeListener = (name) => {
          app.calc.recalc(name);
        };

        app.calc.recalc();
    },

    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    }
};



function BoundOutput(element, data) {
  this.data = data;
  console.log('Binding ');
  if (typeof element === 'string') {
    console.log('Binding ' + element);
    this.element = document.getElementById(element);
  } else {
    this.element = element;
  }
  this.element.innerHTML = data;
}

BoundOutput.prototype.change = function(value) {
  this.data = value;
  this.element.innerHTML = value
};

class Calc {

  constructor(inputs, outputs) {
    this.inputs = inputs;
    this.outputs = outputs;
  }

  recalc(item) {
    console.log('recalc');
    console.log(this.inputs);
    console.log(this.outputs);
    this.outputs.safetyFactor.change(this._calcSafetyFactor());
    this.outputs.thermal.change(this._calcThermal());
    this.outputs.gearboxInputRPM.change(this._calcGearboxInputRPM());
    this.outputs.gearboxOutputRPM.change(this._calcGearboxOutputRPM());
    this.outputs.gearboxOutputTorque.change(this._calcGearboxOutputTorque());
  }

  _calcGearboxInputRPM() {
    let motorRPM  = this.inputs.motorRPM.data;
    let motorPulleyDiameter = this.inputs.motorPulley.data;
    let gearboxPulleyDiameter = this.inputs.gearboxPulley.data;
    return (motorRPM * motorPulleyDiameter) / gearboxPulleyDiameter;
  }

  _calcSafetyFactor() {
    let motorKW = this.inputs.motorKW.data;
    let inputGearboxRPM = this._calcGearboxInputRPM();
    let iex = this.inputs.iex.data;
    let t2n = this.inputs.t2n.data;

    let const1 = 1000;
    let const2 = 9.5493;

    let safetyFactor = ((t2n*const1)/(((motorKW*const1*const2)/inputGearboxRPM)*iex));
    return safetyFactor;
  }

  _calcActualP1N() {
    let p1n = this.inputs.p1n.data;
    let n1 = this.inputs.n1.data;
    let inputGearboxRPM = this._calcGearboxInputRPM();
    return (p1n/n1)*inputGearboxRPM;
  }

  _caclUtilizationForF14() {
    let p1 = this.inputs.motorKW.data;
    let p1nActual = this._calcActualP1N();
    let utilization = p1/p1nActual;
    let chart = [
      [0.35, 0.66],
      [0.45, 0.77],
      [0.55, 0.83],
      [0.65, 0.9],
      [0.75, 0.9],
      [0.85, 0.95],
      [0.95, 1]
    ];
    for (let pair of chart) {
      if (utilization < pair[0]) {
        return pair[1];
      }
    }
    // -1 if the chart lookup failed
    return -1;
  }

  _calcThermal() {
    let ambientTemp = this.inputs.ambientTemp.data.toString();
    let opCycle = this.inputs.opCycle.data;
    let pg1 = this.inputs.pg1.data;
    let p1 = this.inputs.motorKW.data;

    let chart = {
      'head': [100, 80, 60, 40, 20],
      '10': [1.14, 1.2, 1.32, 1.54, 2.04],
      '20': [1, 1.06, 1.16, 1.35, 1.79],
      '30': [0.87, 0.93, 1, 1.18, 1.56],
      '40': [0.71, 0.75, 0.82, 0.96, 1.27],
      '50': [0.55, 0.58, 0.64, 0.74, 0.98]
    };

    let chartRow = chart[ambientTemp];
    if (!chartRow) {
      console.log('_calcThermal invalid ambientTemp: ' + ambientTemp);
      return "FAIL";
    }
    let ft;
    for (let i = chartRow.length-1; i >= 0; i--) {
      if (opCycle <= chart.head[i]) {
        ft = chartRow[i];
        break;
      }
    }

    if (!ft) {
      console.log('_calcThermal invalid opCycle: ' + opCycle);
      return "FAIL";
    }

    console.log('pg1 ' + pg1);
    console.log('ft ' + ft);

    let testP1 = pg1 * ft * this._caclUtilizationForF14();

    console.log('testP1 ' + testP1);
    console.log('p1 ' + p1);
    if (testP1 >= p1) {
      return "PASS";
    }

    return "FAIL";
  }

  _calcGearboxOutputRPM() {
    let iex = this.inputs.iex.data;
    return this._calcGearboxInputRPM() / iex;
  }

  _calcGearboxOutputTorque() {
    let t2n = this.inputs.t2n.data;
    let safetyFactor = this._calcSafetyFactor();
    return t2n / safetyFactor;
  }

}

