/* eslint-disable max-classes-per-file */
/* eslint-disable no-restricted-globals */
/* eslint-disable no-undef */
$(document).ready(() => {
  // if deployed to a site supporting SSL, use wss://
  const protocol = document.location.protocol.startsWith('https') ? 'wss://' : 'ws://';
  const webSocket = new WebSocket(protocol + location.host);
 
  // A class for holding the last N points of telemetry for a device
  class DeviceData {
    constructor(deviceId) {
      this.deviceId = deviceId;
      this.maxLen = 50;
      this.timeData = new Array(this.maxLen);
      this.voltageData = new Array(this.maxLen);
      this.currentData = new Array(this.maxLen);
      this.socData = new Array(this.maxLen);
      this.temperatureData = new Array(this.maxLen);
      this.capacityData = new Array(this.maxLen);
      
    }
 
    addData(time, voltage, current, soc, temperature, capacity) {
      this.timeData.push(time);
      this.voltageData.push(voltage);
      this.currentData.push(current);
      this.socData.push(soc);
      this.temperatureData.push(temperature);
      this.capacityData.push(capacity);
 
      if (this.timeData.length > this.maxLen) {
        this.timeData.shift();
        this.voltageData.shift();
        this.currentData.shift();
        this.socData.shift();
        this.temperatureData.shift();
        this.capacityData.shift();
      }
    }
  }
 
  // All the devices in the list (those that have been sending telemetry)
  class TrackedDevices {
    constructor() {
      this.devices = [];
    }
 
    // Find a device based on its Id
    findDevice(deviceId) {
      for (let i = 0; i < this.devices.length; ++i) {
        if (this.devices[i].deviceId === deviceId) {
          return this.devices[i];
        }
      }
 
      return undefined;
    }
 
    getDevicesCount() {
      return this.devices.length;
    }
  }
 
  const trackedDevices = new TrackedDevices();
 
  // Define the chart axes
  const chartData = {
    datasets: [
      {
        fill: false,
        label: 'Voltage',
        yAxisID: 'Voltage',
        borderColor: 'rgba(255, 204, 0, 1)',
        pointBoarderColor: 'rgba(255, 204, 0, 1)',
        backgroundColor: 'rgba(255, 204, 0, 0.4)',
        pointHoverBackgroundColor: 'rgba(255, 204, 0, 1)',
        pointHoverBorderColor: 'rgba(255, 204, 0, 1)',
        spanGaps: true,
      },
      {
        fill: false,
        label: 'Current',
        yAxisID: 'Current',
        borderColor: 'rgba(24, 120, 240, 1)',
        pointBoarderColor: 'rgba(24, 120, 240, 1)',
        backgroundColor: 'rgba(24, 120, 240, 0.4)',
        pointHoverBackgroundColor: 'rgba(24, 120, 240, 1)',
        pointHoverBorderColor: 'rgba(24, 120, 240, 1)',
        spanGaps: true,
      },

      {
        fill: false,
        label: 'State of Charge',
        yAxisID: 'State of Charge',
        borderColor: 'rgba(255, 87, 34, 1)',
        pointBoarderColor: 'rgba(255, 87, 34, 1)',
        backgroundColor: 'rgba(255, 87, 34, 0.4)',
        pointHoverBackgroundColor: 'rgba(255, 87, 34, 1)',
        pointHoverBorderColor: 'rgba(255, 87, 34, 1)',
        spanGaps: true,
      },

      {
        fill: false,
        label: 'Temperature',
        yAxisID: 'Temperature',
        borderColor: 'rgba(238, 130, 238, 1)',
        pointBoarderColor: 'rgba(238, 130, 238, 1)',
        backgroundColor: 'rgba(238, 130, 238, 0.4)',
        pointHoverBackgroundColor: 'rgba(238, 130, 238, 1)',
        pointHoverBorderColor: 'rgba(238, 130, 238, 1)',
        spanGaps: true,
      },

      {
        fill: false,
        label: 'Capacity',
        yAxisID: 'Capacity',
        borderColor: 'rgba(0, 166, 90, 1)',
        pointBoarderColor: 'rgba(0, 166, 90, 1)',
        backgroundColor: 'rgba(0, 166, 90, 0.4)',
        pointHoverBackgroundColor: 'rgba(0, 166, 90, 1)',
        pointHoverBorderColor: 'rgba(0, 166, 90, 1)',
        spanGaps: true,
      },
    ]
  };
 
  const chartOptions = {
    scales: {
      yAxes: [{
        id: 'Voltage',
        type: 'linear',
        scaleLabel: {
          labelString: 'Voltage (V)',
          display: true,
        },
        position: 'left',
        ticks: {
          suggestedMin: 0,
          suggestedMax: 5,
          beginAtZero: true
        }
      },
      {
        id: 'Current',
        type: 'linear',
        scaleLabel: {
          labelString: 'Current (A)',
          display: true,
        },
        position: 'right',
        ticks: {
          suggestedMin: 0,
          suggestedMax: 10,
          beginAtZero: true
        }
      },

      {
        id: 'State of Charge',
        type: 'linear',
        scaleLabel: {
          labelString: 'State of Charge (%)',
          display: true,
        },
        position: 'right',
        ticks: {
          suggestedMin: 0,
          suggestedMax: 100,
          beginAtZero: true
        }
      },

      {
        id: 'Temperature',
        type: 'linear',
        scaleLabel: {
          labelString: 'Temperature (°C)',
          display: true,
        },
        position: 'right',
        ticks: {
          suggestedMin: 0,
          suggestedMax: 100,
          beginAtZero: true
        }
      },

      {
        id: 'Capacity',
        type: 'linear',
        scaleLabel: {
          labelString: 'Capacity (mAh)',
          display: true,
        },
        position: 'left',
        ticks: {
          suggestedMin: 0,
          suggestedMax: 3000,
          beginAtZero: true
        }
      }]
    }
  };
 
  const ctx = document.getElementById('iotChart').getContext('2d');
  const myLineChart = new Chart(
    ctx,
    {
      type: 'line',
      data: chartData,
      options: chartOptions,
    });

  // Manage a list of devices in the UI, and update which device data the chart is showing
  // based on selection
  let needsAutoSelect = true;
  const deviceCount = document.getElementById('deviceCount');
  const listOfDevices = document.getElementById('listOfDevices');
  function OnSelectionChange() {
    const device = trackedDevices.findDevice(listOfDevices[listOfDevices.selectedIndex].text);
    chartData.labels = device.timeData;
    chartData.datasets[0].data = device.voltageData;
    chartData.datasets[1].data = device.currentData;
    chartData.datasets[2].data = device.socData;
    chartData.datasets[3].data = device.temperatureData;
    chartData.datasets[4].data = device.capacityData;
    myLineChart.update();
  }
  listOfDevices.addEventListener('change', OnSelectionChange, false);

  // When a web socket message arrives:
  // 1. Unpack it
  // 2. Validate it has date/time and temperature
  // 3. Find or create a cached device to hold the telemetry data
  // 4. Append the telemetry data
  // 5. Update the chart UI
 
  webSocket.onmessage = function onMessage(message) {
    try {
      const messageData = JSON.parse(message.data);
      console.log(messageData);
 
      if (!messageData.MessageDate || (!messageData.IotData.voltage && !messageData.IotData.current && !messageData.IotData.soc && !messageData.IotData.temperature && !messageData.IotData.capacity)) {
        return;
      }

      // find or add device to list of tracked devices
      const existingDeviceData = trackedDevices.findDevice(messageData.DeviceId);
 
      if (existingDeviceData) {
        existingDeviceData.addData(messageData.MessageDate, messageData.IotData.voltage, messageData.IotData.current, messageData.IotData.soc, messageData.IotData.temperature, messageData.IotData.capacity);
      } else {
        const newDeviceData = new DeviceData(messageData.DeviceId);
        trackedDevices.devices.push(newDeviceData);
        const numDevices = trackedDevices.getDevicesCount();
        deviceCount.innerText = numDevices === 1 ? `${numDevices} device` : `${numDevices} devices`;
        newDeviceData.addData(messageData.MessageDate, messageData.IotData.voltage, messageData.IotData.current, messageData.IotData.soc, messageData.IotData.temperature, messageData.IotData.capacity);

        // add device to the UI list
        const node = document.createElement('option');
        const nodeText = document.createTextNode(messageData.DeviceId);
        node.appendChild(nodeText);
        listOfDevices.appendChild(node);

        // if this is the first device being discovered, auto-select it
        if (needsAutoSelect) {
          needsAutoSelect = false;
          listOfDevices.selectedIndex = 0;
          OnSelectionChange();
        }
      }

      myLineChart.update();
    } catch (err) {
      console.error(err);
    }
  };
});

