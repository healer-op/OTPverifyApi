const Database = require("better-sqlite3");
const db = new Database("database/otp.db");
const {
    DateTime
} = require('luxon');

db.prepare(
    "CREATE TABLE IF NOT EXISTS otp (id INTEGER PRIMARY KEY, otp INTEGER,timestamp TEXT)",
).run();

const express = require('express')
const cors = require('cors')
const app = express()
const port = 3003
let minutes = 5

app.use(cors());



app.get("/", async function (req, res) {
    res.send("hi");
});

app.get("/api/db", async function (req, res) {
    res.send(`${JSON.stringify(db.prepare('SELECT * FROM otp').all())}`);
});


app.get("/api/genOTP", async function (req, res) {
    let otp = Math.floor(Math.random() * 999999) + 100000;
    let stmt = db.prepare("INSERT INTO otp (otp,timestamp) VALUES (?, ?)");
    stmt.run(`${otp}`, `${DateTime.local()}`);
    res.json({"otp":otp,"timestamp":DateTime.local(),"message":`will expire in ${minutes} mintues`})
    console.log(`[📅] GENERATED OTP ${otp} AT ${DateTime.local()}`)
});

app.get("/api/verify/:otp", async function (req, res) {
    let otp = req.params.otp;
    let stmt = db.prepare("SELECT EXISTS (SELECT 1 FROM otp WHERE otp = ?) AS KEY");
    let result = stmt.get(otp);
    if(result.KEY==0){
        res.json({"response":false,"message":"invalid OTP"});
    }else{
        let stmt = db.prepare("DELETE FROM otp WHERE otp =?");
        stmt.run(otp);
        res.json({"response":true,"message":"verified successfully"});
        console.log(`[✅] OTP ${otp} VERIFIED`)
        console.log(`[🗑️] DELETED OTP ${otp} FROM DATABSE`)
    }
});

setInterval(() => {
    function getDayMinuteDiff(timestamp) {
        // Get current date and time in UTC
        const timestampS = DateTime.fromISO(timestamp);

        // Convert timestamp to DateTime object
        const now = DateTime.local();

        // Calculate difference in days and minutes
        const daysDifference = Math.floor(now.diff(timestampS, "days").days);
        const minutesDifference = Math.floor(now.diff(timestampS, "minutes").minutes);

        return {
            days: daysDifference,
            minutes: minutesDifference
        };
    }

    // Example usage:
    const sql = "SELECT * FROM otp";
    const rows = db.prepare(sql).all();
    // console.log(rows)

    for (const row of rows) {
        const timestamp = row.timestamp;
        const diff = getDayMinuteDiff(timestamp);

        // console.log(`Difference for timestamp ${timestamp}:`);
        // console.log(`  Days: ${diff.days}`); 
        if (diff.minutes > minutes) {
            let id=row.id;
            let stmt = db.prepare("DELETE FROM otp WHERE id =?");
            stmt.run(id);
            console.log(`[🗑️] DELETED OTP ${row.otp} FROM DATABSE`)
        }
        // console.log(`  Minutes: ${diff.minutes}`);
    }
}, 1000); // Runs this every 10 seconds.

app.listen(port, (err) => {
    if (err) {
        console.log("❌Server crashed❌");
        console.log("--------------------");
        console.log(err)
    } else {
        console.log(`✅Server started successfully✅`);
        console.log(`http://localhost:${port}`);
    }
})