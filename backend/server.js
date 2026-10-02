const express = require("express");
const cors = require("cors");
const XLSX = require("xlsx");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());


// Excel file path
const filePath = path.join(__dirname, "students.xlsx");


// Read Excel workbook
function readWorkbook() {
    return XLSX.readFile(filePath);
}


// Read student records
function getStudents(workbook) {

    const sheet = workbook.Sheets["Students"];

    if (!sheet) {
        throw new Error("Students sheet not found in students.xlsx");
    }

    return XLSX.utils.sheet_to_json(sheet, {
        defval: ""
    });
}


// Convert values to strings
function normalize(value) {
    return String(value ?? "").trim();
}


// ==========================================
// API: FIND STUDENT
// ==========================================

app.get("/api/student/:id", (req, res) => {

    try {

        const workbook = readWorkbook();

        const students = getStudents(workbook);

        const searchedId =
            normalize(req.params.id);

        const student =
            students.find((item) =>
                normalize(item.studentId) === searchedId ||
                normalize(item.barcodeId) === searchedId
            );


        if (!student) {

            return res.status(404).json({
                message: "Student not found"
            });

        }


        res.json(student);


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Unable to read student data"
        });

    }

});


// ==========================================
// API: RECORD ATTENDANCE
// ==========================================

app.post("/api/attendance", (req, res) => {

    try {

        const { studentId } = req.body;


        if (!studentId) {

            return res.status(400).json({
                message: "Student ID is required"
            });

        }


        const workbook = readWorkbook();

        const students = getStudents(workbook);


        const student =
            students.find(
                (item) =>
                    normalize(item.studentId) ===
                    normalize(studentId)
            );


        if (!student) {

            return res.status(404).json({
                message: "Student not found"
            });

        }


        const attendanceSheet =
            workbook.Sheets["Attendance"];


        if (!attendanceSheet) {

            return res.status(500).json({
                message: "Attendance sheet not found"
            });

        }


        const attendance =
            XLSX.utils.sheet_to_json(
                attendanceSheet,
                { defval: "" }
            );


        const now = new Date();


        const date =
            `${now.getFullYear()}-${String(
                now.getMonth() + 1
            ).padStart(2, "0")}-${String(
                now.getDate()
            ).padStart(2, "0")}`;


        const time =
            now.toLocaleTimeString("en-IN");


        // Check duplicate attendance
        const alreadyMarked =
            attendance.some(
                (record) =>
                    normalize(record.studentId) ===
                        normalize(studentId) &&
                    normalize(record.date) === date
            );


        if (alreadyMarked) {

            return res.status(409).json({
                message:
                    "Attendance already marked for today"
            });

        }


        // Add attendance
        attendance.push({

            attendanceId:
                attendance.length + 1,

            studentId:
                student.studentId,

            date:
                date,

            time:
                time,

            status:
                "Present"

        });


        workbook.Sheets["Attendance"] =
            XLSX.utils.json_to_sheet(
                attendance,
                {
                    header: [
                        "attendanceId",
                        "studentId",
                        "date",
                        "time",
                        "status"
                    ]
                }
            );


        XLSX.writeFile(
            workbook,
            filePath
        );


        res.json({

            message:
                "Attendance marked successfully",

            studentId:
                student.studentId,

            date:
                date,

            time:
                time,

            status:
                "Present"

        });


    } catch (error) {

        console.error(error);

        res.status(500).json({
            message:
                "Unable to save attendance"
        });

    }

});


// ==========================================
// API: ATTENDANCE SUMMARY
// ==========================================

app.get("/api/attendance/summary", (req, res) => {

    try {

        const workbook = readWorkbook();

        const students = getStudents(workbook);


        const attendanceSheet =
            workbook.Sheets["Attendance"];


        if (!attendanceSheet) {

            return res.status(500).json({
                message:
                    "Attendance sheet not found"
            });

        }


        const attendance =
            XLSX.utils.sheet_to_json(
                attendanceSheet,
                { defval: "" }
            );


        const now = new Date();


        const today =
            `${now.getFullYear()}-${String(
                now.getMonth() + 1
            ).padStart(2, "0")}-${String(
                now.getDate()
            ).padStart(2, "0")}`;


        const todayAttendance =
            attendance.filter(
                record =>
                    normalize(record.date) === today
            );


        const totalStudents =
            students.length;


        const presentStudents =
            todayAttendance.length;


        const absentStudents =
            Math.max(
                totalStudents -
                presentStudents,
                0
            );


        const attendancePercentage =
            totalStudents > 0
                ? (
                    presentStudents /
                    totalStudents *
                    100
                ).toFixed(1)
                : "0.0";


        res.json({

            date:
                today,

            totalStudents:
                totalStudents,

            presentStudents:
                presentStudents,

            absentStudents:
                absentStudents,

            attendancePercentage:
                attendancePercentage

        });


    } catch (error) {

        console.error(error);

        res.status(500).json({

            message:
                "Unable to get attendance summary"

        });

    }

});


// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {

    console.log(
        `Backend server running at http://localhost:${PORT}`
    );

});