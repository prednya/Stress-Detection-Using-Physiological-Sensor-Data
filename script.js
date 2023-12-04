// scripts.js

let globalSId = null;
let globalPredictions = [];
let accChartInstance = null;
let edaChartInstance = null;
let tempChartInstance = null;
let predictionChartInstance = null;

const checkbox = document.getElementById('checkbox');
  if (checkbox) {
    checkbox.addEventListener('change', function(event) {
      console.log("Checkbox toggled");
      if (event.target.checked) {
          document.body.classList.add('dark-mode');
      } else {
          document.body.classList.remove('dark-mode');
      }
    });
  } else {
    console.error('Checkbox element not found!');
  }

function destroyChartInstances() {
  if (accChartInstance) {
    accChartInstance.destroy();
    accChartInstance = null;
  }
  if (edaChartInstance) {
    edaChartInstance.destroy();
    edaChartInstance = null;
  }
  if (tempChartInstance) {
    tempChartInstance.destroy();
    tempChartInstance = null;
  }
  if (predictionChartInstance) {
    predictionChartInstance.destroy();
    predictionChartInstance = null;
  }
}
function setMaxPredictionSummary(predictionCounts) {
  const summaryElement = document.getElementById('maxPredictionSummary');
  const mostFrequentPrediction = Object.keys(predictionCounts).reduce((a, b) => predictionCounts[a] > predictionCounts[b] ? a : b);
  const predictionText = ['No Stress', 'Stress', 'Amusement'];
  const colors = ['#4caf50', '#f44336', '#2196f3']; // Green for No Stress, Red for Stress, Blue for Amusement

  summaryElement.style.backgroundColor = colors[parseInt(mostFrequentPrediction)];
  summaryElement.textContent = `Max Prediction: ${predictionText[parseInt(mostFrequentPrediction)]}`;
} 

function submitFeedback() {
  const userFeedback = document.getElementById('userFeedback').value;
  const deviceId = document.getElementById('device_id').value;
  const feedbackMessageElement = document.getElementById('feedbackMessage'); // Assuming you have an element with this ID to show messages

  // Use global variables
  const sessionId = globalSId;
  // console.log(sessionId);
  const actualPredictions = globalPredictions;

  // URL encode the actual predictions array
  const actualEncoded = encodeURIComponent(JSON.stringify(actualPredictions));

  // Construct the URL with query parameters
  const url = `https://fay665rrj7.execute-api.ap-south-1.amazonaws.com/stressdet_feedapi?d_id=${deviceId}&s_id=${sessionId}&feedback=${userFeedback}&actual=${actualEncoded}`;

  // Make the GET request to the API
  if (sessionId==null){
    feedbackMessageElement.textContent = 'First get data';
    feedbackMessageElement.style.color = 'red'; // Or use a class to style this message
  }
  else{
  fetch(url)
    .then(response => {
      if (!response.ok) {
        // If response is not ok, throw an error
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      console.log('Feedback response:', data);
      feedbackMessageElement.textContent = `Feedback submitted successfully! for s_id : ${sessionId}`;
      feedbackMessageElement.style.color = 'green'; // Or use a class to style this message
    })
    .catch(error => {
      console.error('Error submitting feedback:', error);
      feedbackMessageElement.textContent = 'Error submitting feedback. Please try again.';
      feedbackMessageElement.style.color = 'red'; // Or use a class to style this message
    });
  }
}

// function clearCanvas(canvaID){
//   const canvas = document.getElementById(canvaID);
//   const context = canvas.getContext('2d');
//   context.clearRect(0, 0, canvas.width, canvas.height);
// }
function fetchData() {
  destroyChartInstances();
  // clearCanvas("accChart");
  // clearCanvas('edaChart');
  // clearCanvas('tempChart');
  // clearCanvas('predictionChart');
  const feedbackMessageElement = document.getElementById('feedbackMessage'); // Assuming you have an element with this ID to show messages
  feedbackMessageElement.textContent='';
  document.getElementById('loader').style.display = 'block';
  const deviceId = document.getElementById('device_id').value;
  console.log("DeviceID", deviceId);
  const url = `https://9dtxhex4d1.execute-api.ap-south-1.amazonaws.com/stressdet_predict?d_id=${deviceId}`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      const chartcanva = document.getElementById("chartcanvas");
      chartcanva.className = "chart-container";
      const errordiv = document.getElementById("noDataError")
      errordiv.className = "info-card hidden"
      document.getElementById('loader').style.display = 'none';
      let datetime = data.timestamp.replace("T"," ")
      let parts = datetime.split(" ");
      parts[0] = parts[0].replace(/:/g, "-");
      let formattedDatetime = parts.join(" ");
      document.getElementById('timestamp').textContent = formattedDatetime;
      document.getElementById('device_d_id').textContent = data.d_id;
      globalPredictions = data.Predictions;
      globalSId = data.s_id;

      const accData = {
        labels: data.acc_x.map((_, index) => index + 1),
        datasets: [
          {
            label: 'acc_x',
            data: data.acc_x,
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
          },
          {
            label: 'acc_y',
            data: data.acc_y,
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
          },
          {
            label: 'acc_z',
            data: data.acc_z,
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
          }
        ]
      };

      const edaData = {
        labels: data.acc_x.map((_, index) => index + 1),
        datasets: [
          {
            label: 'eda',
            data: data.eda,
            borderColor: 'rgb(255, 206, 86)',
            backgroundColor: 'rgba(255, 206, 86, 0.5)',
          }
        ]
      };

      const tempData = {
        labels: data.acc_x.map((_, index) => index + 1),
        datasets: [
          {
            label: 'temp',
            data: data.temp,
            borderColor: 'rgb(153, 102, 255)',
            backgroundColor: 'rgba(153, 102, 255, 0.5)',
          }
        ]
      };

      accChartInstance = new Chart(document.getElementById('accChart'), {
        type: 'line',
        data: accData,
        options: {
          scales: {
            y: {
              beginAtZero: false
            }
          }
        }
      });

      edaChartInstance = new Chart(document.getElementById('edaChart'), {
        type: 'line',
        data: edaData,
        options: {
          scales: {
            y: {
              beginAtZero: false
            }
          }
        }
      });

      tempChartInstance = new Chart(document.getElementById('tempChart'), {
        type: 'line',
        data: tempData,
        options: {
          scales: {
            y: {
              beginAtZero: false
            }
          }
        }
      });

      const predictionCounts = data.Predictions.reduce((acc, prediction) => {
        acc[prediction] = (acc[prediction] || 0) + 1;
        return acc;
      }, {});

      setMaxPredictionSummary(predictionCounts);

      const predictionData = {
        labels: Object.keys(predictionCounts),
        datasets: [{
          label: 'Prediction Counts',
          data: Object.values(predictionCounts),
          backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)'
          ],
          borderColor: [
            'rgba(255,99,132,1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)'
          ],
          borderWidth: 1
        }]
      };

      predictionChartInstance = new Chart(document.getElementById('predictionChart'), {
        type: 'bar',
        data: predictionData,
        options: {
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    })
    .catch(error => {
      // console.log("hello")
      document.getElementById('loader').style.display = 'none';
      const errordiv = document.getElementById("noDataError");
      errordiv.className = "info-card";
      const chartcanva = document.getElementById("chartcanvas");
      chartcanva.className = "chart-container hidden";
      console.error('Error fetching data: ', error);
    });
}


// Initial call to fetch data when the script loads
// fetchData();