// ==========================================


function startBarcodeScanner() {

    console.log("Barcode Scanner Started");

    Quagga.init({

        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector("#scanner"),

            constraints: {
                width: 640,
                height: 480,
                facingMode: "environment"
            }
        },

        decoder: {
            readers: [
                "code_128_reader",
                "code_39_reader",
                "ean_reader",
                "ean_8_reader",
                "upc_reader"
            ]
        },

        locate: true

    }, function (error) {

        if (error) {
            console.error("Scanner Error:", error);

            document.getElementById("scannerStatus").textContent =
                "❌ Scanner could not start.";

            return;
        }

        document.getElementById("scannerStatus").textContent =
            "📷 Scanner ready. Show the barcode to the camera.";

        Quagga.start();
    });


    Quagga.onDetected(function (result) {

        const detectedBarcode = result.codeResult.code;

        console.log("Barcode Detected:", detectedBarcode);

        identifyStudent(detectedBarcode);
    });
}


// ==========================================
// IDENTIFY STUDENT
// ==========================================

async function identifyStudent(barcode) {

    try {

        document.getElementById("scannerStatus").textContent =
            "🔍 Searching student...";


        const response = await fetch(
            "http://localhost:3000/api/student/" +
            encodeURIComponent(barcode)
        );


        if (!response.ok) {

            document.getElementById("studentInfo").innerHTML = `

                <h3>❌ Student Not Found</h3>

                <p>
                    No student record was found for:
                    <strong>${barcode}</strong>
                </p>

            `;

            document.getElementById("scannerStatus").textContent =
                "❌ Student not found.";

            return;
        }


        const student = await response.json();

        console.log("Student Found:", student);


        document.getElementById("studentInfo").innerHTML = `

            <h3>✅ Student Identified</h3>

            <p>
                <strong>Student ID:</strong>
                ${student.studentId}
            </p>

            <p>
                <strong>Name:</strong>
                ${student.name}
            </p>

            <p>
                <strong>Roll Number:</strong>
                ${student.rollNumber}
            </p>

            <p>
                <strong>Department:</strong>
                ${student.department}
            </p>

            <p>
                <strong>Class:</strong>
                ${student.className}
            </p>

            <p>
                <strong>Year:</strong>
                ${student.year}
            </p>

            <hr>

            <p id="attendanceStatus">
                ⏳ Checking attendance...
            </p>

        `;


        document.getElementById("scannerStatus").textContent =
            "✅ Student identified successfully.";


        markAttendance(student.studentId);


    } catch (error) {

        console.error("Connection Error:", error);

        document.getElementById("studentInfo").innerHTML = `

            <h3>❌ Connection Error</h3>

            <p>
                Cannot connect to the backend server.
            </p>

            <p>
                Please make sure the Node.js server is running.
            </p>

        `;

        document.getElementById("scannerStatus").textContent =
            "❌ Backend connection failed.";
    }
}


// ==========================================
// MANUAL STUDENT ID ENTRY
// ==========================================

function manualIdentifyStudent() {

    const barcode =
        document
            .getElementById("manualBarcode")
            .value
            .trim();


    if (barcode === "") {

        alert("Please enter a Student ID.");

        return;
    }


    identifyStudent(barcode);
}


// ==========================================
// MARK ATTENDANCE
// ==========================================

async function markAttendance(studentId) {

    try {

        const response = await fetch(
            "http://localhost:3000/api/attendance",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    studentId: studentId
                })
            }
        );


        const result = await response.json();

        console.log("Attendance:", result);


        const attendanceStatus =
            document.getElementById("attendanceStatus");


        if (response.ok) {

            attendanceStatus.innerHTML = `

                <span class="status-present">
                    ✅ Present
                </span>

                <br><br>

                <strong>Date:</strong>
                ${result.date}

                <br>

                <strong>Time:</strong>
                ${result.time}

            `;

        }


        else if (response.status === 409) {

            attendanceStatus.innerHTML = `

                <span class="status-warning">
                    ⚠️ Attendance Already Marked Today
                </span>

            `;

        }


        else {

            attendanceStatus.innerHTML = `

                <span class="status-warning">
                    ❌ ${result.message}
                </span>

            `;

        }


    } catch (error) {

        console.error("Attendance Error:", error);


        const attendanceStatus =
            document.getElementById("attendanceStatus");


        if (attendanceStatus) {

            attendanceStatus.innerHTML = `

                <span class="status-warning">
                    ❌ Failed to save attendance
                </span>

            `;
        }
    }
}