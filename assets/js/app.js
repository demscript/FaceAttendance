const video = document.getElementById('video');
const video2 = document.getElementById('video2');

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 720, height: 560 }
    });
    video.srcObject = stream;
    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}
async function setupCamera2() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 720, height: 560 }
    });
    video2.srcObject = stream;
    return new Promise((resolve) => {
        video2.onloadedmetadata = () => {
            resolve(video2);
        };
    });
}

async function loadModels() {
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    ]);
    console.log("Models Loaded");
}

async function start() {
    await setupCamera();
    setupCamera2();
    await loadModels();
    console.log("Camera and models are ready.");
}

start();

const registerButton = document.getElementById('register');
const nameInput = document.getElementById('name');

registerButton.addEventListener('click', async () => {
    const name = nameInput.value;
    if (!name) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Please enter a name'
        });
        return;
    }

    const faceDescriptor = await detectFace();
    if (faceDescriptor) {
        const registeredFaces = JSON.parse(localStorage.getItem('registeredFaces')) || [];
        registeredFaces.push({ name: name, descriptor: Array.from(faceDescriptor) });
        localStorage.setItem('registeredFaces', JSON.stringify(registeredFaces));
        Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Face registered successfully!'
        });
    }
});

async function detectFace() {
    const options = new faceapi.TinyFaceDetectorOptions();
    const detections = await faceapi.detectSingleFace(video, options).withFaceLandmarks().withFaceDescriptor();

    if (detections) {
        return detections.descriptor;
    }
    Swal.fire({
        icon: 'error',
        title: 'No Face Detected',
        text: 'Please try again'
    });
    return null;
}

async function detectAttendanceFace() {
    const options = new faceapi.TinyFaceDetectorOptions();
    const detections = await faceapi.detectSingleFace(video2, options).withFaceLandmarks().withFaceDescriptor();

    if (detections) {
        return detections.descriptor;
    }
    Swal.fire({
        icon: 'error',
        title: 'No Face Detected',
        text: 'Please try again'
    });
    return null;
}

const recognizeButton = document.getElementById('recognize');

recognizeButton.addEventListener('click', async () => {
    const faceDescriptor = await detectAttendanceFace();
    if (faceDescriptor) {
        const registeredFaces = JSON.parse(localStorage.getItem('registeredFaces')) || [];
        const labeledDescriptors = registeredFaces.map(f => new faceapi.LabeledFaceDescriptors(f.name, [new Float32Array(f.descriptor)]));
        const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors);

        const bestMatch = faceMatcher.findBestMatch(faceDescriptor);
        if (bestMatch.label !== 'unknown') {
            markAttendance(bestMatch.label);
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: `Face recognized! Attendance marked for ${bestMatch.label}.`
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Not Recognized',
                text: 'Face not recognized.'
            });
        }
    }
});

function markAttendance(name) {
    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
   
    // Format date part
    const date = new Date().toLocaleDateString('en-IN');
    // Format time part
    const time = new Date().toLocaleTimeString('en-IN');
    attendanceRecords.push({ name: name, date: date ,time: time });
    localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
}

const exportButton = document.getElementById('export');

exportButton.addEventListener('click', () => {
    const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
    const csvContent = "data:text/csv;charset=utf-8,"
        + ["Name,Date,Time"].concat(attendanceRecords.map(record => `${record.name},${record.date},${record.time}`)).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendance.csv");
    document.body.appendChild(link);
    link.click();
});
